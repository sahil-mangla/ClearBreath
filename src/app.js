import http from 'node:http';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { CITIES, isCity, listCities } from './cities.js';
import { computeAqi, HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS } from './aqi.js';
import { bestWindow, createAirClient } from './airdata.js';
import { buildPlan, estimateExposure, fallbackBriefing, topActions, PM25_GUIDELINES } from './rules.js';
import { applyTexts, builtinTexts, collectTexts, publicText } from './hi.js';
import { createLlm } from './llm.js';
import { translateTexts } from './translate.js';
import { fieldsOf } from './validate.js';
import { createRateLimiter } from './ratelimit.js';
import { validateAskInput, validatePlanInput } from './validate.js';

const MAX_BODY_BYTES = 8 * 1024;
const DISCLAIMER = 'General guidance, not medical advice. Impact figures are approximate estimates.';
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// route -> [file under public/, content type]. Only these routes are ever served (no path traversal).
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/tokens.css': ['tokens.css', 'text/css; charset=utf-8'],
  '/base.css': ['base.css', 'text/css; charset=utf-8'],
  '/fonts/gloock-latin-400-normal.woff2': ['fonts/gloock-latin-400-normal.woff2', 'font/woff2'],
  '/fonts/hanken-grotesk-latin-wght-normal.woff2': ['fonts/hanken-grotesk-latin-wght-normal.woff2', 'font/woff2'],
  '/fonts/hanken-grotesk-latin-ext-wght-normal.woff2': ['fonts/hanken-grotesk-latin-ext-wght-normal.woff2', 'font/woff2'],
};

export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function loadStatic(dir) {
  const files = new Map();
  for (const [route, [file, type]] of Object.entries(STATIC_FILES)) {
    const raw = fs.readFileSync(path.join(dir, file));
    // woff2 is already compressed; gzip everything else once at start-up.
    const etag = `"${createHash('sha256').update(raw).digest('hex').slice(0, 20)}"`;
    files.set(route, { type, raw, etag, gzip: type === 'font/woff2' ? null : zlib.gzipSync(raw, { level: 9 }) });
  }
  return files;
}

function readJson(req, res) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
      reject(new HttpError(415, 'Content-Type must be application/json.', { code: 'bad_type' }));
      return;
    }
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      reject(new HttpError(413, 'Request body too large.', { code: 'too_large' }));
      return;
    }
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // Chunked uploads have no Content-Length: stop buffering, answer 413,
        // then drop the connection once the response has been flushed.
        tooLarge = true;
        chunks.length = 0;
        res.once('finish', () => req.destroy());
        reject(new HttpError(413, 'Request body too large.', { code: 'too_large' }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON.', { code: 'bad_json' }));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'Could not read request body.', { code: 'body_read' })));
  });
}

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

/**
 * Build the HTTP server (not yet listening). Dependencies are injectable for testing.
 * Pass `publicDir: null` to serve the API only (static hosting handled elsewhere, e.g. a CDN).
 */
export function createApp({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  publicDir = PUBLIC_DIR,
} = {}) {
  const statics = publicDir ? loadStatic(publicDir) : new Map();
  const air = createAirClient({ fetchImpl });
  const llm = createLlm({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || undefined,
    maxCallsPerMin: Number(env.GEMINI_MAX_CALLS_PER_MIN) || undefined,
    fetchImpl,
  });
  const limiter = createRateLimiter({ limit: Number(env.RATE_LIMIT_PER_MIN) || 20, windowMs: 60_000 });
  const trustProxy = env.TRUST_PROXY === '1';

  // One IPv6 subscriber usually owns a whole /64, so key on the /64 or a single host could mint endless keys.
  const rateKey = (ip) => {
    if (!ip.includes(':') || ip.includes('.')) return ip; // IPv4 and IPv4-mapped addresses stay as they are
    const [head, tail = ''] = ip.split('::');
    const groups = [...(head ? head.split(':') : []), ...Array(Math.max(0, 8 - (head ? head.split(':').length : 0) - (tail ? tail.split(':').length : 0))).fill('0'), ...(tail ? tail.split(':') : [])];
    return `${groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':')}::/64`;
  };

  const clientIp = (req) => {
    let ip = req.socket.remoteAddress ?? 'unknown';
    if (trustProxy) {
      const xff = String(req.headers['x-forwarded-for'] ?? '').split(',').pop().trim();
      if (xff) ip = xff;
    }
    return rateKey(ip);
  };

  async function getAirForCity(cityKey, manualPm25) {
    if (manualPm25 !== null && manualPm25 !== undefined) {
      return { pm25: manualPm25, pm10: null, time: null, hourly: [], source: 'Entered by you' };
    }
    try {
      return await air.get(cityKey);
    } catch (err) {
      console.error(`[air] upstream failure: ${err?.message}`);
      throw new HttpError(502, 'Live air-quality data is unavailable right now. You can enter a PM2.5 reading manually and try again.', { code: 'air_unavailable' });
    }
  }

  async function handlePlan(req, res) {
    const parsed = validatePlanInput(await readJson(req, res));
    if (!parsed.ok) throw new HttpError(400, 'Please fix the highlighted inputs.', { code: 'bad_input', details: parsed.errors, fields: fieldsOf(parsed.errors) });
    const profile = parsed.value;
    const city = CITIES[profile.city];
    const cityName = profile.lang === 'hi' ? city.nameHi : city.name; // the name as written in the reply language

    const data = await getAirForCity(profile.city, profile.manualPm25);
    const aqi = computeAqi({ pm25: data.pm25, pm10: data.pm10 });
    if (!aqi) throw new HttpError(502, 'Could not compute an air-quality index from the data received.', { code: 'aqi_failed' });

    const window = data.time ? bestWindow(data.hourly, data.time) : null;
    const when = now();
    const plan = buildPlan({ levelIndex: aqi.levelIndex, pm25: data.pm25, profile, cityKey: profile.city, window, now: when });
    const exposure = estimateExposure({ pm25: data.pm25, profile, window, levelIndex: aqi.levelIndex });

    const all = [...plan.routine, ...plan.indoor, ...plan.alternatives];
    const facts = {
      city: cityName,
      lang: profile.lang,
      aqi: { value: aqi.value, category: LEVELS[aqi.levelIndex], dominantPollutant: aqi.dominant, pm25: Math.round(data.pm25) },
      household: {
        adults: profile.adults, children: profile.children, seniors: profile.seniors,
        conditions: profile.conditions, commute: profile.commute, cooking: profile.cooking, heating: profile.heating,
      },
      exposure: { todayAsUsual: exposure.baseline, withPlan: exposure.plan, reductionPct: exposure.reductionPct, whoGuideline: exposure.whoGuideline, indiaStandard: exposure.indiaStandard },
      cleanestOutdoorHour: window ? { hour24: window.bestHour, pm25: window.bestPm25, day: window.bestDay } : null,
      co2SavedKgPerWeek: plan.totals.co2SavedKgPerWeek,
      candidateActions: all.map((a) => ({ id: a.id, title: a.title })),
    };

    // Briefing and (for Hindi) the plan translation run side by side; each has a deterministic fallback.
    const english = collectTexts(plan, exposure, DISCLAIMER);
    const [generated, translated] = await Promise.all([
      llm.briefing({ facts, untrusted: { notes: profile.notes }, allowedIds: all.map((a) => a.id) }),
      profile.lang === 'hi' ? translateTexts(llm, english, builtinTexts(plan, exposure)) : null,
    ]);
    const briefing = generated ?? fallbackBriefing({ cityName, aqi, pm25: data.pm25, plan, exposure, lang: profile.lang });
    if (briefing.topActionIds.length === 0) briefing.topActionIds = topActions(plan).map((a) => a.id);

    // The page text: Hindi from Gemini or the built-in catalogue, otherwise English. Internal fields are dropped.
    const view = translated ? applyTexts(plan, exposure, translated.texts) : publicText(plan, exposure, DISCLAIMER);

    return {
      city: { key: profile.city, name: city.name, state: city.state, nameHi: city.nameHi, stateHi: city.stateHi },
      air: {
        aqi: aqi.value, category: aqi.category, levelIndex: aqi.levelIndex, dominant: aqi.dominant,
        pm25: Math.round(data.pm25), pm10: data.pm10 === null ? null : Math.round(data.pm10),
        healthImpact: (profile.lang === 'hi' ? HEALTH_IMPACT_HI : HEALTH_IMPACT)[aqi.levelIndex], source: data.source, observedAt: data.time,
        note: 'Modelled estimate using India CPCB AQI bands; may differ from nearby CPCB station readings.',
      },
      window,
      exposure: view.exposure,
      plan: view.plan,
      briefing: { ...briefing, lang: briefing.lang ?? profile.lang }, // the language the text is really in
      textLang: translated ? 'hi' : 'en', // the language of the plan, alerts, assumptions and disclaimer
      translation: translated ? translated.source : null, // 'gemini' | 'builtin' | 'mixed' when textLang is hi
      generatedAt: when.toISOString(),
      disclaimer: view.disclaimer,
    };
  }

  /** Lightweight live reading for the hero: current AQI only (cached upstream, 10 min). */
  async function handleAir(url) {
    const cityKey = url.searchParams.get('city') ?? '';
    if (!isCity(cityKey)) throw new HttpError(400, 'Please choose a supported city.', { code: 'bad_city' });
    const data = await getAirForCity(cityKey, null);
    const aqi = computeAqi({ pm25: data.pm25, pm10: data.pm10 });
    if (!aqi) throw new HttpError(502, 'Could not compute an air-quality index from the data received.', { code: 'aqi_failed' });
    return {
      city: { key: cityKey, name: CITIES[cityKey].name, nameHi: CITIES[cityKey].nameHi },
      air: {
        aqi: aqi.value, category: aqi.category, levelIndex: aqi.levelIndex, dominant: aqi.dominant,
        pm25: Math.round(data.pm25), observedAt: data.time, source: data.source,
      },
    };
  }

  async function handleAsk(req, res) {
    const parsed = validateAskInput(await readJson(req, res));
    if (!parsed.ok) throw new HttpError(400, 'Please fix the highlighted inputs.', { code: 'bad_input', details: parsed.errors, fields: fieldsOf(parsed.errors) });
    if (!llm.enabled) throw new HttpError(503, 'The AI assistant is not configured on this server. The personalised plan above still works.', { code: 'ask_off' });

    const { city: cityKey, question, lang } = parsed.value;
    const city = CITIES[cityKey];
    let aqiFacts = null;
    try {
      const data = await air.get(cityKey);
      const aqi = computeAqi(data);
      if (aqi) aqiFacts = { value: aqi.value, category: aqi.category, pm25: Math.round(data.pm25) };
    } catch {
      /* answer without live context */
    }
    const answer = await llm.answer({ facts: { city: city.name, lang, aqi: aqiFacts, guidelines: PM25_GUIDELINES }, untrusted: { question } });
    if (!answer) throw new HttpError(502, 'The AI assistant could not answer right now. Please try again.', { code: 'ask_failed' });
    return { answer, lang };
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = url.pathname;

      if (req.method === 'GET' && statics.has(route)) {
        const f = statics.get(route);
        const gz = f.gzip !== null && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
        const immutable = f.type === 'font/woff2';
        // Pages, script and styles are revalidated with an ETag: an unchanged file costs a 304, never a re-download.
        const etag = immutable ? null : gz ? f.etag.replace(/"$/, '-gzip"') : f.etag;
        if (etag && req.headers['if-none-match'] === etag) {
          res.writeHead(304, { ...SECURITY_HEADERS, 'Cache-Control': 'no-cache', ETag: etag, Vary: 'Accept-Encoding' });
          res.end();
          return;
        }
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          'Content-Type': f.type,
          'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
          ...(etag ? { ETag: etag } : {}),
          Vary: 'Accept-Encoding',
          ...(gz ? { 'Content-Encoding': 'gzip' } : {}),
        });
        res.end(gz ? f.gzip : f.raw);
        return;
      }
      if (route === '/favicon.ico') {
        res.writeHead(204, SECURITY_HEADERS);
        res.end();
        return;
      }
      if (route === '/healthz') {
        sendJson(res, 200, { status: 'ok', llm: llm.enabled });
        return;
      }

      if (route.startsWith('/api/')) {
        const rl = limiter.check(clientIp(req));
        if (!rl.allowed) {
          throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', { code: 'rate_limited', headers: { 'Retry-After': String(rl.retryAfterSec) } });
        }
        if (route === '/api/cities') {
          if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.', { code: 'bad_method', headers: { Allow: 'GET' } });
          sendJson(res, 200, { cities: listCities() }, { 'Cache-Control': 'public, max-age=3600' });
          return;
        }
        if (route === '/api/air') {
          if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.', { code: 'bad_method', headers: { Allow: 'GET' } });
          sendJson(res, 200, await handleAir(url), { 'Cache-Control': 'public, max-age=120' });
          return;
        }
        if (route === '/api/plan' || route === '/api/ask') {
          if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.', { code: 'bad_method', headers: { Allow: 'POST' } });
          sendJson(res, 200, route === '/api/plan' ? await handlePlan(req, res) : await handleAsk(req, res));
          return;
        }
      }
      throw new HttpError(404, 'Not found.', { code: 'not_found' });
    } catch (err) {
      if (err instanceof HttpError) {
        const { headers, ...rest } = err.extra ?? {};
        sendJson(res, err.status, { error: err.message, ...rest }, headers);
        return;
      }
      console.error(`[server] unexpected error: ${err?.message}`);
      if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong on our side. Please try again.', code: 'server' });
    }
  });

  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  return server;
}

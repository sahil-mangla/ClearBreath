import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAirClient } from './airdata.js';
import { listCities } from './cities.js';
import { createHandlers } from './handlers.js';
import { clientIp, HttpError, SECURITY_HEADERS, sendJson } from './http.js';
import { createLlm } from './llm.js';
import { createRateLimiter } from './ratelimit.js';
import { loadStatic, serveStatic } from './static.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const methodNotAllowed = (allow) =>
  new HttpError(405, 'Method not allowed.', { code: 'bad_method', headers: { Allow: allow } });

/**
 * Build the HTTP server (not yet listening). Dependencies are injectable for testing.
 * Pass `publicDir: null` to serve the API only (static hosting handled elsewhere, e.g. a CDN).
 * @param {{env?:Record<string,string|undefined>, fetchImpl?:typeof fetch, now?:() => Date, publicDir?:string|null}} [options]
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
  const handlers = createHandlers({ air, llm, now });

  /** Rate-limited JSON API. Throws HttpError for anything that is not a valid call. */
  async function routeApi(req, res, url) {
    const limit = limiter.check(clientIp(req, trustProxy));
    if (!limit.allowed) {
      throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', {
        code: 'rate_limited',
        headers: { 'Retry-After': String(limit.retryAfterSec) },
      });
    }
    switch (url.pathname) {
      case '/api/cities':
        if (req.method !== 'GET') throw methodNotAllowed('GET');
        return sendJson(res, 200, { cities: listCities() }, { 'Cache-Control': 'public, max-age=3600' });
      case '/api/air':
        if (req.method !== 'GET') throw methodNotAllowed('GET');
        return sendJson(res, 200, await handlers.airNow(url), { 'Cache-Control': 'public, max-age=120' });
      case '/api/plan':
        if (req.method !== 'POST') throw methodNotAllowed('POST');
        return sendJson(res, 200, await handlers.plan(req, res));
      case '/api/ask':
        if (req.method !== 'POST') throw methodNotAllowed('POST');
        return sendJson(res, 200, await handlers.ask(req, res));
      default:
        throw new HttpError(404, 'Not found.', { code: 'not_found' });
    }
  }

  async function route(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const { pathname } = url;

    if (req.method === 'GET' && statics.has(pathname)) return serveStatic(statics.get(pathname), req, res);
    if (pathname === '/favicon.ico') {
      res.writeHead(204, SECURITY_HEADERS);
      return res.end();
    }
    if (pathname === '/healthz') return sendJson(res, 200, { status: 'ok', llm: llm.enabled });
    if (pathname.startsWith('/api/')) return routeApi(req, res, url);
    throw new HttpError(404, 'Not found.', { code: 'not_found' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        const { headers, ...rest } = err.extra ?? {};
        sendJson(res, err.status, { error: err.message, ...rest }, headers);
        return;
      }
      console.error(`[server] unexpected error: ${err?.message}`);
      if (!res.headersSent)
        sendJson(res, 500, { error: 'Something went wrong on our side. Please try again.', code: 'server' });
    }
  });

  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  return server;
}

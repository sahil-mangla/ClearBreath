import { CITIES } from './cities.js';

const BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const SOURCE = 'Open-Meteo (CAMS atmospheric model)';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/**
 * Pick the cleanest and dirtiest daytime hours (06:00-20:00 local) in the next 24 hours.
 * @param {{time:string, pm25:number}[]} hourly  local-time strings like "2026-11-21T14:00"
 * @param {string} nowTime  local-time string of the current observation
 */
export function bestWindow(hourly, nowTime) {
  if (!Array.isArray(hourly) || typeof nowTime !== 'string') return null;
  const nowHour = nowTime.slice(0, 13);
  const candidates = hourly
    .filter((h) => h.time.slice(0, 13) >= nowHour)
    .slice(0, 24)
    .filter((h) => {
      const hr = Number(h.time.slice(11, 13));
      return hr >= 6 && hr <= 20;
    });
  if (candidates.length < 3) return null;

  let best = candidates[0];
  let worst = candidates[0];
  for (const h of candidates) {
    if (h.pm25 < best.pm25) best = h;
    if (h.pm25 > worst.pm25) worst = h;
  }
  const dayOf = (t) => t.slice(0, 10);
  return {
    bestHour: Number(best.time.slice(11, 13)),
    bestPm25: Math.round(best.pm25),
    bestDay: dayOf(best.time) === dayOf(nowTime) ? 'today' : 'tomorrow',
    worstHour: Number(worst.time.slice(11, 13)),
    worstPm25: Math.round(worst.pm25),
    worstDay: dayOf(worst.time) === dayOf(nowTime) ? 'today' : 'tomorrow',
  };
}

/**
 * Air-quality client with per-city caching, in-flight de-duplication and a hard timeout.
 * When the upstream is down it serves the last good reading (up to `staleMs` old, labelled as such) and
 * remembers the failure for `failMs`, so an outage costs one slow request instead of one per visitor.
 */
export function createAirClient({
  fetchImpl = fetch,
  ttlMs = 10 * 60_000,
  staleMs = 60 * 60_000,
  failMs = 30_000,
  timeoutMs = 6000,
  now = Date.now,
} = {}) {
  const cache = new Map(); // cityKey -> {at, data}
  const failures = new Map(); // cityKey -> {at, error}
  const inflight = new Map(); // cityKey -> Promise

  async function load(cityKey) {
    const c = CITIES[cityKey];
    const url =
      `${BASE}?latitude=${c.lat}&longitude=${c.lon}` +
      '&current=pm2_5,pm10&hourly=pm2_5&forecast_days=2&timezone=Asia%2FKolkata';
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`air-quality upstream status ${res.status}`);
    const json = await res.json();

    const pm25 = num(json?.current?.pm2_5);
    const time = json?.current?.time;
    if (pm25 === null || typeof time !== 'string')
      throw new Error('air-quality upstream returned no current PM2.5');

    const times = json?.hourly?.time ?? [];
    const vals = json?.hourly?.pm2_5 ?? [];
    const hourly = [];
    for (let i = 0; i < times.length; i += 1) {
      const v = num(vals[i]);
      if (typeof times[i] === 'string' && v !== null) hourly.push({ time: times[i], pm25: v });
    }
    return { pm25, pm10: num(json.current.pm10), time, hourly, source: SOURCE };
  }

  return {
    /** @returns {Promise<{pm25:number, pm10:number|null, time:string, hourly:object[], source:string}>} */
    async get(cityKey) {
      const hit = cache.get(cityKey);
      if (hit && now() - hit.at < ttlMs) return hit.data;
      const stale = () =>
        hit && now() - hit.at < staleMs
          ? { ...hit.data, source: `${SOURCE}, last reading (live feed unavailable)` }
          : null;
      const failed = failures.get(cityKey);
      if (failed && now() - failed.at < failMs) {
        const fallback = stale();
        if (fallback) return fallback;
        throw failed.error;
      }
      if (inflight.has(cityKey)) return inflight.get(cityKey);
      const p = load(cityKey)
        .then((data) => {
          cache.set(cityKey, { at: now(), data });
          failures.delete(cityKey);
          return data;
        })
        .catch((error) => {
          failures.set(cityKey, { at: now(), error });
          const fallback = stale();
          if (fallback) return fallback;
          throw error;
        })
        .finally(() => inflight.delete(cityKey));
      inflight.set(cityKey, p);
      return p;
    },
  };
}

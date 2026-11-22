import { CITIES } from './cities.js';

const BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const SOURCE = 'Open-Meteo (CAMS atmospheric model)';

/** @typedef {import('./types.js').Reading} Reading */

/** @param {unknown} v @returns {number|null} the number, when it is a finite non-negative one */
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/**
 * Pick the cleanest and dirtiest daytime hours (06:00-20:00 local) in the next 24 hours.
 * @param {import('./types.js').HourlyReading[]} hourly
 * @param {string} nowTime  local-time string of the current observation
 * @returns {import('./types.js').ForecastWindow|null}
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
  /** @param {string} t */
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
 * The hourly series as [{time, pm25}], skipping hours without a usable value.
 * @param {{time?:unknown[], pm2_5?:unknown[]}|undefined} hourly
 * @returns {import('./types.js').HourlyReading[]}
 */
function parseHourly(hourly) {
  const times = hourly?.time ?? [];
  const values = hourly?.pm2_5 ?? [];
  return times.flatMap((time, i) => {
    const pm25 = num(values[i]);
    return typeof time === 'string' && pm25 !== null ? [{ time, pm25 }] : [];
  });
}

/**
 * Parse Open-Meteo's reply into a reading; throws when there is no current PM2.5.
 * @param {any} json Open-Meteo's reply
 * @returns {Reading}
 */
function parseReading(json) {
  const pm25 = num(json?.current?.pm2_5);
  const time = json?.current?.time;
  if (pm25 === null || typeof time !== 'string')
    throw new Error('air-quality upstream returned no current PM2.5');

  const hourly = parseHourly(json?.hourly);
  return { pm25, pm10: num(json.current.pm10), time, hourly, source: SOURCE };
}

/**
 * One upstream call for a city's current and hourly PM2.5.
 * @param {import('./cities.js').CityKey} cityKey
 * @param {{fetchImpl:typeof fetch, timeoutMs:number}} options
 * @returns {Promise<Reading>}
 */
async function fetchReading(cityKey, { fetchImpl, timeoutMs }) {
  const c = CITIES[cityKey];
  const url =
    `${BASE}?latitude=${c.lat}&longitude=${c.lon}` +
    '&current=pm2_5,pm10&hourly=pm2_5&forecast_days=2&timezone=Asia%2FKolkata';
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`air-quality upstream status ${res.status}`);
  return parseReading(await res.json());
}

/**
 * Air-quality client with per-city caching, in-flight de-duplication and a hard timeout.
 * When the upstream is down it serves the last good reading (up to `staleMs` old, labelled as such) and
 * remembers the failure for `failMs`, so an outage costs one slow request instead of one per visitor.
 * @param {{fetchImpl?:typeof fetch, ttlMs?:number, staleMs?:number, failMs?:number, timeoutMs?:number,
 *   now?:() => number}} [options]
 */
export function createAirClient({
  fetchImpl = fetch,
  ttlMs = 10 * 60_000,
  staleMs = 60 * 60_000,
  failMs = 30_000,
  timeoutMs = 6000,
  now = Date.now,
} = {}) {
  const cache = /** @type {Map<string, {at:number, data:Reading}>} */ (new Map());
  const failures = /** @type {Map<string, {at:number, error:unknown}>} */ (new Map());
  const inflight = /** @type {Map<string, Promise<Reading>>} */ (new Map());

  /**
   * The last good reading, labelled as old, if it is not older than `staleMs`.
   * @param {string} cityKey
   * @returns {Reading|null}
   */
  const staleFor = (cityKey) => {
    const hit = cache.get(cityKey);
    return hit && now() - hit.at < staleMs
      ? { ...hit.data, source: `${SOURCE}, last reading (live feed unavailable)` }
      : null;
  };

  /**
   * Fetch, remember the outcome either way, and fall back to the stale reading on failure.
   * @param {import('./cities.js').CityKey} cityKey
   * @returns {Promise<Reading>}
   */
  function refresh(cityKey) {
    return fetchReading(cityKey, { fetchImpl, timeoutMs })
      .then((data) => {
        cache.set(cityKey, { at: now(), data });
        failures.delete(cityKey);
        return data;
      })
      .catch((error) => {
        failures.set(cityKey, { at: now(), error });
        const fallback = staleFor(cityKey);
        if (fallback) return fallback;
        throw error;
      })
      .finally(() => inflight.delete(cityKey));
  }

  return {
    /**
     * @param {import('./cities.js').CityKey} cityKey
     * @returns {Promise<Reading>}
     */
    async get(cityKey) {
      const hit = cache.get(cityKey);
      if (hit && now() - hit.at < ttlMs) return hit.data;
      const failed = failures.get(cityKey);
      if (failed && now() - failed.at < failMs) {
        const fallback = staleFor(cityKey);
        if (fallback) return fallback;
        throw failed.error;
      }
      if (!inflight.has(cityKey)) inflight.set(cityKey, refresh(cityKey));
      return /** @type {Promise<Reading>} */ (inflight.get(cityKey));
    },
  };
}

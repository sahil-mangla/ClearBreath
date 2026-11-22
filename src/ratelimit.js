/**
 * Minimal in-memory fixed-window rate limiter.
 * When the key table is full the oldest live entry is evicted (Map keeps insertion order), so memory stays
 * bounded without one flood of fake keys locking every real user out.
 * @param {{limit:number, windowMs:number, maxKeys?:number, now?:() => number}} options
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }) {
  const hits = /** @type {Map<string, {count:number, resetAt:number}>} */ (new Map());

  return {
    /**
     * @param {string} key
     * @returns {{allowed:boolean, retryAfterSec:number}}
     */
    check(key) {
      const t = now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        if (!entry && hits.size >= maxKeys) {
          for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value);
        }
        entry = { count: 0, resetAt: t + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= limit,
        retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)),
      };
    },
  };
}

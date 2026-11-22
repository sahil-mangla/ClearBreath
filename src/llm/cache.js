/**
 * A small time-limited cache keyed by request hash. Only successful, validated outputs are stored. Each kind
 * of reply gets its own cache so a flood of unique questions cannot push the shared plan translations out.
 * @param {{ttlMs:number, max:number, now:() => number}} options
 */
export function createCache({ ttlMs, max, now }) {
  const entries = new Map();
  return {
    remember(key, value) {
      if (entries.size >= max) entries.delete(entries.keys().next().value);
      entries.set(key, { at: now(), value });
    },
    /** @returns the stored value, or undefined when absent or expired */
    recall(key) {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (now() - hit.at >= ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
  };
}

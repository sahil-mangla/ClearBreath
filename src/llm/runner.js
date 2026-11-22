import { createHash } from 'node:crypto';
import { createCache } from './cache.js';

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 300;

/**
 * The sequence every Gemini call shares: serve from the cache, else call the model, validate with `parse`
 * (a value to keep, or null to reject) and remember what passed. `copy` hands out a fresh value each time
 * so a caller cannot change what is cached. Returns null when the client is off or anything fails.
 * @param {{enabled:boolean, model:string, generate:(request:object) => Promise<any>, now:() => number}} options
 */
export function createRunner({ enabled, model, generate, now }) {
  /** @param {string} instruction @param {object} payload */
  const keyOf = (instruction, payload) =>
    createHash('sha256')
      .update(`${model}\n${instruction}\n${JSON.stringify(payload)}`)
      .digest('hex');

  /**
   * @param {{cache:ReturnType<typeof createCache>, instruction:string, payload:object, schema:object,
   *   tokens:number, timeout?:number, parse:(out:any) => any, copy?:(value:any) => any}} task
   */
  async function run({ cache, parse, copy = (v) => v, ...request }) {
    if (!enabled) return null;
    const key = keyOf(request.instruction, request.payload);
    const hit = cache.recall(key);
    if (hit !== undefined) return copy(hit);
    const value = parse(await generate(request));
    if (value === null) return null;
    cache.remember(key, value);
    return copy(value);
  }

  const newCache = () => createCache({ ttlMs: CACHE_TTL_MS, max: CACHE_MAX, now });
  return { run, newCache };
}

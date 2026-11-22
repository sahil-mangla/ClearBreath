/**
 * Gemini client. The API key is read server-side only and sent in a header (never in the URL).
 * Every public method returns null on any failure so callers can fall back to the rules engine.
 *
 * Prompt-injection posture: user-controlled text (notes, questions) is passed only inside a JSON
 * `untrusted` field, the system prompt says to treat it as data, the response is constrained to a
 * JSON schema, and the output is validated/clamped before use. The UI renders it as plain text.
 *
 * The pieces live in ./llm/: prompts and limits, the call budget, the cache and the HTTP transport.
 */

import { createHash } from 'node:crypto';
import { checkTranslation, ungroundedNumbers } from './determinism.js';
import { createBudget } from './llm/budget.js';
import { createCache } from './llm/cache.js';
import {
  ANSWER_INSTRUCTION,
  ANSWER_MAX_CHARS,
  ANSWER_SCHEMA,
  ANSWER_TOKENS,
  BRIEFING_INSTRUCTION,
  BRIEFING_MAX_CHARS,
  BRIEFING_SCHEMA,
  BRIEFING_TOKENS,
  MAX_TOP_ACTIONS,
  TRANSLATE_INSTRUCTION,
  TRANSLATE_SCHEMA,
  TRANSLATE_TIMEOUT_MS,
  TRANSLATE_TOKENS,
} from './llm/prompts.js';
import { createTransport } from './llm/transport.js';

const MODEL_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 300;

/** Text that must never reach the page: markup, links, or anything that looks like an address. */
const UNSAFE_TEXT = /[<>]|https?:|www\./i;

const clampText = (s, max) =>
  typeof s === 'string'
    ? s
        .replace(/\p{Cc}/gu, ' ')
        .trim()
        .slice(0, max)
    : '';

/** The text is safe to show: no links or markup, and no figure above 10 that is absent from `facts`. */
const isGrounded = (text, facts) => !UNSAFE_TEXT.test(text) && ungroundedNumbers(text, facts).length === 0;

/**
 * @param {{apiKey?:string, model?:string, fetchImpl?:typeof fetch, timeoutMs?:number, retryDelayMs?:number,
 *   maxCallsPerMin?:number, now?:() => number}} [options]
 */
export function createLlm({
  apiKey,
  model = 'gemini-3.5-flash-lite',
  fetchImpl = fetch,
  timeoutMs = 9_000,
  retryDelayMs = 400,
  maxCallsPerMin = 120,
  now = Date.now,
} = {}) {
  const enabled = Boolean(apiKey) && MODEL_RE.test(model);
  const generate = createTransport({
    apiKey,
    model,
    fetchImpl,
    timeoutMs,
    retryDelayMs,
    budget: createBudget({ maxCallsPerMin, now }),
  });
  const newCache = () => createCache({ ttlMs: CACHE_TTL_MS, max: CACHE_MAX, now });
  const briefingCache = newCache();
  const answerCache = newCache();
  const translationCache = newCache();

  const keyOf = (instruction, payload) =>
    createHash('sha256')
      .update(`${model}\n${instruction}\n${JSON.stringify(payload)}`)
      .digest('hex');

  /**
   * The sequence every method shares: serve from the cache, else call Gemini, validate with `parse`
   * (a value to keep, or null to reject) and remember what passed. `copy` hands out a fresh value each
   * time so a caller cannot change what is cached.
   * @param {{cache:ReturnType<typeof createCache>, instruction:string, payload:object, schema:object,
   *   tokens:number, timeout?:number, parse:(out:any) => any, copy?:(value:any) => any}} options
   */
  async function cachedGenerate({
    cache,
    instruction,
    payload,
    schema,
    tokens,
    timeout,
    parse,
    copy = (v) => v,
  }) {
    if (!enabled) return null;
    const key = keyOf(instruction, payload);
    const hit = cache.recall(key);
    if (hit !== undefined) return copy(hit);
    const value = parse(await generate(instruction, payload, schema, tokens, { timeout }));
    if (value === null) return null;
    cache.remember(key, value);
    return copy(value);
  }

  return {
    enabled,

    /**
     * @param {{facts:object, untrusted:{notes:string}, allowedIds:string[]}} args
     * @returns {Promise<{text:string, topActionIds:string[], source:'gemini'}|null>}
     */
    briefing({ facts, untrusted, allowedIds }) {
      const allowed = new Set(allowedIds);
      return cachedGenerate({
        cache: briefingCache,
        instruction: BRIEFING_INSTRUCTION,
        payload: { facts, untrusted },
        schema: BRIEFING_SCHEMA,
        tokens: BRIEFING_TOKENS,
        copy: (b) => ({ ...b, topActionIds: [...b.topActionIds] }),
        parse(out) {
          const text = clampText(out?.briefing, BRIEFING_MAX_CHARS);
          if (!text) return null;
          if (!isGrounded(text, facts)) {
            console.error('[llm] briefing rejected: ungrounded figure or link');
            return null;
          }
          const ids = Array.isArray(out.topActionIds)
            ? [...new Set(out.topActionIds.filter((id) => typeof id === 'string' && allowed.has(id)))]
            : [];
          return {
            text,
            topActionIds: ids.slice(0, MAX_TOP_ACTIONS),
            source: /** @type {const} */ ('gemini'),
          };
        },
      });
    },

    /** @returns {Promise<string|null>} */
    answer({ facts, untrusted }) {
      return cachedGenerate({
        cache: answerCache,
        instruction: ANSWER_INSTRUCTION,
        payload: { facts, untrusted },
        schema: ANSWER_SCHEMA,
        tokens: ANSWER_TOKENS,
        parse(out) {
          const text = clampText(out?.answer, ANSWER_MAX_CHARS);
          if (!text) return null;
          if (!isGrounded(text, facts)) {
            console.error('[llm] answer rejected: ungrounded figure or link');
            return null;
          }
          return text;
        },
      });
    },

    /**
     * Translate a short list of English strings into Hindi. Returns the strings only if every one passes
     * `checkTranslation` (count, script, no markup, same figures); otherwise null, so the caller uses its
     * built-in Hindi. Identical chunks are served from the cache.
     * @param {string[]} texts
     * @returns {Promise<string[]|null>}
     */
    translate(texts) {
      return cachedGenerate({
        cache: translationCache,
        instruction: TRANSLATE_INSTRUCTION,
        payload: { texts },
        schema: TRANSLATE_SCHEMA,
        tokens: TRANSLATE_TOKENS,
        timeout: TRANSLATE_TIMEOUT_MS,
        copy: (list) => [...list],
        parse(out) {
          const clean = checkTranslation(texts, out?.translations);
          if (!clean && out) console.error('[llm] translation rejected by validation');
          return clean ?? null;
        },
      });
    },
  };
}

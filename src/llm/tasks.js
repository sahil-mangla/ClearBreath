import { checkTranslation, ungroundedNumbers } from '../determinism.js';
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
} from './prompts.js';

/** Text that must never reach the page: markup, links, or anything that looks like an address. */
const UNSAFE_TEXT = /[<>]|https?:|www\./i;

/** @param {unknown} s @param {number} max */
const clampText = (s, max) =>
  typeof s === 'string'
    ? s
        .replace(/\p{Cc}/gu, ' ')
        .trim()
        .slice(0, max)
    : '';

/** The text is safe to show: no links or markup, and no figure above 10 that is absent from `facts`. */
/** @param {string} text @param {object} facts */
const isGrounded = (text, facts) => !UNSAFE_TEXT.test(text) && ungroundedNumbers(text, facts).length === 0;

/**
 * The model's free text, clamped, or null when it is empty or fails the grounding check.
 * @param {unknown} raw
 * @param {number} max
 * @param {object} facts
 * @param {string} what
 */
function groundedText(raw, max, facts, what) {
  const text = clampText(raw, max);
  if (!text) return null;
  if (!isGrounded(text, facts)) {
    console.error(`[llm] ${what} rejected: ungrounded figure or link`);
    return null;
  }
  return text;
}

/** @typedef {ReturnType<typeof import('./runner.js').createRunner>} Runner */

/**
 * @param {Runner} runner
 * @returns {(args:{facts:object, untrusted:{notes:string}, allowedIds:string[]}) =>
 *   Promise<import('../types.js').Briefing|null>}
 */
export function briefingTask({ run, newCache }) {
  const cache = newCache();
  return ({ facts, untrusted, allowedIds }) => {
    const allowed = new Set(allowedIds);
    return run({
      cache,
      instruction: BRIEFING_INSTRUCTION,
      payload: { facts, untrusted },
      schema: BRIEFING_SCHEMA,
      tokens: BRIEFING_TOKENS,
      copy: (b) => ({ ...b, topActionIds: [...b.topActionIds] }),
      parse(out) {
        const text = groundedText(out?.briefing, BRIEFING_MAX_CHARS, facts, 'briefing');
        if (!text) return null;
        const ids = Array.isArray(out.topActionIds)
          ? [
              ...new Set(
                out.topActionIds.filter(
                  (/** @type {unknown} */ id) => typeof id === 'string' && allowed.has(id),
                ),
              ),
            ]
          : [];
        return { text, topActionIds: ids.slice(0, MAX_TOP_ACTIONS), source: /** @type {const} */ ('gemini') };
      },
    });
  };
}

/** @param {Runner} runner @returns {(args:{facts:object, untrusted:object}) => Promise<string|null>} */
export function answerTask({ run, newCache }) {
  const cache = newCache();
  return ({ facts, untrusted }) =>
    run({
      cache,
      instruction: ANSWER_INSTRUCTION,
      payload: { facts, untrusted },
      schema: ANSWER_SCHEMA,
      tokens: ANSWER_TOKENS,
      parse: (out) => groundedText(out?.answer, ANSWER_MAX_CHARS, facts, 'answer'),
    });
}

/**
 * Translate a short list of English strings into Hindi. Returns the strings only if every one passes
 * `checkTranslation` (count, script, no markup, same figures); otherwise null, so the caller uses its
 * built-in Hindi. Identical chunks are served from the cache.
 * @param {Runner} runner
 * @returns {(texts:string[]) => Promise<string[]|null>}
 */
export function translateTask({ run, newCache }) {
  const cache = newCache();
  return (texts) =>
    run({
      cache,
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
}

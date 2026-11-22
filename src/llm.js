/**
 * Gemini client. The API key is read server-side only and sent in a header (never in the URL).
 * Every public method returns null on any failure so callers can fall back to the rules engine.
 *
 * Prompt-injection posture: user-controlled text (notes, questions) is passed only inside a JSON
 * `untrusted` field, the system prompt says to treat it as data, the response is constrained to a
 * JSON schema, and the output is validated/clamped before use. The UI renders it as plain text.
 *
 * The pieces live in ./llm/: prompts and limits, the call budget, the cache, the HTTP transport, the
 * shared cache-call-validate sequence (runner) and the three tasks built on it.
 */

import { createBudget } from './llm/budget.js';
import { createRunner } from './llm/runner.js';
import { answerTask, briefingTask, translateTask } from './llm/tasks.js';
import { createTransport } from './llm/transport.js';

const MODEL_RE = /^[a-zA-Z0-9._-]{1,64}$/;

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
  const budget = createBudget({ maxCallsPerMin, now });
  const generate = createTransport({ apiKey, model, fetchImpl, timeoutMs, retryDelayMs, budget });
  const runner = createRunner({ enabled, model, generate, now });

  return {
    enabled,
    briefing: briefingTask(runner),
    answer: answerTask(runner),
    translate: translateTask(runner),
  };
}

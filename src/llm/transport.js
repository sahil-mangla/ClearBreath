const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SEED = 7; // fixed, so identical requests give identical text
const RETRY_STATUS = new Set([429, 503]); // "busy" answers worth one more try

/**
 * The request body: the system instruction, the data, and the settings that keep output repeatable.
 * @param {{model:string, instruction:string, payload:object, schema:object, tokens:number}} input
 */
function requestBody({ model, instruction, payload, schema, tokens }) {
  const generationConfig = {
    temperature: 0,
    seed: SEED,
    maxOutputTokens: tokens,
    responseMimeType: 'application/json',
    responseSchema: schema,
    ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };
  return JSON.stringify({
    systemInstruction: { parts: [{ text: instruction }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig,
  });
}

/**
 * The JSON the model produced, from Gemini's reply envelope.
 * @param {Response} res
 */
async function parseReply(res) {
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((/** @type {{text?:string}} */ p) => p?.text ?? '').join('') ??
    '';
  return JSON.parse(text);
}

/**
 * The only code that talks to Gemini. `generate` makes one call and returns the parsed JSON, or null on any
 * failure. Deterministic settings, one retry when Google is busy, every attempt counted against the budget.
 * @param {{apiKey?:string, model:string, fetchImpl:typeof fetch, timeoutMs:number, retryDelayMs:number,
 *   budget:{take:() => boolean}}} options
 */
export function createTransport({ apiKey, model, fetchImpl, timeoutMs, retryDelayMs, budget }) {
  /** @param {{instruction:string, payload:object, schema:object, tokens:number, timeout?:number}} request */
  return async function generate({ timeout = timeoutMs, ...request }) {
    try {
      // One deadline covers the first attempt, the pause and the retry, so a retry cannot double the wait.
      const deadline = AbortSignal.timeout(timeout);
      const body = requestBody({ model, ...request });
      const call = () =>
        fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
          method: 'POST',
          signal: deadline,
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey ?? '' },
          body,
        });
      if (!budget.take()) {
        console.error('[llm] call skipped: per-minute budget used');
        return null;
      }
      let res = await call();
      if (RETRY_STATUS.has(res.status) && budget.take()) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        res = await call();
      }
      return await parseReply(res);
    } catch (err) {
      // Log the failure class only: never the key, prompt or user content.
      console.error(`[llm] request failed: ${err?.name ?? 'Error'}`);
      return null;
    }
  };
}

/**
 * Hindi for the whole plan: Gemini first, the built-in catalogue (hi.js) as the deterministic backup.
 *
 * The plan's strings are split into chunks that Gemini translates in parallel. Each chunk is accepted only
 * if it passes the deterministic checks in llm.translate(); a chunk that fails (busy, slow, wrong count,
 * changed figures) is replaced by the built-in Hindi for exactly those strings. With no key, or when Gemini
 * is down, every chunk falls back and the result is identical on every run.
 */

const CHUNK_CHARS = 1800;

/**
 * Split into runs of consecutive strings of at most ~maxChars each (a single long string stays whole).
 * @param {string[]} texts
 * @param {number} [maxChars]
 * @returns {number[][]} arrays of indexes into `texts`
 */
export function chunkTexts(texts, maxChars = CHUNK_CHARS) {
  const chunks = /** @type {number[][]} */ ([]);
  let current = /** @type {number[]} */ ([]);
  let size = 0;
  texts.forEach((t, i) => {
    if (current.length && size + t.length > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(i);
    size += t.length;
  });
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * @param {{translate:(t:string[])=>Promise<string[]|null>, enabled:boolean}} llm
 * @param {string[]} texts    English strings from collectTexts()
 * @param {string[]|null} builtin  Hindi strings in the same order from builtinTexts(), or null if unavailable
 * @returns {Promise<{texts:string[], source:'gemini'|'builtin'|'mixed'}|null>} null when neither source can cover it
 */
export async function translateTexts(llm, texts, builtin) {
  const chunks = chunkTexts(texts);
  const viaGemini = llm.enabled
    ? await Promise.all(chunks.map((idx) => llm.translate(idx.map((i) => texts[i])).catch(() => null)))
    : chunks.map(() => null);

  /** @type {string[]} */
  const out = new Array(texts.length);
  let gemini = 0;
  for (let c = 0; c < chunks.length; c += 1) {
    const got = viaGemini[c];
    if (got) {
      chunks[c].forEach((i, k) => {
        out[i] = got[k];
      });
      gemini += 1;
    } else if (builtin) {
      chunks[c].forEach((i) => {
        out[i] = builtin[i];
      });
    } else {
      return null;
    }
  }
  const source = gemini === chunks.length ? 'gemini' : gemini === 0 ? 'builtin' : 'mixed';
  return { texts: out, source };
}

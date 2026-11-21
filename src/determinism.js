/**
 * Deterministic guards for model output. Gemini is an optional enhancement: nothing it writes reaches
 * the page unless these checks pass, and every check failing means the built-in text is used instead.
 * All functions are pure, so the same input always gives the same verdict.
 */

const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const DEVANAGARI = /[ऀ-ॿ]/;
// Identifiers that contain digits but are names, not figures.
const NAMES_WITH_DIGITS = /PM\s?2\.5|PM\s?10|N\s?95|FFP\s?2|CO\s?2|CO₂|MERV[- ]?\d+|CADR/gi;

/** Devanagari digits to ASCII, so "५४.६" and "54.6" compare equal. */
export const normalizeDigits = (s) => String(s).replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

/** Every number written in the text, as normalised strings, in order. Identifier digits (N95, PM2.5) are ignored. */
export function numberTokens(text) {
  const clean = normalizeDigits(text).replace(NAMES_WITH_DIGITS, ' ');
  return (clean.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n)));
}

/** True when both texts quote exactly the same figures (same values, same counts, any order). */
export function sameNumbers(a, b) {
  const x = numberTokens(a).sort();
  const y = numberTokens(b).sort();
  return x.length === y.length && x.every((n, i) => n === y[i]);
}

/** The set of figures a model may quote: everything in `facts`, plus the same figures rounded. */
export function allowedNumbers(facts) {
  const allowed = new Set();
  for (const n of numberTokens(JSON.stringify(facts))) {
    const v = Number(n);
    allowed.add(String(v));
    allowed.add(String(Math.round(v)));
    allowed.add(String(Math.round(v * 10) / 10));
  }
  return allowed;
}

/**
 * Figures above 10 must come from `facts` (so "52% better" cannot be invented), while counting words
 * such as "3 steps" or "10 minutes" stay free. Returns the offending figures, empty when grounded.
 */
export function ungroundedNumbers(text, facts, freeUpTo = 10) {
  const allowed = allowedNumbers(facts);
  return numberTokens(text).filter((n) => Number(n) > freeUpTo && !allowed.has(n));
}

export const hasDevanagari = (s) => DEVANAGARI.test(s);

const hasLetters = (s) => /\p{L}/u.test(s);

/**
 * Validate a batch of translations against their sources. Returns the clean strings, or null when
 * anything is off: wrong count, empty or runaway output, markup or links, no Hindi script, or any
 * figure changed. Whole-batch on purpose, so a half-trusted batch never reaches the page.
 */
export function checkTranslation(sources, out, { maxLen = 1500 } = {}) {
  if (!Array.isArray(out) || out.length !== sources.length) return null;
  const clean = [];
  for (let i = 0; i < sources.length; i += 1) {
    const t = typeof out[i] === 'string' ? out[i].replace(/\p{Cc}/gu, ' ').trim() : '';
    if (!t || t.length > maxLen) return null;
    if (/[<>]|https?:|www\./i.test(t)) return null;
    if (hasLetters(sources[i]) && !hasDevanagari(t)) return null;
    if (!sameNumbers(sources[i], t)) return null;
    clean.push(t);
  }
  return clean;
}

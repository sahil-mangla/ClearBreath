// Interface strings in English and Hindi (./copy/) plus a tiny formatter, so it is unit-tested.
// Server-written plan text (action titles and details) stays English; the UI says so in Hindi mode.
import { LANGS as SERVER_LANGS } from '../src/languages.js';
import en from './copy/en.js';
import hi from './copy/hi.js';

/** @typedef {Record<string, string | string[][]>} Catalogue the strings of one language; a few entries are lists */
/** @typedef {{name?:string, nameHi?:string, state?:string, stateHi?:string}|null|undefined} Named */

/** @type {Readonly<Record<string, Catalogue>>} */
export const STRINGS = Object.freeze({ en, hi });
export const LANGS = Object.freeze([...SERVER_LANGS]);

/** @type {Record<string, string>} */
const ERR_ALIASES = {
  bad_type: 'bad_request',
  bad_json: 'bad_request',
  body_read: 'bad_request',
  bad_method: 'bad_request',
  not_found: 'bad_request',
};

/**
 * The text to show for a failed request. Errors carry a stable `code` (from the server or the client), which
 * is shown in the interface language; an unknown code falls back to the server's own English message.
 * @param {string} lang
 * @param {{code?:string, message?:string}|null|undefined} err
 * @returns {{text:string, translated:boolean}} `translated` is false when the text is the raw English message.
 */
export function errorMessage(lang, err) {
  const code = err?.code;
  const key = `err.${(code && ERR_ALIASES[code]) ?? code}`;
  if (code && key in en) return { text: translate(lang, key), translated: true };
  return { text: err?.message || translate(lang, 'err.generic'), translated: false };
}

/**
 * A city's name in the interface language (Hindi where the server supplied it).
 * @param {Named} city @param {string} lang
 */
export const cityLabel = (city, lang) => (lang === 'hi' && city?.nameHi ? city.nameHi : (city?.name ?? ''));
/** @param {Named} city @param {string} lang */
export const stateLabel = (city, lang) =>
  lang === 'hi' && city?.stateHi ? city.stateHi : (city?.state ?? '');

/**
 * Look up `key` in `lang` (falling back to English, then the key itself) and fill `{name}` slots.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function translate(lang, key, vars) {
  const raw = (STRINGS[lang] ?? STRINGS.en)[key] ?? STRINGS.en[key] ?? key;
  if (typeof raw !== 'string' || !vars) return typeof raw === 'string' ? raw : key;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/**
 * A list-valued entry (the "do these now" steps) as [title, detail] pairs, in `lang` or else English.
 * @param {string} lang
 * @param {string} key
 * @returns {string[][]}
 */
export function translateSteps(lang, key) {
  const raw = (STRINGS[lang] ?? STRINGS.en)[key] ?? STRINGS.en[key];
  return Array.isArray(raw) ? raw : [];
}

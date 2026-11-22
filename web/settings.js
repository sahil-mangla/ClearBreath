import { DEFAULTS as SERVER_DEFAULTS } from '../src/limits.js';
import { LANGS } from './strings.js';

const LANG_KEY = 'clearbreath.lang';

/** The saved language, or English. */
export function storedLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return LANGS.includes(v) ? v : 'en';
  } catch {
    return 'en'; // storage can be blocked; the page works without it
  }
}

/** Initial form values: the server's defaults as strings, plus the web-only fields. */
export const DEFAULTS = {
  city: 'delhi',
  adults: String(SERVER_DEFAULTS.adults),
  children: String(SERVER_DEFAULTS.children),
  seniors: String(SERVER_DEFAULTS.seniors),
  conditions: [],
  commute: SERVER_DEFAULTS.commute,
  commuteKm: String(SERVER_DEFAULTS.commuteKm),
  cooking: SERVER_DEFAULTS.cooking,
  heating: SERVER_DEFAULTS.heating,
  hasPurifier: false,
  hasN95: false,
  lang: 'en',
  notes: '',
  manualPm25: '',
};

/** Remember the language for the next visit. Storage can be blocked, so a failure just means this visit only. */
export function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage blocked: the choice just lasts for this visit */
  }
}

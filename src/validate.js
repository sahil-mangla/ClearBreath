import { isCity } from './cities.js';
import { LANGS } from './constants.js';
import {
  COMMUTES,
  CONDITIONS,
  COOKING,
  DEFAULTS,
  HEATING,
  LIMITS,
  NOTES_MAX,
  QUESTION_MAX,
} from './limits.js';

export { COMMUTES, CONDITIONS, COOKING, HEATING, LANGS };

/** Strip control characters, collapse whitespace, cap length. Returns '' for non-strings. */
export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function int(value, min, max, fallback, label, errors) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${label} must be a whole number between ${min} and ${max}.`);
    return fallback;
  }
  return value;
}

function oneOf(value, allowed, fallback, label, errors) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
    return fallback;
  }
  return value;
}

// The label each message starts with -> the form field it is about, so the page can mark that field invalid.
const FIELD_OF_LABEL = {
  Adults: 'adults',
  Children: 'children',
  Seniors: 'seniors',
  Commute: 'commute',
  'Commute distance': 'commuteKm',
  'Cooking fuel': 'cooking',
  Heating: 'heating',
  'Manual PM2.5': 'manualPm25',
};

/** The form field ids that the given validation messages are about (unknown messages map to nothing). */
export function fieldsOf(messages) {
  const labels = Object.keys(FIELD_OF_LABEL).sort((a, b) => b.length - a.length); // 'Commute distance' before 'Commute'
  return [
    ...new Set(
      messages.map((m) => FIELD_OF_LABEL[labels.find((l) => m.startsWith(`${l} `))]).filter(Boolean),
    ),
  ];
}

/**
 * @typedef {{city:string, adults:number, children:number, seniors:number, conditions:string[], commute:string,
 *   commuteKm:number, cooking:string, heating:string, hasPurifier:boolean, hasN95:boolean,
 *   manualPm25:number|null, notes:string, lang:string}} PlanProfile
 */

/** @returns {{ok:true,value:PlanProfile}|{ok:false,errors:string[]}} */
export function validatePlanInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }
  const errors = [];
  if (!isCity(body.city)) errors.push('Please choose a supported city.');

  const value = {
    city: body.city,
    adults: int(body.adults, ...LIMITS.adults, DEFAULTS.adults, 'Adults', errors),
    children: int(body.children, ...LIMITS.children, DEFAULTS.children, 'Children', errors),
    seniors: int(body.seniors, ...LIMITS.seniors, DEFAULTS.seniors, 'Seniors', errors),
    commute: oneOf(body.commute, COMMUTES, DEFAULTS.commute, 'Commute', errors),
    commuteKm: int(body.commuteKm, ...LIMITS.commuteKm, DEFAULTS.commuteKm, 'Commute distance', errors),
    cooking: oneOf(body.cooking, COOKING, DEFAULTS.cooking, 'Cooking fuel', errors),
    heating: oneOf(body.heating, HEATING, DEFAULTS.heating, 'Heating', errors),
    hasPurifier: body.hasPurifier === true,
    hasN95: body.hasN95 === true,
    lang: oneOf(body.lang, LANGS, 'en', 'Language', errors),
    notes: cleanText(body.notes, NOTES_MAX),
    conditions: /** @type {string[]} */ ([]),
    manualPm25: /** @type {number|null} */ (null),
  };

  if (body.conditions !== undefined) {
    if (!Array.isArray(body.conditions) || body.conditions.some((c) => !CONDITIONS.includes(c))) {
      errors.push(`Conditions must be a list drawn from: ${CONDITIONS.join(', ')}.`);
    } else {
      value.conditions = [...new Set(body.conditions)];
    }
  }

  if (body.manualPm25 !== undefined && body.manualPm25 !== null && body.manualPm25 !== '') {
    const [min, max] = LIMITS.manualPm25;
    if (
      typeof body.manualPm25 !== 'number' ||
      !Number.isFinite(body.manualPm25) ||
      body.manualPm25 < min ||
      body.manualPm25 > max
    ) {
      errors.push(`Manual PM2.5 must be a number between ${min} and ${max} µg/m³.`);
    } else {
      value.manualPm25 = body.manualPm25;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** @returns {{ok:true,value:{city:string,question:string,lang:string}}|{ok:false,errors:string[]}} */
export function validateAskInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }
  const errors = [];
  if (!isCity(body.city)) errors.push('Please choose a supported city.');
  const question = cleanText(body.question, QUESTION_MAX);
  if (question.length < 3) errors.push('Please type a question (at least 3 characters).');
  const lang = oneOf(body.lang, LANGS, 'en', 'Language', errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: { city: body.city, question, lang } };
}

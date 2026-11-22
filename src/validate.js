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

/**
 * One problem found in the input: the form field it is about and the message shown to the person.
 * @typedef {{field:string, message:string}} Issue
 */

/** A whole number in range, else `fallback` and an issue recorded against `field`. */
/** @param {number[]} range the [min, max] allowed */
function int(value, range, fallback, field, label, issues) {
  const [min, max] = range;
  if (value === undefined || value === null || value === '') return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    issues.push({ field, message: `${label} must be a whole number between ${min} and ${max}.` });
    return fallback;
  }
  return value;
}

/** One of the allowed strings, else `fallback` and an issue recorded against `field`. */
function oneOf(value, allowed, fallback, field, label, issues) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    issues.push({ field, message: `${label} must be one of: ${allowed.join(', ')}.` });
    return fallback;
  }
  return value;
}

/** The failure result: the messages for people, and the field ids the form marks invalid. */
function failure(issues) {
  return {
    ok: /** @type {const} */ (false),
    errors: issues.map((i) => i.message),
    fields: [...new Set(issues.map((i) => i.field))],
  };
}

/**
 * @typedef {{city:string, adults:number, children:number, seniors:number, conditions:string[], commute:string,
 *   commuteKm:number, cooking:string, heating:string, hasPurifier:boolean, hasN95:boolean,
 *   manualPm25:number|null, notes:string, lang:string}} PlanProfile
 */

/** @returns {{ok:true,value:PlanProfile}|{ok:false,errors:string[],fields:string[]}} */
export function validatePlanInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return failure([{ field: 'body', message: 'Request body must be a JSON object.' }]);
  }
  const issues = [];
  if (!isCity(body.city)) issues.push({ field: 'city', message: 'Please choose a supported city.' });

  const value = {
    city: body.city,
    adults: int(body.adults, LIMITS.adults, DEFAULTS.adults, 'adults', 'Adults', issues),
    children: int(body.children, LIMITS.children, DEFAULTS.children, 'children', 'Children', issues),
    seniors: int(body.seniors, LIMITS.seniors, DEFAULTS.seniors, 'seniors', 'Seniors', issues),
    commute: oneOf(body.commute, COMMUTES, DEFAULTS.commute, 'commute', 'Commute', issues),
    commuteKm: int(
      body.commuteKm,
      LIMITS.commuteKm,
      DEFAULTS.commuteKm,
      'commuteKm',
      'Commute distance',
      issues,
    ),
    cooking: oneOf(body.cooking, COOKING, DEFAULTS.cooking, 'cooking', 'Cooking fuel', issues),
    heating: oneOf(body.heating, HEATING, DEFAULTS.heating, 'heating', 'Heating', issues),
    hasPurifier: body.hasPurifier === true,
    hasN95: body.hasN95 === true,
    lang: oneOf(body.lang, LANGS, 'en', 'lang', 'Language', issues),
    notes: cleanText(body.notes, NOTES_MAX),
    conditions: /** @type {string[]} */ ([]),
    manualPm25: /** @type {number|null} */ (null),
  };

  if (body.conditions !== undefined) {
    if (!Array.isArray(body.conditions) || body.conditions.some((c) => !CONDITIONS.includes(c))) {
      issues.push({
        field: 'conditions',
        message: `Conditions must be a list drawn from: ${CONDITIONS.join(', ')}.`,
      });
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
      issues.push({
        field: 'manualPm25',
        message: `Manual PM2.5 must be a number between ${min} and ${max} µg/m³.`,
      });
    } else {
      value.manualPm25 = body.manualPm25;
    }
  }

  return issues.length ? failure(issues) : { ok: true, value };
}

/** @returns {{ok:true,value:{city:string,question:string,lang:string}}|{ok:false,errors:string[],fields:string[]}} */
export function validateAskInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return failure([{ field: 'body', message: 'Request body must be a JSON object.' }]);
  }
  const issues = [];
  if (!isCity(body.city)) issues.push({ field: 'city', message: 'Please choose a supported city.' });
  const question = cleanText(body.question, QUESTION_MAX);
  if (question.length < 3)
    issues.push({ field: 'question', message: 'Please type a question (at least 3 characters).' });
  const lang = oneOf(body.lang, LANGS, 'en', 'lang', 'Language', issues);
  return issues.length ? failure(issues) : { ok: true, value: { city: body.city, question, lang } };
}

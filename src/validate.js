import { isCity } from './cities.js';
import { DEFAULT_LANG, LANGS } from './languages.js';
import {
  COMMUTES,
  CONDITIONS,
  COOKING,
  DEFAULTS,
  HEATING,
  LIMITS,
  NOTES_MAX,
  QUESTION_MAX,
  QUESTION_MIN,
} from './limits.js';

export { COMMUTES, CONDITIONS, COOKING, HEATING, LANGS };

/**
 * Strip control characters, collapse whitespace, cap length. Returns '' for non-strings.
 * @param {unknown} value
 * @param {number} max
 */
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

/**
 * How one form field is read. `allowed` lists the choices of a choice field.
 * @typedef {{field:string, label:string, fallback:any, allowed?:readonly string[],
 *   read:(value:unknown, spec:FieldSpec, issues:Issue[]) => any}} FieldSpec
 */

/**
 * A whole number in range, else `fallback` and an issue recorded against `field`.
 * @param {unknown} value @param {Omit<FieldSpec, 'read'>} spec @param {Issue[]} issues
 */
function readInt(value, { field, label, fallback }, issues) {
  if (value === undefined || value === null || value === '') return fallback;
  const [min, max] = LIMITS[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    issues.push({ field, message: `${label} must be a whole number between ${min} and ${max}.` });
    return fallback;
  }
  return value;
}

/**
 * One of the allowed strings, else `fallback` and an issue recorded against `field`.
 * @param {unknown} value @param {Omit<FieldSpec, 'read'>} spec @param {Issue[]} issues
 */
function readChoice(value, { field, label, fallback, allowed = [] }, issues) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    issues.push({ field, message: `${label} must be one of: ${allowed.join(', ')}.` });
    return fallback;
  }
  return value;
}

/** The numbers and choices of the plan form, in one table: the reader, the form field and its wording. */
/** @type {FieldSpec[]} */
const FIELDS = [
  { read: readInt, field: 'adults', label: 'Adults', fallback: DEFAULTS.adults },
  { read: readInt, field: 'children', label: 'Children', fallback: DEFAULTS.children },
  { read: readInt, field: 'seniors', label: 'Seniors', fallback: DEFAULTS.seniors },
  { read: readChoice, field: 'commute', label: 'Commute', fallback: DEFAULTS.commute, allowed: COMMUTES },
  { read: readInt, field: 'commuteKm', label: 'Commute distance', fallback: DEFAULTS.commuteKm },
  { read: readChoice, field: 'cooking', label: 'Cooking fuel', fallback: DEFAULTS.cooking, allowed: COOKING },
  { read: readChoice, field: 'heating', label: 'Heating', fallback: DEFAULTS.heating, allowed: HEATING },
  { read: readChoice, field: 'lang', label: 'Language', fallback: DEFAULT_LANG, allowed: LANGS },
];

/**
 * The failure result: the messages for people, and the field ids the form marks invalid.
 * @param {Issue[]} issues
 */
function failure(issues) {
  return {
    ok: /** @type {const} */ (false),
    errors: issues.map((i) => i.message),
    fields: [...new Set(issues.map((i) => i.field))],
  };
}

/**
 * The listed health conditions, de-duplicated; an issue when the list is malformed.
 * @param {unknown} value
 * @param {Issue[]} issues
 */
function readConditions(value, issues) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((c) => !CONDITIONS.includes(c))) {
    issues.push({
      field: 'conditions',
      message: `Conditions must be a list drawn from: ${CONDITIONS.join(', ')}.`,
    });
    return [];
  }
  return [...new Set(value)];
}

/**
 * The manually entered PM2.5, or null when none was given; an issue when it is not a sensible number.
 * @param {unknown} value
 * @param {Issue[]} issues
 */
function readManualPm25(value, issues) {
  if (value === undefined || value === null || value === '') return null;
  const [min, max] = LIMITS.manualPm25;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    issues.push({
      field: 'manualPm25',
      message: `Manual PM2.5 must be a number between ${min} and ${max} µg/m³.`,
    });
    return null;
  }
  return value;
}

/**
 * @typedef {{city:import('./cities.js').CityKey, adults:number, children:number, seniors:number,
 *   conditions:string[], commute:string, commuteKm:number, cooking:string, heating:string,
 *   hasPurifier:boolean, hasN95:boolean, manualPm25:number|null, notes:string, lang:string}} PlanProfile
 */

/** @param {unknown} body @returns {body is Record<string, any>} */
const isObject = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const notAnObject = () => failure([{ field: 'body', message: 'Request body must be a JSON object.' }]);

/**
 * @param {unknown} body
 * @returns {{ok:true,value:PlanProfile}|{ok:false,errors:string[],fields:string[]}}
 */
export function validatePlanInput(body) {
  if (!isObject(body)) return notAnObject();
  /** @type {Issue[]} */
  const issues = [];
  if (!isCity(body.city)) issues.push({ field: 'city', message: 'Please choose a supported city.' });

  const read = Object.fromEntries(
    FIELDS.map((spec) => [spec.field, spec.read(body[spec.field], spec, issues)]),
  );
  const value = {
    ...read,
    city: body.city,
    hasPurifier: body.hasPurifier === true,
    hasN95: body.hasN95 === true,
    notes: cleanText(body.notes, NOTES_MAX),
    conditions: readConditions(body.conditions, issues),
    manualPm25: readManualPm25(body.manualPm25, issues),
  };
  return issues.length ? failure(issues) : { ok: true, value: /** @type {PlanProfile} */ (value) };
}

/**
 * @param {unknown} body
 * @returns {{ok:true,value:{city:import('./cities.js').CityKey, question:string, lang:string}}|
 *   {ok:false,errors:string[],fields:string[]}}
 */
export function validateAskInput(body) {
  if (!isObject(body)) return notAnObject();
  /** @type {Issue[]} */
  const issues = [];
  if (!isCity(body.city)) issues.push({ field: 'city', message: 'Please choose a supported city.' });
  const question = cleanText(body.question, QUESTION_MAX);
  if (question.length < QUESTION_MIN)
    issues.push({
      field: 'question',
      message: `Please type a question (at least ${QUESTION_MIN} characters).`,
    });
  const lang = readChoice(
    body.lang,
    { field: 'lang', label: 'Language', fallback: DEFAULT_LANG, allowed: LANGS },
    issues,
  );
  return issues.length ? failure(issues) : { ok: true, value: { city: body.city, question, lang } };
}

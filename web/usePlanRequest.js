import { useCallback, useRef, useState } from 'react';
import { postPlan } from './api.js';
import { cityLabel, translate } from './strings.js';

/** @typedef {import('./types.js').PlanResult} PlanResult */
/** @typedef {import('./types.js').RequestErrors} RequestErrors */
/** @typedef {import('./types.js').HazeView} HazeView */
/** @typedef {import('./types.js').ApiError} ApiError */

/** @typedef {import('./types.js').FormValues} FormValues */

/** @param {string} v */
const num = (v) => (String(v).trim() === '' ? undefined : Number(v));

/**
 * The form's string values as the typed request the API expects.
 * @param {FormValues} v
 */
function toRequest(v) {
  return {
    city: v.city,
    adults: num(v.adults),
    children: num(v.children),
    seniors: num(v.seniors),
    conditions: v.conditions,
    commute: v.commute,
    commuteKm: num(v.commuteKm),
    cooking: v.cooking,
    heating: v.heating,
    hasPurifier: v.hasPurifier,
    hasN95: v.hasN95,
    lang: v.lang,
    notes: v.notes,
    manualPm25: num(v.manualPm25),
  };
}

/**
 * Builds a plan from the form values and tracks the request: busy flag, field errors, the screen-reader
 * status line and the result. A request that arrives while another is running waits for it (the latest
 * wins) instead of being dropped. `shouldFocus()` says whether the latest plan should take focus.
 */
export function usePlanRequest() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(/** @type {RequestErrors|null} */ (null));
  const [result, setResult] = useState(/** @type {PlanResult|null} */ (null));
  const [hazeView, setHazeView] = useState(/** @type {HazeView} */ ('plan'));
  const [status, setStatus] = useState('');
  const running = useRef(false);
  const queued = useRef(/** @type {{values:FormValues, focus:boolean}|null} */ (null));
  const moveFocus = useRef(false);
  const shouldFocus = useCallback(() => moveFocus.current, []);

  /** @param {FormValues} values @param {{focus?:boolean}} [options] */
  const build = async (values, { focus = true } = {}) => {
    if (running.current) {
      queued.current = { values, focus };
      return;
    }
    running.current = true;
    moveFocus.current = focus;
    setErrors(null);
    setBusy(true);
    setStatus(translate(values.lang, 'status.fetching'));
    try {
      const data = await postPlan(toRequest(values));
      setResult(data);
      setHazeView('plan');
      setStatus(translate(values.lang, 'status.ready', { city: cityLabel(data.city, values.lang) }));
    } catch (e) {
      const err = /** @type {ApiError} */ (e);
      setStatus(translate(values.lang, 'status.failed'));
      setErrors({ code: err.code, message: err.message, details: err.details, fields: err.fields });
    } finally {
      running.current = false;
      setBusy(false);
      const next = queued.current;
      queued.current = null;
      if (next) build(next.values, { focus: next.focus });
    }
  };

  /** Forget the current plan, e.g. when the city changes (a plan belongs to the city it was built for). */
  const reset = () => {
    setResult(null);
    setHazeView('plan');
    setErrors(null);
    setStatus('');
  };

  return { busy, errors, result, status, hazeView, setHazeView, shouldFocus, build, reset };
}

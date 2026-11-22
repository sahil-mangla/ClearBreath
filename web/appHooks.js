import { useCallback, useEffect, useRef, useState } from 'react';
import { getCities } from './api.js';
import { clearedDensity, densityFor } from './lib.js';
import { DEFAULTS, storedLang } from './settings.js';

/** @typedef {import('./types.js').PlanResult} PlanResult */
/** @typedef {import('./types.js').HazeView} HazeView */
/** @typedef {import('./types.js').FormValues} FormValues */

/** @type {import('./types.js').City[]} */
const FALLBACK_CITIES = [{ key: 'delhi', name: 'Delhi', state: 'Delhi' }];
const NO_READING_DENSITY = 0.55; // until the first live reading arrives

/** The city list for the picker; the single-city fallback keeps the page usable if the request fails. */
export function useCities() {
  const [cities, setCities] = useState(FALLBACK_CITIES);
  useEffect(() => {
    getCities()
      .then((d) => d.cities?.length && setCities(d.cities))
      .catch(() => {});
  }, []);
  return cities;
}

/**
 * Bring a fresh plan into view and move focus to its heading.
 * @param {PlanResult|null} result @param {() => boolean} shouldFocus @param {boolean} reduced
 */
export function useResultsFocus(result, shouldFocus, reduced) {
  const ref = useRef(/** @type {HTMLHeadingElement|null} */ (null));
  useEffect(() => {
    const el = ref.current;
    if (!result || !el || !shouldFocus()) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [result, reduced, shouldFocus]);
  return ref;
}

/** The form values and the language, which also keeps the document language honest for screen readers. */
export function useFormValues() {
  const [values, setValues] = useState(
    /** @returns {import('./types.js').FormValues} */ () => ({ ...DEFAULTS, lang: storedLang() }),
  );
  const set = useCallback(
    (/** @type {Partial<FormValues>} */ patch) => setValues((v) => ({ ...v, ...patch })),
    [],
  );
  useEffect(() => {
    document.documentElement.lang = values.lang;
  }, [values.lang]);
  return { values, set, setValues };
}

/**
 * The haze the page shows: the live reading, or what the plan would leave when the plan view is on.
 * @param {PlanResult|null} result @param {number|undefined} liveAqi @param {HazeView} hazeView
 */
export function hazeDensity(result, liveAqi, hazeView) {
  const aqi = result ? result.air.aqi : liveAqi;
  const base = Number.isFinite(aqi) ? densityFor(aqi) : NO_READING_DENSITY;
  const shown = result && hazeView === 'plan' ? clearedDensity(base, result.exposure.reductionPct) : base;
  return { base, shown };
}

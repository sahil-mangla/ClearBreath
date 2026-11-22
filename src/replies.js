import { HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS } from './aqi.js';

/** @typedef {import('./types.js').Aqi} Aqi */
/** @typedef {import('./types.js').Reading} Reading */
/** @typedef {import('./types.js').AirSummary} AirSummary */
/** @typedef {import('./types.js').AirDetail} AirDetail */

/**
 * The facts handed to Gemini: numbers and ids only, never free text from the user.
 * @param {{cityName:string, profile:import('./types.js').PlanProfile, aqi:Aqi, pm25:number,
 *   exposure:import('./types.js').Exposure, window:import('./types.js').ForecastWindow|null,
 *   plan:import('./types.js').Plan, actions:import('./types.js').Action[]}} input
 */
export function briefingFacts({ cityName, profile, aqi, pm25, exposure, window, plan, actions }) {
  return {
    city: cityName,
    lang: profile.lang,
    aqi: {
      value: aqi.value,
      category: LEVELS[aqi.levelIndex],
      dominantPollutant: aqi.dominant,
      pm25: Math.round(pm25),
    },
    household: {
      adults: profile.adults,
      children: profile.children,
      seniors: profile.seniors,
      conditions: profile.conditions,
      commute: profile.commute,
      cooking: profile.cooking,
      heating: profile.heating,
    },
    exposure: {
      todayAsUsual: exposure.baseline,
      withPlan: exposure.plan,
      reductionPct: exposure.reductionPct,
      whoGuideline: exposure.whoGuideline,
      indiaStandard: exposure.indiaStandard,
    },
    cleanestOutdoorHour: window
      ? { hour24: window.bestHour, pm25: window.bestPm25, day: window.bestDay }
      : null,
    co2SavedKgPerWeek: plan.totals.co2SavedKgPerWeek,
    candidateActions: actions.map((a) => ({ id: a.id, title: a.title })),
  };
}

/**
 * The air block every reply carries.
 * @param {{aqi:Aqi, data:Reading}} input
 * @returns {AirSummary}
 */
export function airSummary({ aqi, data }) {
  return {
    aqi: aqi.value,
    category: aqi.category,
    levelIndex: aqi.levelIndex,
    dominant: aqi.dominant,
    pm25: Math.round(data.pm25),
    observedAt: data.time,
    source: data.source,
  };
}

/**
 * The air block of a full plan: the summary plus the pollutant detail, health statement and a note.
 * @param {{aqi:Aqi, data:Reading, lang:string}} input
 * @returns {AirDetail}
 */
export function airDetail({ aqi, data, lang }) {
  return {
    ...airSummary({ aqi, data }),
    pm10: data.pm10 === null ? null : Math.round(data.pm10),
    healthImpact: (lang === 'hi' ? HEALTH_IMPACT_HI : HEALTH_IMPACT)[aqi.levelIndex],
    note: 'Modelled estimate using India CPCB AQI bands; may differ from nearby CPCB station readings.',
  };
}

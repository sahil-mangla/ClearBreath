import { HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS } from './aqi.js';

/** The facts handed to Gemini: numbers and ids only, never free text from the user. */
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

/** The air block of a reply; `detail` adds the fields only the full plan needs. */
export function airBlock({ aqi, data, lang, detail }) {
  const block = {
    aqi: aqi.value,
    category: aqi.category,
    levelIndex: aqi.levelIndex,
    dominant: aqi.dominant,
    pm25: Math.round(data.pm25),
    observedAt: data.time,
    source: data.source,
  };
  if (!detail) return block;
  return {
    ...block,
    pm10: data.pm10 === null ? null : Math.round(data.pm10),
    healthImpact: (lang === 'hi' ? HEALTH_IMPACT_HI : HEALTH_IMPACT)[aqi.levelIndex],
    note: 'Modelled estimate using India CPCB AQI bands; may differ from nearby CPCB station readings.',
  };
}

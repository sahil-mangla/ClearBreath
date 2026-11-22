/** @typedef {import('./helpers.js').PlanContext} PlanContext */

import { CITIES } from '../cities.js';
import { alertsFor } from './alerts.js';
import { alternativeActions, weeklyCo2Saved } from './alternatives.js';
import { POLLUTED, POOR, SMOG_MONTHS, STUBBLE_MONTHS, WORK_WEEKS_PER_YEAR } from './constants.js';
import { isVulnerable, istMonth, top } from './helpers.js';
import { indoorActions } from './indoor.js';
import { routineActions } from './routine.js';

/**
 * Everything the action builders need, computed once from the request.
 * @param {{levelIndex:number, pm25:number, profile:import('../types.js').PlanProfile,
 *   cityKey:import('../cities.js').CityKey, window:import('../types.js').ForecastWindow|null, now:Date}} input
 * @returns {PlanContext}
 */
function planContext({ levelIndex, pm25, profile, cityKey, window: forecast, now }) {
  const city = CITIES[cityKey];
  const month = istMonth(now);
  const smogRegion = city.region !== 'other';
  return {
    levelIndex,
    pm25,
    profile,
    forecast,
    city,
    polluted: levelIndex >= POLLUTED,
    poor: levelIndex >= POOR,
    vulnerable: isVulnerable(profile),
    smogSeason: smogRegion && SMOG_MONTHS.includes(month),
    stubbleSeason: (city.region === 'ncr' || city.region === 'north') && STUBBLE_MONTHS.includes(month),
    festivalSeason: STUBBLE_MONTHS.includes(month),
  };
}

/**
 * Build the personalised plan.
 * @param {{levelIndex:number, pm25:number, profile:import('../types.js').PlanProfile,
 *   cityKey:import('../cities.js').CityKey, window:import('../types.js').ForecastWindow|null, now?:Date}} args
 *   `levelIndex` is the 0-5 index into LEVELS, `pm25` the current reading in µg/m³ and `window` the result of
 *   bestWindow().
 * @returns {import('../types.js').Plan}
 */
export function buildPlan({ levelIndex, pm25, profile, cityKey, window: forecast, now = new Date() }) {
  const ctx = planContext({ levelIndex, pm25, profile, cityKey, window: forecast, now });
  const co2Week = weeklyCo2Saved(profile);
  return {
    routine: top(routineActions(ctx), 6),
    indoor: top(indoorActions(ctx), 6),
    alternatives: top(alternativeActions(ctx)),
    alerts: alertsFor(ctx),
    totals: { co2SavedKgPerWeek: co2Week, co2SavedKgPerYear: Math.round(co2Week * WORK_WEEKS_PER_YEAR) },
  };
}

/**
 * The three most important actions across the whole plan, most important first.
 * @param {import('../types.js').Plan} plan
 */
export const topActions = (plan) => top([...plan.routine, ...plan.indoor, ...plan.alternatives], 3);

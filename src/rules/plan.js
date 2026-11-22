import { CITIES } from '../cities.js';
import { alertsFor } from './alerts.js';
import { alternativeActions, weeklyCo2Saved } from './alternatives.js';
import { POLLUTED, POOR, SMOG_MONTHS, STUBBLE_MONTHS, WORK_WEEKS_PER_YEAR } from './constants.js';
import { isVulnerable, istMonth, top } from './helpers.js';
import { indoorActions } from './indoor.js';
import { routineActions } from './routine.js';

/** Everything the action builders need, computed once from the request. */
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
 * @param {object} args
 * @param {number} args.levelIndex   0-5 index into LEVELS
 * @param {number} args.pm25         current PM2.5 in µg/m³
 * @param {object} args.profile      validated household profile
 * @param {string} args.cityKey
 * @param {object|null} args.window  result of bestWindow()
 * @param {Date} [args.now]
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

/** The three most important actions across the whole plan, most important first. */
export const topActions = (plan) => top([...plan.routine, ...plan.indoor, ...plan.alternatives], 3);

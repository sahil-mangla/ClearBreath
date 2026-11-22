/** @typedef {import('./helpers.js').PlanContext} PlanContext */
/** @typedef {import('./helpers.js').Action} Action */

import { EMISSION_FACTORS, WORK_DAYS_PER_WEEK, WORK_WEEKS_PER_YEAR } from './constants.js';
import { act, round1, runBuilders } from './helpers.js';

/** Sustainable-alternative actions. Each builder takes the plan context and returns one action, or null. */

const MOTORISED = ['car', 'auto_cab', 'two_wheeler'];

/**
 * kg CO2 per week saved by moving a car or cab commute to metro or bus (0 for every other mode).
 * @param {import('../types.js').PlanProfile} profile
 * @returns {number} kg of CO2 saved per work week by moving a motorised commute to the metro or bus
 */
export function weeklyCo2Saved(profile) {
  if (profile.commute !== 'car' && profile.commute !== 'auto_cab') return 0;
  const perPassengerKm = EMISSION_FACTORS[profile.commute] - EMISSION_FACTORS.bus_metro;
  return round1(perPassengerKm * profile.commuteKm * 2 * WORK_DAYS_PER_WEEK);
}

/** @param {PlanContext} ctx */
function commuteAction({ profile }) {
  const km = profile.commuteKm;
  if (profile.commute === 'car' || profile.commute === 'auto_cab') {
    const week = weeklyCo2Saved(profile);
    return act(
      'a-commute',
      2,
      [
        'Swap to metro or bus, or carpool a few days a week',
        `Your ${km} km each-way trip is a good candidate. Shifting it to metro/bus, even on smog days ` +
          `only, cuts both tailpipe pollution and carbon.`,
        `Roughly ${week} kg CO2 per week (about ${Math.round(week * WORK_WEEKS_PER_YEAR)} kg per year) ` +
          `if you switch fully (approximate, per-passenger averages).`,
      ],
      { mode: profile.commute, km, week, year: Math.round(week * WORK_WEEKS_PER_YEAR) },
    );
  }
  if (profile.commute === 'two_wheeler') {
    return act(
      'a-commute',
      2,
      [
        'Consider an electric two-wheeler, or metro for long legs',
        'Electric scooters and bikes have no tailpipe PM or NOx, which matters most in dense streets. Metro for the longest part of your trip cuts both exposure and emissions.',
        'Zero tailpipe particulates; CO2 depends on the power grid but is typically lower per km.',
      ],
      { mode: 'two_wheeler' },
    );
  }
  // bus_metro, walk_cycle and wfh: already low-emission, so compare with driving the same distance alone.
  const avoided = round1(
    (EMISSION_FACTORS.car - EMISSION_FACTORS[profile.commute]) * km * 2 * WORK_DAYS_PER_WEEK,
  );
  return act(
    'a-commute',
    4,
    [
      'Keep it up: your commute is already low-emission',
      'You are already doing the best thing for the air. Encourage a colleague or neighbour to join you on bus, metro or on foot.',
      `Compared with driving the same ${km} km alone, you already avoid about ${avoided} kg CO2 a week.`,
    ],
    { mode: profile.commute, km, week: avoided },
  );
}

/** @param {PlanContext} ctx */
function idleAction({ profile }) {
  if (!MOTORISED.includes(profile.commute)) return null;
  return act('a-idle', 3, [
    'Switch the engine off when waiting',
    "At long red lights, railway crossings or while waiting for family, turn the engine off. Keep your vehicle's PUC (pollution check) valid and serviced.",
    'An idling engine gives off particulates and CO2 while going nowhere.',
  ]);
}

/** @param {PlanContext} ctx */
function warmthAction({ profile }) {
  if (profile.heating === 'electric') return null;
  return act('a-warm', 3, [
    'Stay warm without burning anything',
    'Layer up with thermal innerwear and wool, use insulated curtains, quilts and hot-water bottles, and keep a rug on cold floors. Use a thermostat-controlled electric heater only in the room in use.',
    'Replaces smoky sources of warmth, a common winter cause of both outdoor and indoor PM2.5.',
  ]);
}

/** @param {PlanContext} ctx */
function cookingAction({ profile }) {
  if (profile.cooking !== 'lpg' && profile.cooking !== 'biomass') return null;
  const biomass = profile.cooking === 'biomass';
  return act(
    'a-cook',
    4,
    [
      biomass ? 'Move up the clean-cooking ladder' : 'Add an induction cooktop for quick meals',
      biomass
        ? 'LPG or PNG is the next step; induction is cleaner still, especially if you have rooftop solar or a green-power plan.'
        : 'An induction hob for daily dal-chawal and tea means no combustion fumes indoors, and it pairs well with a solar-backed grid.',
      'Cuts combustion fumes in your kitchen and, with a cleaner grid, lowers your household carbon too.',
    ],
    { biomass },
  );
}

function wasteAction() {
  return act('a-waste', 3, [
    'Never burn leaves, garbage or plastic, and compost instead',
    'Open burning of leaves, rubbish and plastic is a notable winter source of fine particles and toxic fumes. Segregate waste, compost kitchen scraps and report open burning to your municipal body.',
    'Removes a local smoke source that releases fine particles and toxic gases right where people live and breathe.',
  ]);
}

function communityAction() {
  return act('a-rwa', 3, [
    'Take it to your RWA or community',
    'Propose heater provisions for security guards (who often burn wood for warmth), water sprinkling on dusty roads, covered construction sites, and a no-burning policy for the society.',
    "Neighbourhood-level changes lower air pollution for everyone, including people who can't afford purifiers.",
  ]);
}

/** @param {PlanContext} ctx */
function festiveAction({ festivalSeason }) {
  if (!festivalSeason) return null;
  return act('a-festive', 4, [
    'Celebrate festivals with lights, not crackers',
    'Diyas, LED lights, rangoli and sweets are great alternatives. Even "green" crackers still release particulates, and smog is already at its seasonal peak.',
    'Festival-night firecrackers are known to push PM2.5 sharply higher for hours, on top of seasonal smog.',
  ]);
}

/** @type {Array<(ctx: PlanContext) => Action | null>} */
const BUILDERS = [
  commuteAction,
  idleAction,
  warmthAction,
  cookingAction,
  wasteAction,
  communityAction,
  festiveAction,
];

/**
 * @param {PlanContext} ctx
 * @returns {Action[]}
 */
export const alternativeActions = (ctx) => runBuilders(BUILDERS, ctx);

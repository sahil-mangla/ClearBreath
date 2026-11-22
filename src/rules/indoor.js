/** @typedef {import('./helpers.js').PlanContext} PlanContext */
/** @typedef {import('./helpers.js').Action} Action */

import { act, fmtHour } from './helpers.js';

/** Indoor-air actions. Each builder takes the plan context and returns one action, or null when it does not apply. */

function heatingSafetyAction({ profile }) {
  if (profile.heating !== 'wood_coal') return null;
  return act(
    'i-heating-safety',
    1,
    'Never burn coal, wood or charcoal in a closed room',
    'Switch to an electric heater, oil-filled radiator or hot-water bottles, and use thermal wear and extra blankets. If you must use a sigri/angeethi, use it outdoors only.',
    'Removes a major indoor smoke source and avoids carbon-monoxide poisoning, which can be fatal in closed rooms.',
  );
}

function sealAction({ polluted }) {
  if (!polluted) return null;
  return act(
    'i-seal',
    1,
    'Keep windows and doors shut at peak hours',
    'Close up in the early morning, evening and night. Seal gaps with door sweeps or draught strips. A lived-in room closed up is far cleaner than an open one.',
    'Closed, sealed rooms typically hold indoor PM2.5 around 30-50% below outdoor levels (approximate; more with a purifier).',
  );
}

function ventilateAction({ forecast, polluted }) {
  if (!polluted) {
    return act(
      'i-ventilate',
      3,
      'Open windows for cross-ventilation',
      'Air quality is fine today, so ventilate freely.',
      'Dilutes indoor pollutants from cooking and cleaning.',
      { polluted: false },
    );
  }
  return act(
    'i-ventilate',
    3,
    forecast
      ? `Air the house briefly at ${fmtHour(forecast.bestHour)}`
      : 'Air the house briefly in the afternoon',
    'Open windows for 10-15 minutes in the cleanest part of the day, then close up again. This clears cooking fumes and CO2 without letting in the worst air.',
    'Stops the stale-air build-up that comes from keeping everything closed all day.',
    { polluted: true, hour: forecast ? forecast.bestHour : null },
  );
}

function purifierAction({ profile, polluted }) {
  if (profile.hasPurifier) {
    return act(
      'i-purifier',
      2,
      'Run your purifier on high in the room you use most',
      'Keep doors and windows closed while it runs, and place it away from walls and corners. Clean the pre-filter and replace the HEPA filter as per the manual.',
      'HEPA purifiers commonly reduce indoor PM2.5 by roughly 50-80% in a closed room.',
      { has: true },
    );
  }
  if (!polluted) return null;
  return act(
    'i-purifier',
    2,
    'Get a HEPA purifier, or build a Corsi-Rosenthal box',
    "Pick a unit with a clean-air delivery rate (CADR) of about two-thirds of the room's floor area in sq ft. A low-cost alternative is a Corsi-Rosenthal box: a box fan with four MERV-13 filters taped on.",
    'HEPA purifiers commonly reduce indoor PM2.5 by roughly 50-80% in a closed room; DIY boxes also work well.',
    { has: false },
  );
}

function cleanRoomTitle(profile) {
  if (profile.children > 0 && profile.seniors > 0) return 'Make one "clean room" for kids and elders';
  return profile.children > 0 ? 'Make a "clean room" for the kids' : 'Make a "clean room" for the vulnerable';
}

function cleanRoomAction({ profile, poor, vulnerable }) {
  if (!vulnerable || !poor) return null;
  return act(
    'i-clean-room',
    1,
    cleanRoomTitle(profile),
    'Pick one bedroom, keep it sealed, run the purifier there, and let it be the place for sleeping, homework and rest during smog spikes.',
    'Concentrates your purifier benefit where the most vulnerable lungs spend most hours, including 8+ hours of sleep.',
    { kids: profile.children > 0, elders: profile.seniors > 0 },
  );
}

function cookingAction({ profile }) {
  if (profile.cooking === 'biomass') {
    return act(
      'i-cooking',
      1,
      'Cook with the window open or an exhaust, and move to cleaner fuel',
      'Wood, dung and crop-residue chulhas are one of the biggest indoor smoke sources. Cook outdoors or in a ventilated space, and look at LPG (check PM Ujjwala Yojana eligibility), PNG or induction.',
      'The WHO lists clean cooking fuel as the single most effective fix for household air pollution.',
      { biomass: true },
    );
  }
  if (profile.cooking === 'lpg' || profile.cooking === 'png') {
    return act(
      'i-cooking',
      3,
      'Use the chimney or exhaust fan while cooking',
      'Frying and tadka produce lots of fine particles. Run the hood or exhaust fan during and 10 minutes after cooking, even in a closed-up house.',
      'Removes a large share of cooking particles before they spread through the home.',
      { biomass: false },
    );
  }
  return null;
}

function cleaningAction() {
  return act(
    'i-clean',
    4,
    "Wet-mop and damp-dust, don't dry-sweep",
    'Use a damp cloth or mop daily, and a HEPA vacuum if you have one. Skip incense, dhoop, mosquito coils and aerosol sprays on smoggy days.',
    'Dry sweeping stirs settled dust back into the air; damp cleaning keeps it down.',
  );
}

function plantsAction({ polluted }) {
  if (!polluted) return null;
  return act(
    'i-plants',
    5,
    "Don't rely on houseplants to clean the air",
    'Plants are lovely but studies suggest you would need an impractical number of them per room to match a purifier. Treat them as a bonus, not a filter.',
    'Saves you from a false sense of safety, so seal and filter first.',
  );
}

/** @type {Array<(ctx: PlanContext) => Action | null>} */
const BUILDERS = [
  heatingSafetyAction,
  sealAction,
  ventilateAction,
  purifierAction,
  cleanRoomAction,
  cookingAction,
  cleaningAction,
  plantsAction,
];

/** @param {PlanContext} ctx */
export const indoorActions = (ctx) => BUILDERS.map((build) => build(ctx)).filter(Boolean);

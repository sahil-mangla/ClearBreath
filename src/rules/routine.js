import { CONDITION_ADVICE, CONDITION_ORDER } from './constants.js';
import { act, fmtHour, needsMask } from './helpers.js';

/** Daily-routine actions. Each builder takes the plan context and returns one action, or null when it does not apply. */

function windowAction({ pm25, w: forecast, polluted }) {
  if (!forecast || !polluted) return null;
  // Compared with the air right now, not the day's worst hour.
  const gain = pm25 > 0 ? Math.round((1 - forecast.bestPm25 / pm25) * 100) : 0;
  if (gain < 10) return null;
  return act(
    'r-window',
    1,
    `Step out around ${fmtHour(forecast.bestHour)} (${forecast.bestDay})`,
    `Forecast PM2.5 is lowest near ${fmtHour(forecast.bestHour)} (${forecast.bestPm25} µg/m³) and highest near ${fmtHour(forecast.worstHour)} (${forecast.worstPm25} µg/m³). Schedule school runs, errands and walks in the cleaner window, and keep early-morning and late-evening outings short.`,
    `About ${gain}% less PM2.5 in the air you breathe during that outing (forecast model, approximate).`,
    {
      bestHour: forecast.bestHour,
      worstHour: forecast.worstHour,
      bestPm: forecast.bestPm25,
      worstPm: forecast.worstPm25,
      day: forecast.bestDay,
      gain,
    },
  );
}

function enjoyAction({ polluted }) {
  if (polluted) return null;
  return act(
    'r-enjoy',
    2,
    'Good day to get outside',
    'Air quality is acceptable. Open windows to flush indoor air, and enjoy walks or outdoor play.',
    'Fresh-air ventilation now helps dilute indoor pollutants that build up during smoggier days.',
  );
}

function maskAction({ L, p }) {
  if (!needsMask(L, p)) return null;
  return act(
    'r-mask',
    1,
    p.hasN95 ? 'Wear your N95 outdoors, every time' : 'Get a fitted N95/FFP2 mask for outdoor trips',
    p.hasN95
      ? 'Wear it snugly over nose and chin with no gaps. Replace it when it is damp, dirty or hard to breathe through. Cloth and surgical masks filter far less.'
      : 'Choose an N95/FFP2 (without an exhalation-valve gap) and check the seal. Cloth and surgical masks filter far less. Kids need a small-size mask that fits.',
    'Certified N95s capture at least 95% of fine particles in lab tests; with real-world fit expect roughly 80-90%.',
    { hasN95: p.hasN95 },
  );
}

function conditionsAction({ p, polluted }) {
  const conditions = CONDITION_ORDER.filter((c) => p.conditions.includes(c));
  if (!polluted || conditions.length === 0) return null;
  return act(
    'r-conditions',
    1,
    'Extra care for your health conditions',
    `${conditions.map((c) => CONDITION_ADVICE[c]).join(' ')} Follow your own doctor's advice first.`,
    'Fine-particle spikes are a known trigger for asthma and heart symptoms, so planning ahead lowers the chance of an emergency.',
    { conditions },
  );
}

function exerciseAction({ p, poor }) {
  if (!poor) return null;
  return act(
    'r-exercise',
    2,
    p.children > 0 ? "Move workouts and kids' play indoors" : 'Move workouts indoors',
    'Do yoga, skipping, stretching or stair-climbing at home. Ask the school to shift PE and assembly indoors on Poor or worse days.',
    'Hard exercise multiplies the air you breathe several times over resting, so an outdoor workout is a big extra dose of smog.',
    { kids: p.children > 0 },
  );
}

function peakHoursAction({ smogSeason }) {
  if (!smogSeason) return null;
  return act(
    'r-peak',
    3,
    'Avoid the early-morning and late-evening smog trap',
    'In North Indian winters, cold still air and low inversion layers typically hold smoke near the ground around dawn, dusk and night. Postpone morning walks until the sun has warmed the air.',
    'Typically the lowest-pollution hours are mid-afternoon, when the air mixes upward (check the forecast above).',
  );
}

function grapAction({ city, poor }) {
  if (city.region !== 'ncr' || !poor) return null;
  return act(
    'r-grap',
    3,
    'Follow GRAP restrictions',
    'Delhi-NCR runs the Graded Response Action Plan (GRAP) in smog season, with curbs on construction, diesel vehicles and more. Check CAQM announcements and comply (for example, avoid non-essential diesel trips).',
    "Community-wide compliance is what brings the whole region's PM2.5 down, protecting everyone, not only you.",
  );
}

/** [title, detail] for each commute mode. */
const COMMUTE_TIPS = {
  car: [
    'Keep windows up and set AC to recirculate',
    'Closed cabins block a lot of the particulate from traffic. Turn the engine off while waiting, and use the car only when needed.',
  ],
  auto_cab: [
    'In a cab keep windows up; in an auto-rickshaw wear an N95',
    'A closed cab cuts traffic fumes, but an auto-rickshaw is open to the road. Share rides where you can.',
  ],
  two_wheeler: [
    'Wear an N95, not a cloth mask, on the bike',
    'Two-wheeler riders are exposed to the full roadside air. Use a helmet visor, and avoid peak-traffic corridors if there is a quieter route.',
  ],
  bus_metro: [
    'Wear your N95 on platforms and at stops',
    'Metro carriages are usually cleaner than the street, but waiting at open stops is where the exposure happens.',
  ],
  walk_cycle: [
    'Take back lanes away from main roads',
    'Walk or cycle a street or two away from heavy traffic, and wear an N95 on Poor or worse days.',
  ],
  wfh: [
    'Staying remote is your biggest exposure win',
    'Spend your outdoor time in the cleanest window rather than at rush hour.',
  ],
};

function commuteAction({ p, polluted }) {
  if (!polluted && p.commute !== 'wfh') return null;
  const [title, detail] = COMMUTE_TIPS[p.commute];
  const impact =
    p.commute === 'wfh'
      ? 'Skips roughly 1-3 hours of roadside air a day.'
      : 'Roadside air is usually the most polluted air of your day, so small commute changes pay back the most.';
  return act('r-commute', 2, title, detail, impact, { mode: p.commute });
}

const BUILDERS = [
  windowAction,
  enjoyAction,
  maskAction,
  conditionsAction,
  exerciseAction,
  peakHoursAction,
  grapAction,
  commuteAction,
];

export const routineActions = (ctx) => BUILDERS.map((build) => build(ctx)).filter(Boolean);

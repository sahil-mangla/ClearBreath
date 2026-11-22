import { computeAqi } from '../aqi.js';
import {
  CABIN_FACTOR,
  CLOSED_CABIN,
  COMMUTE_SPEED,
  INDIA_PM25_24H,
  INDOOR_RATIO,
  MASK_FACTOR,
  POLLUTED,
  WHO_PM25_24H,
} from './constants.js';
import { needsMask, round1 } from './helpers.js';

const OTHER_OUTDOOR_HOURS = 1;
const MAX_COMMUTE_HOURS = 3;

const commuteHours = (profile) =>
  profile.commute === 'wfh'
    ? 0
    : Math.min(MAX_COMMUTE_HOURS, (profile.commuteKm * 2) / COMMUTE_SPEED[profile.commute]);

const percent = (ratio) => Math.round(ratio * 100);

function describeAssumptions({ commuteH, profile, polluted, masked }) {
  const baselineIndoor = percent(
    profile.hasPurifier ? INDOOR_RATIO.baselinePurifier : INDOOR_RATIO.baselineNone,
  );
  const planIndoor = percent(profile.hasPurifier ? INDOOR_RATIO.planPurifier : INDOOR_RATIO.planNone);
  const withPlan = polluted
    ? `With the plan: ${masked ? 'a fitted N95 outdoors (about 80% effective in real use), ' : ''}` +
      `outdoor errands in the cleanest forecast hour, windows shut at peak times and ` +
      `${profile.hasPurifier ? 'your purifier running' : 'a sealed room'} (indoor air about ${planIndoor}% of outdoor).`
    : 'With the plan: the air is acceptable today, so the plan changes little and your modelled exposure stays about the same.';
  return [
    `You spend about ${commuteH.toFixed(1)} h commuting, ${OTHER_OUTDOOR_HOURS} h on other outdoor errands, and the rest indoors.`,
    `Today as usual: no mask outdoors; indoor air is about ${baselineIndoor}% of outdoor levels.`,
    withPlan,
    'Simplified model for illustration. Real exposure varies with fit, ventilation and traffic.',
  ];
}

/**
 * Illustrative time-weighted PM2.5 exposure model: "today as usual" vs "following the plan".
 * Deliberately simple and transparent; every assumption is returned to the caller.
 */
export function estimateExposure({
  pm25,
  profile,
  window: forecast,
  levelIndex = computeAqi({ pm25 })?.levelIndex ?? 0,
}) {
  const commuteH = commuteHours(profile);
  const cabin = CLOSED_CABIN.has(profile.commute) ? CABIN_FACTOR : 1;
  const indoorH = Math.max(0, 24 - commuteH - OTHER_OUTDOOR_HOURS);

  // The plan only changes what the advice actually asks for: no mask, shut windows or timing on a clean day.
  const polluted = levelIndex >= POLLUTED;
  const masked = needsMask(levelIndex, profile);
  const bestPm = forecast && polluted ? Math.min(pm25, forecast.bestPm25) : pm25;
  const baselineIndoor = profile.hasPurifier ? INDOOR_RATIO.baselinePurifier : INDOOR_RATIO.baselineNone;
  const planIndoor = polluted
    ? profile.hasPurifier
      ? INDOOR_RATIO.planPurifier
      : INDOOR_RATIO.planNone
    : baselineIndoor;

  /** Time-weighted daily average: commute, other outdoor errands, then the hours indoors. */
  const dailyAverage = (commuteConc, otherConc, maskFactor, indoorRatio) =>
    (commuteH * commuteConc * cabin * (cabin === 1 ? maskFactor : 1) +
      OTHER_OUTDOOR_HOURS * otherConc * maskFactor +
      indoorH * pm25 * indoorRatio) /
    24;

  const baseline = dailyAverage(pm25, pm25, 1, baselineIndoor);
  const plan = dailyAverage(pm25, bestPm, masked ? MASK_FACTOR : 1, planIndoor);

  return {
    baseline: round1(baseline),
    plan: round1(plan),
    reductionPct: baseline > 0 ? Math.max(0, Math.round((1 - plan / baseline) * 100)) : 0,
    whoGuideline: WHO_PM25_24H,
    indiaStandard: INDIA_PM25_24H,
    inputs: { commuteH: round1(commuteH), hasPurifier: Boolean(profile.hasPurifier), polluted, masked },
    assumptions: describeAssumptions({ commuteH, profile, polluted, masked }),
  };
}

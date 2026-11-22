/**
 * Impact constants. All are approximate, typical-value estimates and are surfaced to the user
 * as such (see `assumptions` in the exposure output).
 */

/** kg CO2 per passenger-km (typical published averages; real values vary). */
export const EMISSION_FACTORS = Object.freeze({
  car: 0.17,
  auto_cab: 0.12,
  two_wheeler: 0.05,
  bus_metro: 0.035,
  walk_cycle: 0,
  wfh: 0,
});
export const WORK_DAYS_PER_WEEK = 5;
export const WORK_WEEKS_PER_YEAR = 48;

/** Door-to-door average speed in km/h used to estimate time spent commuting. */
export const COMMUTE_SPEED = { car: 20, auto_cab: 20, two_wheeler: 22, bus_metro: 18, walk_cycle: 8 };

/** Share of outdoor PM2.5 actually breathed in inside a closed AC cabin. */
export const CABIN_FACTOR = 0.5;
/** Share breathed in through a fitted N95 (about 80% effective in real use; the lab rating is 95% or more). */
export const MASK_FACTOR = 0.2;
/** Indoor PM2.5 as a share of outdoor, with and without a purifier, today as usual and following the plan. */
export const INDOOR_RATIO = { baselinePurifier: 0.5, baselineNone: 0.8, planPurifier: 0.3, planNone: 0.5 };

export const WHO_PM25_24H = 15; // µg/m³, WHO 2021 guideline
export const INDIA_PM25_24H = 60; // µg/m³, India NAAQS
export const PM25_GUIDELINES = { whoPm25_24h: WHO_PM25_24H, indiaPm25_24h: INDIA_PM25_24H };

/**
 * Only a car's closed cabin filters traffic air. 'auto_cab' covers open auto-rickshaws as well as cabs, so it
 * is modelled as open to avoid promising a benefit that auto riders do not get.
 */
export const CLOSED_CABIN = new Set(['car']);

/** Per-condition guidance, kept conservative: it supports a doctor's plan and never replaces one. */
export const CONDITION_ADVICE = Object.freeze({
  asthma:
    "Asthma: keep your reliever inhaler on you and follow your doctor's asthma action plan. Do not skip your regular medicines on smoggy days.",
  heart:
    'Heart condition: avoid exertion outdoors, take it easy on stairs and walks, and treat chest discomfort or unusual breathlessness as a reason to call your doctor.',
  pregnancy:
    'Pregnancy: keep outdoor time short, wear a well-fitted N95 when you must go out, and ask your doctor or midwife about smog days.',
});
export const CONDITION_ORDER = Object.keys(CONDITION_ADVICE);

/** Month indexes (0 = January) in which smog and crop-residue burning are expected. */
export const SMOG_MONTHS = [9, 10, 11, 0, 1];
export const STUBBLE_MONTHS = [9, 10];

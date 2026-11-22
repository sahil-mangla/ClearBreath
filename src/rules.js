/**
 * The recommendation engine. Everything here is deterministic: the same inputs always give the same plan.
 * This file is the public entry point; the work is split by concern under ./rules/.
 */
export { fallbackBriefing } from './rules/briefing.js';
export { CONDITION_ADVICE, EMISSION_FACTORS, PM25_GUIDELINES } from './rules/constants.js';
export { estimateExposure } from './rules/exposure.js';
export { fmtHour } from './rules/helpers.js';
export { buildPlan, topActions } from './rules/plan.js';

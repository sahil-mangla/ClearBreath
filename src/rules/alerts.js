/** @typedef {import('./helpers.js').PlanContext} PlanContext */
/** @typedef {{key:string, level:string, text:string}} Alert */

import { runBuilders } from './helpers.js';

/** Alert banners shown above the plan. Order: severe air, then carbon monoxide, stubble smoke, medical care. */

const SEVERE_TEXT =
  'Severe air quality: limit outdoor activity to essentials. People with asthma, heart disease, pregnancy, young children and elders should stay indoors with a purifier running.';
const VERY_POOR_TEXT =
  'Very poor air for sensitive people: keep outdoor time short, keep rescue medicines handy, and stay in your cleanest room.';

/** @param {PlanContext} ctx */
function airAlert({ levelIndex, poor, vulnerable }) {
  if (levelIndex < 4 && !(poor && vulnerable)) return null;
  return {
    key: levelIndex >= 5 ? 'severe' : 'verypoor',
    level: 'critical',
    text: levelIndex >= 5 ? SEVERE_TEXT : VERY_POOR_TEXT,
  };
}

/** @param {PlanContext} ctx */
function carbonMonoxideAlert({ profile }) {
  if (profile.heating !== 'wood_coal') return null;
  return {
    key: 'co',
    level: 'critical',
    text: 'Burning coal, wood or charcoal indoors can cause deadly carbon-monoxide poisoning. Never do this in a closed room.',
  };
}

/** @param {PlanContext} ctx */
function stubbleAlert({ stubbleSeason }) {
  if (!stubbleSeason) return null;
  return {
    key: 'stubble',
    level: 'info',
    text: 'It is crop-residue (stubble) burning season in Punjab and Haryana. When winds blow from the north-west, smoke can raise PM2.5 across Delhi-NCR and nearby cities for days.',
  };
}

/** @param {PlanContext} ctx */
function medicalAlert({ poor, vulnerable }) {
  if (!poor || !vulnerable) return null;
  return {
    key: 'medical',
    level: 'warning',
    text: 'Seek medical care promptly for breathing difficulty, wheezing that does not settle, chest pain, dizziness or unusual fatigue. This tool is not medical advice.',
  };
}

/** @type {Array<(ctx: PlanContext) => Alert | null>} */
const BUILDERS = [airAlert, carbonMonoxideAlert, stubbleAlert, medicalAlert];

/**
 * @param {PlanContext} ctx
 * @returns {Alert[]}
 */
export const alertsFor = (ctx) => runBuilders(BUILDERS, ctx);

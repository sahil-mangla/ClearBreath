import { POLLUTED, POOR } from './constants.js';

/**
 * @typedef {{id:string, priority:number, title:string, detail:string, impact:string, p:object}} Action
 * @typedef {{key:string, level:string, text:string}} Alert
 * @typedef {{levelIndex:number, pm25:number, profile:import('../validate.js').PlanProfile, forecast:object|null,
 *   city:object, polluted:boolean, poor:boolean, vulnerable:boolean, smogSeason:boolean, stubbleSeason:boolean,
 *   festivalSeason:boolean}} PlanContext what every action builder receives; built once per request in plan.js
 */

/** Small pure helpers shared by the rules modules. */

/** @returns {boolean} true when the household has a child, a senior or a listed health condition. */
export const isVulnerable = (profile) =>
  profile.children > 0 || profile.seniors > 0 || profile.conditions.length > 0;

/** The one rule that decides whether the plan recommends a mask, so the exposure model cannot disagree with it. */
export const needsMask = (levelIndex, profile) =>
  levelIndex >= POOR || (levelIndex >= POLLUTED && isVulnerable(profile));

/** Month (0-11) in India Standard Time. */
export const istMonth = (date) =>
  Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Asia/Kolkata' }).format(date)) - 1;

/** 24-hour clock hour to "2 pm". */
export function fmtHour(hour) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${suffix}`;
}

/** A ratio as a whole percentage, for explanatory text. */
export const percent = (ratio) => Math.round(ratio * 100);

/** Round to one decimal place. */
export const round1 = (n) => Math.round(n * 10) / 10;

/**
 * One recommendation. `p` (the `params` argument) holds the figures and variant flags the text was built from,
 * so the built-in Hindi catalogue (hi.js) can rebuild the same advice deterministically.
 * It is stripped before the response.
 * @returns {Action}
 */
export const act = (id, priority, title, detail, impact, params = {}) => ({
  id,
  priority,
  title,
  detail,
  impact,
  p: params,
});

/** The `n` highest-priority actions (lowest number first); ties keep their original order. */
export const top = (list, n = 5) => [...list].sort((a, b) => a.priority - b.priority).slice(0, n);

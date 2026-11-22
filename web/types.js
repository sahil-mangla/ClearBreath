/**
 * Shapes shared across the front end, written as JSDoc typedefs so `npm run typecheck` can check the
 * components against them. They describe the JSON the server sends (see src/handlers.js, src/replies.js).
 */

/** @typedef {{key:string, name:string, state:string, nameHi?:string, stateHi?:string}} City */

/** @typedef {{id:string, priority:number, title:string, detail:string, impact:string}} PlanAction */

/** @typedef {{level:string, text:string}} PlanAlert */

/**
 * @typedef {{baseline:number, plan:number, reductionPct:number, whoGuideline:number, indiaStandard:number,
 *   assumptions:string[]}} Exposure
 */

/**
 * The reply of POST /api/plan.
 * @typedef {{
 *   city: City,
 *   air: {aqi:number, category:string, levelIndex:number, healthImpact:string},
 *   exposure: Exposure,
 *   plan: {routine:PlanAction[], indoor:PlanAction[], alternatives:PlanAction[], alerts:PlanAlert[],
 *     totals:{co2SavedKgPerWeek:number, co2SavedKgPerYear:number}},
 *   briefing: {text:string, source:string, topActionIds:string[], lang:string},
 *   textLang: string,
 *   translation: string|null,
 *   disclaimer: string,
 * }} PlanResult
 */

/** What the form shows after a failed request: the stable code, the message, and the invalid field ids. */
/** @typedef {{code?:string, message:string, details?:string[], fields?:string[]}} RequestErrors */

/** @typedef {'usual'|'plan'} HazeView */

/** The live reading the hero shows, from GET /api/air. */
/**
 * @typedef {{aqi:number, levelIndex:number, category:string, pm25:number, dominant:string,
 *   observedAt?:string|null, source?:string}} LiveReading
 */
/** @typedef {{status:string, data:{air:LiveReading}|null, error:string}} LiveAir */

/** An Error carrying the server's reply: a stable `code`, the problem list and the invalid field ids. */
/** @typedef {Error & {code?:string, details?:string[], fields?:string[]}} ApiError */

export {};

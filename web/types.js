/**
 * Shapes shared across the front end, written as JSDoc typedefs so `npm run typecheck` can check the
 * components against them. They describe the JSON the server sends (see src/types.js).
 */

/** @typedef {{key:string, name:string, state:string, nameHi?:string, stateHi?:string}} City */

/** @typedef {import('../src/types.js').PublicAction} PlanAction */

/** @typedef {import('../src/types.js').PublicAlert} PlanAlert */

/** @typedef {import('../src/types.js').PublicExposure} Exposure */

/** The reply of POST /api/plan. The server declares it, in src/types.js, and `planReply` returns it. */
/** @typedef {import('../src/types.js').PlanReply} PlanResult */

/** What the form shows after a failed request: the stable code, the message, and the invalid field ids. */
/** @typedef {{code?:string, message:string, details?:string[], fields?:string[]}} RequestErrors */

/** @typedef {'usual'|'plan'} HazeView */

/** The smoke canvas's shared, mutable state: where the haze is heading, how thick it is now, and a wake-up. */
/** @typedef {{target:number, current:number, motion:boolean, boost:number, kick:() => void}} SmokeState */

/** The form's state: numbers stay strings while being typed; see DEFAULTS in settings.js. */
/**
 * @typedef {{city:string, adults:string, children:string, seniors:string, conditions:string[],
 *   commute:string, commuteKm:string, cooking:string, heating:string, hasPurifier:boolean, hasN95:boolean,
 *   lang:string, notes:string, manualPm25:string}} FormValues
 */

/** The form as its fields see it: the values, a way to change some, and whether a field is marked invalid. */
/** @typedef {{values:FormValues, set:(patch:Partial<FormValues>) => void, bad:(id:string) => boolean}} FormApi */
/** @typedef {'adults'|'children'|'seniors'|'commuteKm'|'manualPm25'} NumFieldId */
/** @typedef {'commute'|'cooking'|'heating'} PickFieldId */

/** The live reading the hero shows, from GET /api/air. */
/**
 * @typedef {{aqi:number, levelIndex:number, category:string, pm25:number, dominant:string,
 *   observedAt?:string|null, source?:string}} LiveReading
 */
/** @typedef {{status:string, data:{air:LiveReading}|null, error:string}} LiveAir */

/** An Error carrying the server's reply: a stable `code`, the problem list and the invalid field ids. */
/** @typedef {Error & {code?:string, details?:string[], fields?:string[]}} ApiError */

export {};

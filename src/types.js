/**
 * Shapes shared across the server, as JSDoc typedefs checked by `npm run typecheck`. Where a shape is the
 * JSON the page receives, web/types.js reuses it, so the server and the page cannot describe it differently.
 */

/** @typedef {import('./validate.js').PlanProfile} PlanProfile */
/** @typedef {import('./cities.js').CityKey} CityKey */
/** @typedef {import('./rules/helpers.js').Action} Action */
/** @typedef {import('./rules/helpers.js').Alert} Alert */
/** @typedef {import('./rules/helpers.js').PlanContext} PlanContext */

/** @typedef {import('node:http').IncomingMessage} Req */
/** @typedef {import('node:http').ServerResponse} Res */

/** The AQI for a reading: value on the 0-500 scale, its band and the pollutant that set it. */
/** @typedef {{value:number, levelIndex:number, category:string, dominant:'PM2.5'|'PM10'}} Aqi */

/** @typedef {{time:string, pm25:number}} HourlyReading local-time hour, like "2026-11-21T14:00" */

/**
 * One air reading: the live feed's, or the person's own (then `time` is null and there is no forecast).
 * @typedef {{pm25:number, pm10:number|null, time:string|null, hourly:HourlyReading[], source:string,
 *   stale?:boolean}} Reading
 */

/** The cleanest and dirtiest daytime hours of the next day. */
/**
 * @typedef {{bestHour:number, bestPm25:number, bestDay:string, worstHour:number, worstPm25:number,
 *   worstDay:string}} ForecastWindow
 */

/**
 * The exposure estimate. `inputs` is internal (it feeds the Hindi catalogue) and is dropped from replies.
 * @typedef {{baseline:number, plan:number, reductionPct:number, whoGuideline:number, indiaStandard:number,
 *   inputs:{commuteH:number, hasPurifier:boolean, polluted:boolean, masked:boolean},
 *   assumptions:string[]}} Exposure
 */
/** @typedef {Omit<Exposure, 'inputs'>} PublicExposure */

/**
 * The plan as built by the rules engine: the actions still carry their params `p` and the alerts their key.
 * @typedef {{routine:Action[], indoor:Action[], alternatives:Action[], alerts:Alert[],
 *   totals:{co2SavedKgPerWeek:number, co2SavedKgPerYear:number}}} Plan
 */

/** @typedef {{id:string, priority:number, title:string, detail:string, impact:string}} PublicAction */
/** @typedef {{level:string, text:string}} PublicAlert */
/**
 * The plan as sent to the page: the internal fields are gone.
 * @typedef {{routine:PublicAction[], indoor:PublicAction[], alternatives:PublicAction[],
 *   alerts:PublicAlert[], totals:Plan['totals']}} PublicPlan
 */

/** @typedef {{text:string, topActionIds:string[], source:string, lang?:string}} Briefing */

/** The air block of a reply, with the extra fields only the full plan needs in `AirDetail`. */
/**
 * @typedef {{aqi:number, category:string, levelIndex:number, dominant:string, pm25:number,
 *   observedAt:string|null, source:string}} AirSummary
 */
/** @typedef {AirSummary & {pm10:number|null, healthImpact:string, note:string}} AirDetail */

/**
 * The reply of POST /api/plan, as the page receives it.
 * @typedef {{
 *   city: {key:string, name:string, state:string, nameHi:string, stateHi:string},
 *   air: AirDetail,
 *   window: ForecastWindow|null,
 *   exposure: PublicExposure,
 *   plan: PublicPlan,
 *   briefing: Briefing & {lang:string},
 *   textLang: string,
 *   translation: string|null,
 *   generatedAt: string,
 *   disclaimer: string,
 * }} PlanReply
 */

/** The collaborators the request handlers are built from; tests pass fakes with the same shape. */
/** @typedef {ReturnType<typeof import('./airdata.js').createAirClient>} AirClient */
/** @typedef {ReturnType<typeof import('./llm.js').createLlm>} Llm */
/** @typedef {ReturnType<typeof import('./handlers/reading.js').createReadings>} Readings */

export {};

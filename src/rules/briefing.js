import { DEFAULT_LANG } from '../languages.js';
import { HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS, LEVELS_HI } from '../aqi.js';
import { topActions } from './plan.js';

/**
 * @param {string} s
 */
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * @param {{cityName:string, aqi:import('../types.js').Aqi, pm25:number, exposure:import('../types.js').Exposure}} input
 */
function hindiBriefing({ cityName, aqi, pm25, exposure }) {
  const reduction =
    exposure.reductionPct > 0
      ? `इस योजना पर चलने से आपके दैनिक PM2.5 संपर्क में लगभग ${exposure.reductionPct}% की कमी आ सकती है। `
      : 'अपनी अच्छी आदतें बनाए रखें। ';
  return (
    `${cityName} की हवा ${LEVELS_HI[aqi.levelIndex]} है (AQI ${aqi.value}, PM2.5 लगभग ${Math.round(pm25)} µg/m³)। ` +
    `${HEALTH_IMPACT_HI[aqi.levelIndex]} ${reduction}आज के सबसे ज़रूरी कदम नीचे चिह्नित हैं।`
  );
}

/**
 * @param {{cityName:string, aqi:import('../types.js').Aqi, pm25:number, exposure:import('../types.js').Exposure,
 *   picked:import('../types.js').Action[]}} input
 */
function englishBriefing({ cityName, aqi, pm25, exposure, picked }) {
  const reduction =
    exposure.reductionPct > 0
      ? `Following this plan could cut your estimated daily PM2.5 exposure by about ${exposure.reductionPct}%.`
      : 'Keep up your good habits.';
  return (
    `Air in ${cityName} is ${LEVELS[aqi.levelIndex]} (AQI ${aqi.value}, PM2.5 about ${Math.round(pm25)} µg/m³). ` +
    `${HEALTH_IMPACT[aqi.levelIndex]} ` +
    `Your top moves today: ${picked.map((a) => lowerFirst(a.title)).join('; ')}. ${reduction}`
  );
}

/**
 * Template briefing used when Gemini is unavailable. In Hindi the sentence is written in Hindi and does
 * not quote the action titles; it points to the marked top actions below instead.
 * The returned `lang` is the language the text is really in.
 * @param {{cityName:string, aqi:import('../types.js').Aqi, pm25:number, plan:import('../types.js').Plan,
 *   exposure:import('../types.js').Exposure, lang?:string}} input
 * @returns {import('../types.js').Briefing & {lang:string}}
 */
export function fallbackBriefing({ cityName, aqi, pm25, plan, exposure, lang = DEFAULT_LANG }) {
  const picked = topActions(plan);
  const topActionIds = picked.map((a) => a.id);
  const text =
    lang === 'hi'
      ? hindiBriefing({ cityName, aqi, pm25, exposure })
      : englishBriefing({ cityName, aqi, pm25, exposure, picked });
  return { text, topActionIds, source: 'rules', lang: lang === 'hi' ? 'hi' : DEFAULT_LANG };
}

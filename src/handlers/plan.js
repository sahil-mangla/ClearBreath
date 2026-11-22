import { bestWindow } from '../airdata.js';
import { CITIES } from '../cities.js';
import { applyTexts, builtinTexts, collectTexts, publicText } from '../hi.js';
import { readJson } from '../http.js';
import { DEFAULT_LANG } from '../languages.js';
import { airDetail, briefingFacts } from '../replies.js';
import { buildPlan, estimateExposure, fallbackBriefing, topActions } from '../rules.js';
import { translateTexts } from '../translate.js';
import { validatePlanInput } from '../validate.js';
import { badInput } from './errors.js';
import { aqiOrFail } from './reading.js';

/** @typedef {import('../types.js').PlanProfile} PlanProfile */
/** @typedef {import('../types.js').Aqi} Aqi */
/** @typedef {import('../types.js').Reading} Reading */
/** @typedef {import('../types.js').ForecastWindow} ForecastWindow */
/** @typedef {import('../types.js').Plan} Plan */
/** @typedef {import('../types.js').Exposure} Exposure */

const DISCLAIMER = 'General guidance, not medical advice. Impact figures are approximate estimates.';

/**
 * The briefing (Gemini, else the rules template) and the page text (Hindi from Gemini or built in).
 * @param {import('../types.js').Llm} llm
 * @param {{profile:PlanProfile, cityName:string, aqi:Aqi,
 *   data:Reading, window:ForecastWindow|null,
 *   thePlan:Plan, exposure:Exposure}} input
 */
async function narrate(llm, { profile, cityName, aqi, data, window, thePlan, exposure }) {
  const actions = [...thePlan.routine, ...thePlan.indoor, ...thePlan.alternatives];
  const facts = briefingFacts({
    cityName,
    profile,
    aqi,
    pm25: data.pm25,
    exposure,
    window,
    plan: thePlan,
    actions,
  });

  // Briefing and (for Hindi) the plan translation run side by side; each has a deterministic fallback.
  const english = collectTexts(thePlan, exposure, DISCLAIMER);
  const [generated, translated] = await Promise.all([
    llm.briefing({ facts, untrusted: { notes: profile.notes }, allowedIds: actions.map((a) => a.id) }),
    profile.lang === 'hi' ? translateTexts(llm, english, builtinTexts(thePlan, exposure)) : null,
  ]);
  const fallback = () =>
    fallbackBriefing({ cityName, aqi, pm25: data.pm25, plan: thePlan, exposure, lang: profile.lang });
  const chosen = generated ?? fallback();
  const topActionIds = chosen.topActionIds.length
    ? chosen.topActionIds
    : topActions(thePlan).map((a) => a.id);
  const briefing = { ...chosen, topActionIds };

  // The page text: Hindi from Gemini or the built-in catalogue, otherwise English. Internal fields are dropped.
  const view = translated
    ? applyTexts(thePlan, exposure, translated.texts)
    : publicText(thePlan, exposure, DISCLAIMER);
  return { briefing, translated, view };
}

/**
 * The reply to POST /api/plan, as the page receives it (see `PlanResult` in web/types.js).
 * @param {{profile:PlanProfile, city:{name:string, state:string, nameHi:string, stateHi:string},
 *   aqi:Aqi, data:Reading, window:ForecastWindow|null,
 *   when:Date, narration:Awaited<ReturnType<typeof narrate>>}} input
 * @returns {import('../types.js').PlanReply}
 */
function planReply({ profile, city, aqi, data, window, when, narration }) {
  const { briefing, translated, view } = narration;
  return {
    city: {
      key: profile.city,
      name: city.name,
      state: city.state,
      nameHi: city.nameHi,
      stateHi: city.stateHi,
    },
    air: airDetail({ aqi, data, lang: profile.lang }),
    window,
    exposure: view.exposure,
    plan: view.plan,
    briefing: { ...briefing, lang: briefing.lang ?? profile.lang }, // the language the text is really in
    textLang: translated ? 'hi' : DEFAULT_LANG, // the language of the plan, alerts, assumptions, disclaimer
    translation: translated ? translated.source : null, // 'gemini' | 'builtin' | 'mixed' when textLang is hi
    generatedAt: when.toISOString(),
    disclaimer: view.disclaimer,
  };
}

/**
 * POST /api/plan: validate, fetch the reading, compute the plan, narrate it, reply.
 * @param {{readings:import('../types.js').Readings, llm:import('../types.js').Llm, now:() => Date}} deps
 */
export function createPlanHandler({ readings, llm, now }) {
  /** @param {import('../types.js').Req} req @param {import('../types.js').Res} res */
  return async function plan(req, res) {
    const parsed = validatePlanInput(await readJson(req, res));
    if (!parsed.ok) throw badInput(parsed);
    const profile = parsed.value;
    const city = CITIES[profile.city];
    const cityName = profile.lang === 'hi' ? city.nameHi : city.name; // the name as written in the reply language

    const data = await readings.airFor(profile.city, profile.manualPm25);
    const aqi = aqiOrFail(data);
    const window = data.time ? bestWindow(data.hourly, data.time) : null;
    const when = now();
    const thePlan = buildPlan({
      levelIndex: aqi.levelIndex,
      pm25: data.pm25,
      profile,
      cityKey: profile.city,
      window,
      now: when,
    });
    const exposure = estimateExposure({ pm25: data.pm25, profile, window, levelIndex: aqi.levelIndex });
    const narration = await narrate(llm, { profile, cityName, aqi, data, window, thePlan, exposure });
    return planReply({ profile, city, aqi, data, window, when, narration });
  };
}

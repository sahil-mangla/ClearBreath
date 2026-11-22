import { CITIES, isCity } from './cities.js';
import { computeAqi, HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS } from './aqi.js';
import { bestWindow } from './airdata.js';
import { HttpError, readJson } from './http.js';
import { applyTexts, builtinTexts, collectTexts, publicText } from './hi.js';
import { buildPlan, estimateExposure, fallbackBriefing, topActions, PM25_GUIDELINES } from './rules.js';
import { translateTexts } from './translate.js';
import { fieldsOf, validateAskInput, validatePlanInput } from './validate.js';

const DISCLAIMER = 'General guidance, not medical advice. Impact figures are approximate estimates.';

const badInput = (errors) =>
  new HttpError(400, 'Please fix the highlighted inputs.', {
    code: 'bad_input',
    details: errors,
    fields: fieldsOf(errors),
  });

/** The facts handed to Gemini: numbers and ids only, never free text from the user. */
function briefingFacts({ cityName, profile, aqi, pm25, exposure, window, plan, actions }) {
  return {
    city: cityName,
    lang: profile.lang,
    aqi: {
      value: aqi.value,
      category: LEVELS[aqi.levelIndex],
      dominantPollutant: aqi.dominant,
      pm25: Math.round(pm25),
    },
    household: {
      adults: profile.adults,
      children: profile.children,
      seniors: profile.seniors,
      conditions: profile.conditions,
      commute: profile.commute,
      cooking: profile.cooking,
      heating: profile.heating,
    },
    exposure: {
      todayAsUsual: exposure.baseline,
      withPlan: exposure.plan,
      reductionPct: exposure.reductionPct,
      whoGuideline: exposure.whoGuideline,
      indiaStandard: exposure.indiaStandard,
    },
    cleanestOutdoorHour: window
      ? { hour24: window.bestHour, pm25: window.bestPm25, day: window.bestDay }
      : null,
    co2SavedKgPerWeek: plan.totals.co2SavedKgPerWeek,
    candidateActions: actions.map((a) => ({ id: a.id, title: a.title })),
  };
}

/** The air block of a reply; `detail` adds the fields only the full plan needs. */
function airBlock({ aqi, data, lang, detail }) {
  const block = {
    aqi: aqi.value,
    category: aqi.category,
    levelIndex: aqi.levelIndex,
    dominant: aqi.dominant,
    pm25: Math.round(data.pm25),
    observedAt: data.time,
    source: data.source,
  };
  if (!detail) return block;
  return {
    ...block,
    pm10: data.pm10 === null ? null : Math.round(data.pm10),
    healthImpact: (lang === 'hi' ? HEALTH_IMPACT_HI : HEALTH_IMPACT)[aqi.levelIndex],
    note: 'Modelled estimate using India CPCB AQI bands; may differ from nearby CPCB station readings.',
  };
}

/** The three endpoints that do real work. Dependencies are passed in so tests can fake them. */
export function createHandlers({ air, llm, now }) {
  async function airFor(cityKey, manualPm25) {
    if (manualPm25 !== null && manualPm25 !== undefined) {
      return { pm25: manualPm25, pm10: null, time: null, hourly: [], source: 'Entered by you' };
    }
    try {
      return await air.get(cityKey);
    } catch (err) {
      console.error(`[air] upstream failure: ${err?.message}`);
      throw new HttpError(
        502,
        'Live air-quality data is unavailable right now. You can enter a PM2.5 reading manually and try again.',
        { code: 'air_unavailable' },
      );
    }
  }

  function aqiOrFail(data) {
    const aqi = computeAqi({ pm25: data.pm25, pm10: data.pm10 });
    if (!aqi)
      throw new HttpError(502, 'Could not compute an air-quality index from the data received.', {
        code: 'aqi_failed',
      });
    return aqi;
  }

  async function plan(req, res) {
    const parsed = validatePlanInput(await readJson(req, res));
    if (!parsed.ok) throw badInput(parsed.errors);
    const profile = parsed.value;
    const city = CITIES[profile.city];
    const cityName = profile.lang === 'hi' ? city.nameHi : city.name; // the name as written in the reply language

    const data = await airFor(profile.city, profile.manualPm25);
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
    const briefing =
      generated ??
      fallbackBriefing({ cityName, aqi, pm25: data.pm25, plan: thePlan, exposure, lang: profile.lang });
    if (briefing.topActionIds.length === 0) briefing.topActionIds = topActions(thePlan).map((a) => a.id);

    // The page text: Hindi from Gemini or the built-in catalogue, otherwise English. Internal fields are dropped.
    const view = translated
      ? applyTexts(thePlan, exposure, translated.texts)
      : publicText(thePlan, exposure, DISCLAIMER);

    return {
      city: {
        key: profile.city,
        name: city.name,
        state: city.state,
        nameHi: city.nameHi,
        stateHi: city.stateHi,
      },
      air: airBlock({ aqi, data, lang: profile.lang, detail: true }),
      window,
      exposure: view.exposure,
      plan: view.plan,
      briefing: { ...briefing, lang: briefing.lang ?? profile.lang }, // the language the text is really in
      textLang: translated ? 'hi' : 'en', // the language of the plan, alerts, assumptions and disclaimer
      translation: translated ? translated.source : null, // 'gemini' | 'builtin' | 'mixed' when textLang is hi
      generatedAt: when.toISOString(),
      disclaimer: view.disclaimer,
    };
  }

  /** Lightweight live reading for the hero: current AQI only (cached upstream, 10 min). */
  async function airNow(url) {
    const cityKey = url.searchParams.get('city') ?? '';
    if (!isCity(cityKey)) throw new HttpError(400, 'Please choose a supported city.', { code: 'bad_city' });
    const data = await airFor(cityKey, null);
    const aqi = aqiOrFail(data);
    return {
      city: { key: cityKey, name: CITIES[cityKey].name, nameHi: CITIES[cityKey].nameHi },
      air: airBlock({ aqi, data, lang: 'en', detail: false }),
    };
  }

  async function ask(req, res) {
    const parsed = validateAskInput(await readJson(req, res));
    if (!parsed.ok) throw badInput(parsed.errors);
    if (!llm.enabled) {
      throw new HttpError(
        503,
        'The AI assistant is not configured on this server. The personalised plan above still works.',
        { code: 'ask_off' },
      );
    }

    const { city: cityKey, question, lang } = parsed.value;
    /** @type {{value:number, category:string, pm25:number}|null} */
    let aqiFacts = null;
    try {
      const data = await air.get(cityKey);
      const aqi = computeAqi(data);
      if (aqi) aqiFacts = { value: aqi.value, category: aqi.category, pm25: Math.round(data.pm25) };
    } catch {
      /* answer without live context */
    }
    const answer = await llm.answer({
      facts: { city: CITIES[cityKey].name, lang, aqi: aqiFacts, guidelines: PM25_GUIDELINES },
      untrusted: { question },
    });
    if (!answer)
      throw new HttpError(502, 'The AI assistant could not answer right now. Please try again.', {
        code: 'ask_failed',
      });
    return { answer, lang };
  }

  return { plan, airNow, ask };
}

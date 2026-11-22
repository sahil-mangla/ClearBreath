import { ACTIONS_HI } from './hi/actions.js';
import { hiHour, hiHours } from './hi/phrases.js';
import { MASK_FACTOR } from './rules/constants.js';
import { indoorRatio, OTHER_OUTDOOR_HOURS } from './rules/exposure.js';
import { percent } from './rules/helpers.js';

/**
 * Built-in Hindi for everything the rules engine writes. It is the deterministic backup behind Gemini:
 * a pure function of each action's id and parameters (`p`), so the same plan always gives the same
 * Hindi, with no network and no key. The English source of truth stays in src/rules/; test/backend/hi.test.js
 * checks that every action the rules engine can produce has a Hindi entry carrying the same figures.
 */

export const DISCLAIMER_HI = 'सामान्य मार्गदर्शन है, चिकित्सकीय सलाह नहीं। असर के आँकड़े अनुमानित हैं।';

/**
 * alert key -> Hindi text
 * @type {Record<string, string>}
 */
const ALERTS_HI = {
  co: 'घर के अंदर कोयला, लकड़ी या चारकोल जलाने से जानलेवा कार्बन मोनोऑक्साइड विषाक्तता हो सकती है। बंद कमरे में ऐसा कभी न करें।',
  stubble:
    'यह पंजाब और हरियाणा में पराली (फ़सल अवशेष) जलाने का मौसम है। जब हवाएँ उत्तर-पश्चिम से चलती हैं, तो धुआँ दिल्ली-NCR और आसपास के शहरों में कई दिनों तक PM2.5 बढ़ा सकता है।',
  severe:
    'गंभीर वायु गुणवत्ता: बाहर की गतिविधि सिर्फ़ ज़रूरी कामों तक सीमित रखें। अस्थमा, हृदय रोग वाले, गर्भवती महिलाएँ, छोटे बच्चे और बुज़ुर्ग प्यूरीफ़ायर चलाकर घर के अंदर रहें।',
  verypoor:
    'संवेदनशील लोगों के लिए बहुत खराब हवा: बाहर का समय कम रखें, इनहेलर जैसी तुरंत राहत देने वाली दवाएँ पास रखें, और अपने सबसे साफ़ कमरे में रहें।',
  medical:
    'साँस लेने में कठिनाई, ठीक न होने वाली घरघराहट, सीने में दर्द, चक्कर या असामान्य थकान हो तो तुरंत डॉक्टर को दिखाएँ। यह टूल चिकित्सकीय सलाह नहीं है।',
};

/** @param {import('./types.js').Exposure['inputs']} inputs */
function assumptionsHi({ commuteH, hasPurifier, polluted, masked }) {
  const maskNote = masked ? `बाहर सही फ़िट वाला N95 (असल में लगभग ${percent(1 - MASK_FACTOR)}% असरदार), ` : '';
  const room = hasPurifier ? 'आपका प्यूरीफ़ायर चालू' : 'बंद कमरा';
  const withPlan = polluted
    ? `योजना के साथ: ${maskNote}बाहर के काम सबसे साफ़ पूर्वानुमान वाले घंटे में, ` +
      `पीक समय में खिड़कियाँ बंद और ${room} ` +
      `(घर के अंदर की हवा बाहर की लगभग ${percent(indoorRatio({ hasPurifier }, true))}%)।`
    : 'योजना के साथ: आज हवा ठीक है, इसलिए योजना से ज़्यादा फ़र्क़ नहीं पड़ता और आपका अनुमानित संपर्क लगभग वही रहता है।';
  return [
    `आप लगभग ${commuteH.toFixed(1)} घंटे आने-जाने में, ${hiHours(OTHER_OUTDOOR_HOURS)} बाहर के अन्य कामों ` +
      `में और बाकी समय घर के अंदर बिताते हैं।`,
    `आज हमेशा की तरह: बाहर मास्क नहीं; घर के अंदर की हवा बाहर के स्तर की लगभग ` +
      `${percent(indoorRatio({ hasPurifier }, false))}% रहती है।`,
    withPlan,
    'यह चित्रण के लिए सरल मॉडल है। असल संपर्क मास्क की फ़िटिंग, वेंटिलेशन और ट्रैफ़िक के साथ बदलता है।',
  ];
}

const GROUPS = /** @type {const} */ (['routine', 'indoor', 'alternatives']);

/**
 * Every server-written string of a plan, as one flat list in a fixed order: action titles, details and
 * impacts per group, then alerts, then the exposure assumptions, then the disclaimer.
 * Gemini translates this list and the built-in catalogue below produces the same shape, so either can
 * be handed to `applyTexts`.
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').Exposure} exposure
 * @param {string} disclaimer
 * @returns {string[]}
 */
export function collectTexts(plan, exposure, disclaimer) {
  const texts = [];
  for (const g of GROUPS) for (const a of plan[g]) texts.push(a.title, a.detail, a.impact);
  for (const a of plan.alerts) texts.push(a.text);
  texts.push(...exposure.assumptions, disclaimer);
  return texts;
}

/**
 * The built-in Hindi for the same list `collectTexts` returns, or null if any action has no entry.
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').Exposure} exposure
 * @returns {string[]|null}
 */
export function builtinTexts(plan, exposure) {
  const texts = [];
  for (const g of GROUPS) {
    for (const a of plan[g]) {
      const make = ACTIONS_HI[a.id];
      if (!make) return null;
      texts.push(...make(a.p ?? {}));
    }
  }
  for (const a of plan.alerts) {
    if (!ALERTS_HI[a.key]) return null;
    texts.push(ALERTS_HI[a.key]);
  }
  texts.push(...assumptionsHi(exposure.inputs), DISCLAIMER_HI);
  return texts;
}

/**
 * Rebuild the plan, exposure and disclaimer around a translated list (same order and length as
 * `collectTexts`). Returns new objects, and drops the internal params `p` and alert keys.
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').Exposure} exposure
 * @param {string[]} texts
 * @returns {{plan:import('./types.js').PublicPlan, exposure:import('./types.js').PublicExposure, disclaimer:string}}
 */
export function applyTexts(plan, exposure, texts) {
  let i = 0;
  const next = () => texts[i++];
  const [routine, indoor, alternatives] = GROUPS.map((g) =>
    plan[g].map((a) => ({
      id: a.id,
      priority: a.priority,
      title: next(),
      detail: next(),
      impact: next(),
    })),
  );
  const alerts = plan.alerts.map((a) => ({ level: a.level, text: next() }));
  const assumptions = exposure.assumptions.map(() => next());
  const disclaimer = next();
  const { inputs: _internal, ...publicExposure } = exposure; // `inputs` is internal, for the Hindi catalogue only
  return {
    plan: { ...plan, routine, indoor, alternatives, alerts },
    exposure: { ...publicExposure, assumptions },
    disclaimer,
  };
}

/**
 * The same plan with only the internal fields removed, for the English response.
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').Exposure} exposure
 * @param {string} disclaimer
 */
export function publicText(plan, exposure, disclaimer) {
  return applyTexts(plan, exposure, collectTexts(plan, exposure, disclaimer));
}

export { hiHour };

import { CITIES } from '../cities.js';
import { HttpError, readJson } from '../http.js';
import { PM25_GUIDELINES } from '../rules.js';
import { validateAskInput } from '../validate.js';
import { badInput } from './errors.js';
import { aqiOrFail } from './reading.js';

/**
 * The live AQI facts for a question, or null when the reading is unavailable (not fatal: still answerable).
 * @param {import('../types.js').Readings} readings
 * @param {import('../types.js').CityKey} cityKey
 */
async function liveFacts(readings, cityKey) {
  try {
    const data = await readings.airFor(cityKey, null);
    const aqi = aqiOrFail(data);
    return { value: aqi.value, category: aqi.category, pm25: Math.round(data.pm25) };
  } catch (err) {
    console.error(`[ask] answering without live air data: ${err?.message}`);
    return null;
  }
}

/**
 * POST /api/ask: a free-text question answered from the same facts as the plan.
 * @param {{readings:import('../types.js').Readings, llm:import('../types.js').Llm}} deps
 */
export function createAskHandler({ readings, llm }) {
  /** @param {import('../types.js').Req} req @param {import('../types.js').Res} res */
  return async function ask(req, res) {
    const parsed = validateAskInput(await readJson(req, res));
    if (!parsed.ok) throw badInput(parsed);
    if (!llm.enabled) {
      throw new HttpError(
        503,
        'The AI assistant is not configured on this server. The personalised plan above still works.',
        { code: 'ask_off' },
      );
    }

    const { city: cityKey, question, lang } = parsed.value;
    const answer = await llm.answer({
      facts: {
        city: CITIES[cityKey].name,
        lang,
        aqi: await liveFacts(readings, cityKey),
        guidelines: PM25_GUIDELINES,
      },
      untrusted: { question },
    });
    if (!answer) {
      throw new HttpError(502, 'The AI assistant could not answer right now. Please try again.', {
        code: 'ask_failed',
      });
    }
    return { answer, lang };
  };
}

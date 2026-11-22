import { CITIES, isCity } from './cities.js';
import { HttpError } from './http.js';
import { airSummary } from './replies.js';
import { createAskHandler } from './handlers/ask.js';
import { createPlanHandler } from './handlers/plan.js';
import { aqiOrFail, createReadings } from './handlers/reading.js';

/**
 * The three endpoints that do real work. Dependencies are passed in so tests can fake them.
 * @param {{air:import('./types.js').AirClient, llm:import('./types.js').Llm, now:() => Date}} deps
 */
export function createHandlers({ air, llm, now }) {
  const readings = createReadings(air);

  /**
   * Lightweight live reading for the hero: current AQI only (cached upstream, 10 min).
   * @param {URL} url
   */
  async function airNow(url) {
    const cityKey = url.searchParams.get('city') ?? '';
    if (!isCity(cityKey)) throw new HttpError(400, 'Please choose a supported city.', { code: 'bad_city' });
    const data = await readings.airFor(cityKey, null);
    const aqi = aqiOrFail(data);
    return {
      city: { key: cityKey, name: CITIES[cityKey].name, nameHi: CITIES[cityKey].nameHi },
      air: airSummary({ aqi, data }),
    };
  }

  return {
    plan: createPlanHandler({ readings, llm, now }),
    airNow,
    ask: createAskHandler({ readings, llm }),
  };
}

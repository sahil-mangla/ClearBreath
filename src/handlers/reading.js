import { computeAqi } from '../aqi.js';
import { HttpError } from '../http.js';

/**
 * The air reading for a city: the person's own PM2.5 if they typed one, else the live feed.
 * @param {import('../types.js').AirClient} air
 */
export function createReadings(air) {
  return {
    /**
     * @param {import('../cities.js').CityKey} cityKey
     * @param {number|null|undefined} manualPm25 the person's own reading, when they typed one
     * @returns {Promise<import('../types.js').Reading>}
     */
    async airFor(cityKey, manualPm25) {
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
    },
  };
}

/**
 * The AQI for a reading, or a 502 when it cannot be computed.
 * @param {{pm25:number, pm10:number|null}} data
 * @returns {import('../types.js').Aqi}
 */
export function aqiOrFail(data) {
  const aqi = computeAqi({ pm25: data.pm25, pm10: data.pm10 });
  if (!aqi) {
    throw new HttpError(502, 'Could not compute an air-quality index from the data received.', {
      code: 'aqi_failed',
    });
  }
  return aqi;
}

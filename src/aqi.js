/**
 * India National AQI (CPCB) sub-index calculation for PM2.5 and PM10.
 * Note: CPCB uses 24-hour averages; we apply the same breakpoints to the current
 * modelled concentration, so the result is an approximation.
 */

export const LEVELS = Object.freeze(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']);

// [concLow, concHigh, indexLow, indexHigh]
const PM25_BANDS = [
  [0, 30, 0, 50],
  [30, 60, 50, 100],
  [60, 90, 100, 200],
  [90, 120, 200, 300],
  [120, 250, 300, 400],
  [250, 380, 400, 500],
];
const PM10_BANDS = [
  [0, 50, 0, 50],
  [50, 100, 50, 100],
  [100, 250, 100, 200],
  [250, 350, 200, 300],
  [350, 430, 300, 400],
  [430, 510, 400, 500],
];

/** CPCB health statements, paraphrased per category. */
export const HEALTH_IMPACT = Object.freeze([
  'Minimal impact on health.',
  'May cause minor breathing discomfort to sensitive people.',
  'May cause breathing discomfort to people with lung or heart disease, children and older adults.',
  'May cause breathing discomfort to most people on prolonged exposure.',
  'May cause respiratory illness on prolonged exposure.',
  'Affects healthy people and seriously affects those with existing diseases.',
]);

export const LEVELS_HI = Object.freeze(['अच्छा', 'संतोषजनक', 'मध्यम', 'खराब', 'बहुत खराब', 'गंभीर']);

export const HEALTH_IMPACT_HI = Object.freeze([
  'स्वास्थ्य पर न्यूनतम प्रभाव।',
  'संवेदनशील लोगों को साँस लेने में हल्की असुविधा हो सकती है।',
  'फेफड़ों या हृदय के रोगियों, बच्चों और बुज़ुर्गों को साँस लेने में असुविधा हो सकती है।',
  'ज़्यादा देर संपर्क में रहने पर ज़्यादातर लोगों को साँस लेने में असुविधा हो सकती है।',
  'ज़्यादा देर संपर्क में रहने पर साँस की बीमारी हो सकती है।',
  'स्वस्थ लोगों पर असर पड़ता है और पहले से बीमार लोगों पर गंभीर असर पड़ता है।',
]);

function subIndex(conc, bands) {
  if (typeof conc !== 'number' || !Number.isFinite(conc) || conc < 0) return null;
  for (const [lo, hi, iLo, iHi] of bands) {
    if (conc <= hi) return Math.round(iLo + ((iHi - iLo) * (conc - lo)) / (hi - lo));
  }
  return 500;
}

/** The CPCB bands on the 0-500 scale, in LEVELS order. The one definition the server and the page both use. */
export const BANDS = Object.freeze(
  LEVELS.map((name, i) => {
    const to = [50, 100, 200, 300, 400, 500][i];
    return Object.freeze({ name, from: i === 0 ? 0 : [50, 100, 200, 300, 400][i - 1] + 1, to });
  }),
);
export const SCALE_MAX = 500;

/** Map an AQI value (0-500) to a LEVELS index. */
export function levelIndexFor(value) {
  const i = BANDS.findIndex((b) => value <= b.to);
  return i === -1 ? BANDS.length - 1 : i;
}

/**
 * @param {{pm25?: number|null, pm10?: number|null}} conc  µg/m³
 * @returns {{value:number, levelIndex:number, category:string, dominant:'PM2.5'|'PM10'}|null}
 */
export function computeAqi({ pm25, pm10 }) {
  const a = subIndex(pm25, PM25_BANDS);
  const b = subIndex(pm10, PM10_BANDS);
  if (a === null && b === null) return null;
  const useA = b === null || (a !== null && a >= b);
  const value = /** @type {number} */ (useA ? a : b);
  const levelIndex = levelIndexFor(value);
  return { value, levelIndex, category: LEVELS[levelIndex], dominant: useA ? 'PM2.5' : 'PM10' };
}

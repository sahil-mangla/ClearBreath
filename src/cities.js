/**
 * Allow-list of supported Indian cities. Using a fixed list (instead of free-text
 * geocoding) keeps outbound requests bounded and removes injection / SSRF surface.
 *
 * region: 'ncr' (Delhi-NCR), 'north' (Punjab/Haryana/Chandigarh/Agra/Rajasthan belt),
 *         'igp' (rest of the Indo-Gangetic plain), 'other'.
 */
/** @typedef {'ncr'|'north'|'igp'|'other'} Region */
/** @typedef {keyof typeof CITIES} CityKey */
/** @typedef {ReturnType<typeof city>} CityInfo */

/**
 * A city from its table row: name, state, Hindi name, Hindi state, latitude, longitude, region.
 * @param {[string, string, string, string, number, number, Region]} row
 */
const city = ([name, state, nameHi, stateHi, lat, lon, region]) => ({
  name,
  state,
  nameHi,
  stateHi,
  lat,
  lon,
  region,
});

export const CITIES = Object.freeze({
  delhi: city(['Delhi', 'Delhi', 'दिल्ली', 'दिल्ली', 28.6139, 77.209, 'ncr']),
  noida: city(['Noida', 'Uttar Pradesh', 'नोएडा', 'उत्तर प्रदेश', 28.5355, 77.391, 'ncr']),
  gurugram: city(['Gurugram', 'Haryana', 'गुरुग्राम', 'हरियाणा', 28.4595, 77.0266, 'ncr']),
  ghaziabad: city(['Ghaziabad', 'Uttar Pradesh', 'गाज़ियाबाद', 'उत्तर प्रदेश', 28.6692, 77.4538, 'ncr']),
  faridabad: city(['Faridabad', 'Haryana', 'फ़रीदाबाद', 'हरियाणा', 28.4089, 77.3178, 'ncr']),
  chandigarh: city(['Chandigarh', 'Chandigarh', 'चंडीगढ़', 'चंडीगढ़', 30.7333, 76.7794, 'north']),
  ludhiana: city(['Ludhiana', 'Punjab', 'लुधियाना', 'पंजाब', 30.901, 75.8573, 'north']),
  amritsar: city(['Amritsar', 'Punjab', 'अमृतसर', 'पंजाब', 31.634, 74.8723, 'north']),
  jaipur: city(['Jaipur', 'Rajasthan', 'जयपुर', 'राजस्थान', 26.9124, 75.7873, 'north']),
  agra: city(['Agra', 'Uttar Pradesh', 'आगरा', 'उत्तर प्रदेश', 27.1767, 78.0081, 'north']),
  lucknow: city(['Lucknow', 'Uttar Pradesh', 'लखनऊ', 'उत्तर प्रदेश', 26.8467, 80.9462, 'igp']),
  kanpur: city(['Kanpur', 'Uttar Pradesh', 'कानपुर', 'उत्तर प्रदेश', 26.4499, 80.3319, 'igp']),
  varanasi: city(['Varanasi', 'Uttar Pradesh', 'वाराणसी', 'उत्तर प्रदेश', 25.3176, 82.9739, 'igp']),
  patna: city(['Patna', 'Bihar', 'पटना', 'बिहार', 25.5941, 85.1376, 'igp']),
  kolkata: city(['Kolkata', 'West Bengal', 'कोलकाता', 'पश्चिम बंगाल', 22.5726, 88.3639, 'igp']),
  bhopal: city(['Bhopal', 'Madhya Pradesh', 'भोपाल', 'मध्य प्रदेश', 23.2599, 77.4126, 'other']),
  ahmedabad: city(['Ahmedabad', 'Gujarat', 'अहमदाबाद', 'गुजरात', 23.0225, 72.5714, 'other']),
  mumbai: city(['Mumbai', 'Maharashtra', 'मुंबई', 'महाराष्ट्र', 19.076, 72.8777, 'other']),
  pune: city(['Pune', 'Maharashtra', 'पुणे', 'महाराष्ट्र', 18.5204, 73.8567, 'other']),
  hyderabad: city(['Hyderabad', 'Telangana', 'हैदराबाद', 'तेलंगाना', 17.385, 78.4867, 'other']),
  bengaluru: city(['Bengaluru', 'Karnataka', 'बेंगलुरु', 'कर्नाटक', 12.9716, 77.5946, 'other']),
  chennai: city(['Chennai', 'Tamil Nadu', 'चेन्नई', 'तमिलनाडु', 13.0827, 80.2707, 'other']),
});

/**
 * @param {unknown} key
 * @returns {key is CityKey}
 */
export const isCity = (key) => typeof key === 'string' && Object.hasOwn(CITIES, key);

export const listCities = () =>
  Object.entries(CITIES).map(([key, c]) => ({
    key,
    name: c.name,
    state: c.state,
    nameHi: c.nameHi,
    stateHi: c.stateHi,
  }));

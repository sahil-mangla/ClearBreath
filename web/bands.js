// India CPCB AQI categories, in order. `to` is the upper bound of each band on the 0-500 scale.
export const BANDS = Object.freeze([
  { name: 'Good', from: 0, to: 50 },
  { name: 'Satisfactory', from: 51, to: 100 },
  { name: 'Moderate', from: 101, to: 200 },
  { name: 'Poor', from: 201, to: 300 },
  { name: 'Very Poor', from: 301, to: 400 },
  { name: 'Severe', from: 401, to: 500 },
]);

export const SCALE_MAX = 500;

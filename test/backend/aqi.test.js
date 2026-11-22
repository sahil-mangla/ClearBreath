import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAqi, levelIndexFor, LEVELS } from '../../src/aqi.js';

test('PM2.5 band edges map to CPCB sub-indices', () => {
  assert.equal(computeAqi({ pm25: 0 }).value, 0);
  assert.equal(computeAqi({ pm25: 30 }).value, 50);
  assert.equal(computeAqi({ pm25: 60 }).value, 100);
  assert.equal(computeAqi({ pm25: 90 }).value, 200);
  assert.equal(computeAqi({ pm25: 120 }).value, 300);
  assert.equal(computeAqi({ pm25: 250 }).value, 400);
});

test('interpolates inside a band', () => {
  assert.equal(computeAqi({ pm25: 75 }).value, 150); // midpoint of 60-90 -> 100-200
});

test('very high concentrations cap at 500 / Severe', () => {
  const r = computeAqi({ pm25: 900 });
  assert.equal(r.value, 500);
  assert.equal(r.category, 'Severe');
});

test('dominant pollutant is the one with the higher sub-index', () => {
  assert.equal(computeAqi({ pm25: 20, pm10: 300 }).dominant, 'PM10');
  assert.equal(computeAqi({ pm25: 150, pm10: 100 }).dominant, 'PM2.5');
});

test('works with only one pollutant, rejects none or invalid input', () => {
  assert.equal(computeAqi({ pm25: null, pm10: 60 }).dominant, 'PM10');
  assert.equal(computeAqi({ pm25: null, pm10: null }), null);
  assert.equal(computeAqi({ pm25: -5, pm10: NaN }), null);
});

test('level categories follow CPCB boundaries', () => {
  const expected = [
    [50, 0],
    [51, 1],
    [100, 1],
    [101, 2],
    [200, 2],
    [201, 3],
    [300, 3],
    [301, 4],
    [400, 4],
    [401, 5],
  ];
  for (const [value, idx] of expected) assert.equal(levelIndexFor(value), idx, `AQI ${value}`);
  assert.equal(LEVELS.length, 6);
});

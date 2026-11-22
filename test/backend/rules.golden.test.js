// Pins the whole recommendation engine: every plan, exposure estimate and fallback briefing (English and
// Hindi) over a grid of 27,648 households, cities, air levels and months is hashed into one digest.
// If a rules change alters any output this fails; update EXPECTED only when the change is intended.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { computeAqi } from '../../src/aqi.js';
import { buildPlan, estimateExposure, fallbackBriefing, topActions } from '../../src/rules.js';

const EXPECTED = '7d2f052691e1e553';

const CITIES = ['delhi', 'mumbai'];
const PM25 = [12, 90, 150, 380];
const COMMUTES = ['car', 'auto_cab', 'two_wheeler', 'bus_metro', 'walk_cycle', 'wfh'];
const COOKING = ['lpg', 'png', 'induction', 'biomass'];
const HEATING = ['none', 'electric', 'wood_coal'];
const HOUSEHOLDS = [
  { children: 0, seniors: 0, conditions: [] },
  { children: 2, seniors: 0, conditions: [] },
  { children: 0, seniors: 1, conditions: ['asthma'] },
  { children: 1, seniors: 1, conditions: ['heart', 'pregnancy', 'asthma'] },
];
const MONTHS = [0, 9, 10];
const FLAGS = [false, true];

function* profiles() {
  for (const household of HOUSEHOLDS)
    for (const commute of COMMUTES)
      for (const cooking of COOKING)
        for (const heating of HEATING)
          for (const hasPurifier of FLAGS)
            for (const hasN95 of FLAGS)
              yield {
                adults: 2,
                ...household,
                commute,
                commuteKm: 12,
                cooking,
                heating,
                hasPurifier,
                hasN95,
              };
}

const forecastFor = (pm25) =>
  pm25 % 2 === 0
    ? {
        bestHour: 14,
        worstHour: 7,
        bestPm25: Math.round(pm25 * 0.6),
        worstPm25: Math.round(pm25 * 1.2),
        bestDay: 'today',
      }
    : null;

function outputsFor({ cityKey, pm25, profile, month }) {
  const aqi = computeAqi({ pm25 });
  const window = forecastFor(pm25);
  const now = new Date(Date.UTC(2026, month, 15, 6));
  const plan = buildPlan({ levelIndex: aqi.levelIndex, pm25, profile, cityKey, window, now });
  const exposure = estimateExposure({ pm25, profile, window, levelIndex: aqi.levelIndex });
  const briefing = (lang) => fallbackBriefing({ cityName: cityKey, aqi, pm25, plan, exposure, lang });
  return [plan, exposure, briefing('en'), briefing('hi'), topActions(plan).map((a) => a.id)];
}

test('the rules engine output is unchanged across 27,648 scenarios', () => {
  const digest = createHash('sha256');
  let cases = 0;
  for (const cityKey of CITIES)
    for (const pm25 of PM25)
      for (const profile of profiles())
        for (const month of MONTHS) {
          digest.update(JSON.stringify(outputsFor({ cityKey, pm25, profile, month })));
          cases += 1;
        }
  assert.equal(cases, 27_648);
  assert.equal(digest.digest('hex').slice(0, 16), EXPECTED);
});

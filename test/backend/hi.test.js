import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTexts, builtinTexts, collectTexts, DISCLAIMER_HI, hiHour, publicText } from '../../src/hi.js';
import { sameNumbers, hasDevanagari } from '../../src/determinism.js';
import { grid } from '../helpers/grid.js';
import { buildPlan, estimateExposure, fmtHour } from '../../src/rules.js';

const WINDOW = { bestHour: 13, bestPm25: 140, worstHour: 8, worstPm25: 260, bestDay: 'today' };
const DISCLAIMER = 'General guidance, not medical advice. Impact figures are approximate estimates.';

test('hiHour speaks the same hour number as fmtHour, with the right part of day', () => {
  for (let h = 0; h < 24; h += 1) {
    assert.ok(sameNumbers(fmtHour(h), hiHour(h)), `hour ${h}`);
  }
  assert.equal(hiHour(8), 'सुबह 8 बजे');
  assert.equal(hiHour(13), 'दोपहर 1 बजे');
  assert.equal(hiHour(18), 'शाम 6 बजे');
  assert.equal(hiHour(22), 'रात 10 बजे');
  assert.equal(hiHour(0), 'रात 12 बजे');
});

const HOUSEHOLDS = [
  { children: 0, seniors: 0, conditions: [] },
  { children: 2, seniors: 0, conditions: ['asthma'] },
  { children: 0, seniors: 1, conditions: [] },
  { children: 1, seniors: 1, conditions: ['heart'] },
];
const PM25_BY_LEVEL = [10, 40, 70, 120, 220, 400];
const EVERY_PLAN = {
  cityKey: ['delhi', 'mumbai'],
  levelIndex: [0, 1, 2, 3, 4, 5],
  now: [0, 3, 9, 10].map((m) => new Date(Date.UTC(2026, m, 15, 6))),
  commute: ['bus_metro', 'car', 'auto_cab', 'two_wheeler', 'walk_cycle', 'wfh'],
  cooking: ['lpg', 'png', 'induction', 'biomass'],
  heating: ['none', 'electric', 'wood_coal'],
  household: HOUSEHOLDS,
  hasPurifier: [false, true],
  window: [null, WINDOW],
};

/** Check one scenario: Hindi exists for every action and alert, with the same figures as the English. */
function assertHindiMatches(s) {
  const { cityKey, levelIndex, now, commute, cooking, heating, household, hasPurifier, window } = s;
  const profile = {
    city: cityKey,
    adults: 2,
    ...household,
    commute,
    commuteKm: 12,
    cooking,
    heating,
    hasPurifier,
    hasN95: hasPurifier,
    lang: 'hi',
    notes: '',
    manualPm25: null,
  };
  const pm25 = PM25_BY_LEVEL[levelIndex];
  const plan = buildPlan({ levelIndex, pm25, profile, cityKey, window, now });
  const exposure = estimateExposure({ pm25, profile, window });
  const en = collectTexts(plan, exposure, DISCLAIMER);
  const hi = builtinTexts(plan, exposure);
  const where = [cityKey, `L${levelIndex}`, commute, cooking, heating, JSON.stringify(household)]
    .concat(`purifier=${hasPurifier}`, `forecast=${Boolean(window)}`)
    .join(' ');
  assert.ok(hi, `${where}: an action or alert has no Hindi entry`);
  assert.equal(hi.length, en.length, where);
  hi.forEach((t, i) => {
    assert.ok(hasDevanagari(t), `${where} #${i}: not Hindi: ${t}`);
    assert.ok(sameNumbers(en[i], t), `${where} #${i}: figures differ\n  en: ${en[i]}\n  hi: ${t}`);
    assert.ok(!/undefined|NaN|\{|\}/.test(t), `${where} #${i}: template leak: ${t}`);
  });
}

test('every plan the rules engine can produce has built-in Hindi with the same figures', () => {
  let plans = 0;
  for (const scenario of grid(EVERY_PLAN)) {
    assertHindiMatches(scenario);
    plans += 1;
  }
  assert.ok(plans > 10_000, `covered ${plans} plans`);
});

test('the last built-in string is the Hindi disclaimer, and builds are deterministic', () => {
  const profile = {
    city: 'delhi',
    adults: 2,
    children: 1,
    seniors: 0,
    conditions: [],
    commute: 'car',
    commuteKm: 8,
    cooking: 'lpg',
    heating: 'none',
    hasPurifier: false,
    hasN95: false,
    lang: 'hi',
    notes: '',
    manualPm25: null,
  };
  const args = {
    levelIndex: 4,
    pm25: 220,
    profile,
    cityKey: 'delhi',
    window: WINDOW,
    now: new Date('2026-11-10T06:00:00Z'),
  };
  const a = buildPlan(args);
  const b = buildPlan(args);
  assert.deepEqual(a, b);
  const exposure = estimateExposure({ pm25: 220, profile, window: WINDOW });
  const x = builtinTexts(a, exposure);
  assert.deepEqual(x, builtinTexts(b, exposure));
  assert.equal(x.at(-1), DISCLAIMER_HI);
});

test('applyTexts swaps text in order, keeps ids, and drops internal fields', () => {
  const profile = {
    city: 'delhi',
    adults: 2,
    children: 0,
    seniors: 0,
    conditions: [],
    commute: 'wfh',
    commuteKm: 0,
    cooking: 'png',
    heating: 'electric',
    hasPurifier: true,
    hasN95: true,
    lang: 'hi',
    notes: '',
    manualPm25: null,
  };
  const plan = buildPlan({
    levelIndex: 3,
    pm25: 120,
    profile,
    cityKey: 'delhi',
    window: WINDOW,
    now: new Date('2026-11-10T06:00:00Z'),
  });
  const exposure = estimateExposure({ pm25: 120, profile, window: WINDOW });
  const english = publicText(plan, exposure, DISCLAIMER);
  assert.equal(english.disclaimer, DISCLAIMER);
  assert.ok(
    english.plan.routine.every((a) => !('p' in a)),
    'params are not exposed',
  );
  assert.ok(english.plan.alerts.every((a) => !('key' in a)));
  assert.deepEqual(
    english.plan.routine.map((a) => a.id),
    plan.routine.map((a) => a.id),
  );
  assert.equal(english.plan.routine[0].title, plan.routine[0].title);
  const hi = applyTexts(plan, exposure, builtinTexts(plan, exposure));
  assert.deepEqual(
    hi.plan.routine.map((a) => a.id),
    plan.routine.map((a) => a.id),
  );
  assert.ok(hasDevanagari(hi.plan.routine[0].title));
  assert.equal(hi.exposure.assumptions.length, exposure.assumptions.length);
  assert.equal(hi.disclaimer, DISCLAIMER_HI);
  assert.equal(hi.plan.totals, plan.totals);
});

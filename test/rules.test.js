import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, estimateExposure, fallbackBriefing, fmtHour, EMISSION_FACTORS } from '../src/rules.js';
import { computeAqi } from '../src/aqi.js';

const base = {
  city: 'delhi', adults: 2, children: 0, seniors: 0, conditions: [], commute: 'car', commuteKm: 10,
  cooking: 'lpg', heating: 'none', hasPurifier: false, hasN95: false, lang: 'en', notes: '', manualPm25: null,
};
const win = { bestHour: 15, bestPm25: 120, bestDay: 'today', worstHour: 7, worstPm25: 260, worstDay: 'today' };
const NOV = new Date('2026-11-21T06:00:00Z');
const JUL = new Date('2026-07-15T06:00:00Z');

const plan = (overrides = {}, { pm25 = 220, window = win, now = NOV, cityKey = 'delhi' } = {}) => {
  const profile = { ...base, ...overrides };
  const aqi = computeAqi({ pm25 });
  return buildPlan({ levelIndex: aqi.levelIndex, pm25, profile, cityKey, window, now });
};
const ids = (p) => [...p.routine, ...p.indoor, ...p.alternatives].map((a) => a.id);

test('every action has an id, title, detail and an impact explanation', () => {
  const p = plan({ children: 1, heating: 'wood_coal', cooking: 'biomass' });
  for (const a of [...p.routine, ...p.indoor, ...p.alternatives]) {
    for (const k of ['id', 'title', 'detail', 'impact']) assert.ok(a[k], `${a.id} missing ${k}`);
  }
  assert.equal(new Set(ids(p)).size, ids(p).length, 'ids are unique');
});

test('smoggy day recommends N95, indoor exercise, sealing and the cleanest window', () => {
  const found = ids(plan());
  for (const id of ['r-mask', 'r-exercise', 'r-window', 'i-seal', 'i-purifier']) assert.ok(found.includes(id), id);
});

test('mask advice differs if the family already owns N95s', () => {
  const owns = plan({ hasN95: true }).routine.find((a) => a.id === 'r-mask');
  const lacks = plan({ hasN95: false }).routine.find((a) => a.id === 'r-mask');
  assert.match(owns.title, /Wear your N95/);
  assert.match(lacks.title, /Get a fitted N95/);
});

test('clean day suggests ventilation and no mask or purifier push', () => {
  const found = ids(plan({}, { pm25: 20, window: null }));
  assert.ok(found.includes('r-enjoy'));
  assert.ok(!found.includes('r-mask'));
  assert.ok(!found.includes('i-seal'));
});

test('burning wood or coal triggers a critical carbon-monoxide warning first', () => {
  const p = plan({ heating: 'wood_coal' });
  assert.equal(p.indoor[0].id, 'i-heating-safety');
  assert.ok(p.alerts.some((a) => a.level === 'critical' && /carbon-monoxide/.test(a.text)));
});

test('vulnerable households get a clean room and a medical-care caution', () => {
  const p = plan({ children: 1, seniors: 1 });
  assert.ok(ids(p).includes('i-clean-room'));
  assert.ok(p.alerts.some((a) => /not medical advice/.test(a.text)));
  assert.equal(p.alerts[0].level, 'critical');
});

test('severe AQI always raises a critical alert', () => {
  const p = plan({}, { pm25: 400 });
  assert.equal(p.alerts[0].level, 'critical');
});

test('biomass cooking is flagged as a top indoor issue; LPG gets ventilation advice', () => {
  assert.equal(plan({ cooking: 'biomass' }).indoor.find((a) => a.id === 'i-cooking').priority, 1);
  assert.equal(plan({ cooking: 'lpg' }).indoor.find((a) => a.id === 'i-cooking').priority, 3);
  assert.equal(plan({ cooking: 'induction' }).indoor.find((a) => a.id === 'i-cooking'), undefined);
});

test('car commute yields a quantified CO2 saving that matches the emission factors', () => {
  const p = plan({ commute: 'car', commuteKm: 10 });
  const expected = Math.round((EMISSION_FACTORS.car - EMISSION_FACTORS.bus_metro) * 10 * 2 * 5 * 10) / 10;
  assert.equal(p.totals.co2SavedKgPerWeek, expected);
  assert.equal(p.totals.co2SavedKgPerYear, Math.round(expected * 48));
  assert.match(p.alternatives.find((a) => a.id === 'a-commute').impact, new RegExp(`${expected} kg CO2`));
});

test('low-emission commuters get no CO2 saving but are encouraged', () => {
  const p = plan({ commute: 'bus_metro' });
  assert.equal(p.totals.co2SavedKgPerWeek, 0);
  assert.ok(ids(p).includes('a-commute'));
});

test('seasonal content: stubble alert in Delhi in November only; festive tip in Oct-Nov', () => {
  assert.ok(plan().alerts.some((a) => /stubble/.test(a.text)));
  assert.ok(ids(plan()).includes('a-festive') || plan().alternatives.length === 5);
  const summer = plan({}, { now: JUL });
  assert.ok(!summer.alerts.some((a) => /stubble/.test(a.text)));
  assert.ok(!ids(summer).includes('r-peak'));
});

test('GRAP advice is limited to Delhi-NCR cities', () => {
  assert.ok(ids(plan({}, { cityKey: 'delhi' })).includes('r-grap'));
  assert.ok(!ids(plan({}, { cityKey: 'lucknow' })).includes('r-grap'));
});

test('each section is capped to a readable size and sorted by priority', () => {
  const p = plan({ children: 1, seniors: 1, heating: 'wood_coal', cooking: 'biomass' });
  assert.ok(p.routine.length <= 6 && p.alternatives.length <= 5 && p.indoor.length <= 6);
  const pr = p.indoor.map((a) => a.priority);
  assert.deepEqual(pr, [...pr].sort((a, b) => a - b));
});

test('exposure model: plan is lower than baseline and reports its assumptions', () => {
  const e = estimateExposure({ pm25: 220, profile: base, window: win });
  assert.ok(e.plan < e.baseline);
  assert.ok(e.reductionPct > 0 && e.reductionPct < 100);
  assert.equal(e.whoGuideline, 15);
  assert.ok(e.assumptions.length >= 3);
});

test('exposure model: purifier owners start lower; working from home beats an open two-wheeler commute', () => {
  const noPur = estimateExposure({ pm25: 200, profile: base, window: null });
  const pur = estimateExposure({ pm25: 200, profile: { ...base, hasPurifier: true }, window: null });
  assert.ok(pur.baseline < noPur.baseline);
  const bike = estimateExposure({ pm25: 200, profile: { ...base, commute: 'two_wheeler' }, window: null });
  const wfh = estimateExposure({ pm25: 200, profile: { ...base, commute: 'wfh' }, window: null });
  assert.ok(wfh.baseline < bike.baseline);
});

test('exposure model handles zero PM2.5 without dividing by zero', () => {
  const e = estimateExposure({ pm25: 0, profile: base, window: null });
  assert.equal(e.reductionPct, 0);
});

test('fallback briefing names the city, AQI and the top actions', () => {
  const p = plan();
  const aqi = computeAqi({ pm25: 220 });
  const b = fallbackBriefing({ cityName: 'Delhi', aqi, pm25: 220, plan: p, exposure: estimateExposure({ pm25: 220, profile: base, window: win }) });
  assert.match(b.text, /Delhi/);
  assert.match(b.text, /AQI/);
  assert.equal(b.source, 'rules');
  assert.equal(b.topActionIds.length, 3);
});

test('Hindi fallback briefing is really Hindi, says so, and still picks three top actions', () => {
  const p = plan();
  const aqi = computeAqi({ pm25: 220 });
  const b = fallbackBriefing({ cityName: 'Delhi', aqi, pm25: 220, plan: p, exposure: estimateExposure({ pm25: 220, profile: base, window: win }), lang: 'hi' });
  assert.equal(b.lang, 'hi');
  assert.match(b.text, /[\u0900-\u097F]/);
  assert.match(b.text, /AQI \d+/);
  assert.equal(b.topActionIds.length, 3);
  assert.equal(fallbackBriefing({ cityName: 'Delhi', aqi, pm25: 220, plan: p, exposure: estimateExposure({ pm25: 220, profile: base, window: win }) }).lang, 'en');
});

test('fmtHour formats 12-hour clock times', () => {
  assert.equal(fmtHour(0), '12 am');
  assert.equal(fmtHour(12), '12 pm');
  assert.equal(fmtHour(15), '3 pm');
  assert.equal(fmtHour(7), '7 am');
});

test('exposure model follows the plan: a clean day promises no reduction, a polluted day does', () => {
  const clean = estimateExposure({ pm25: 20, profile: base, window: win });
  assert.equal(clean.reductionPct, 0, 'no mask or sealing is advised on a Good day');
  assert.equal(clean.inputs.polluted, false);
  const bad = estimateExposure({ pm25: 220, profile: base, window: win });
  assert.ok(bad.reductionPct > 20);
  assert.match(bad.assumptions[2], /sealed room/, 'no purifier is claimed when the household has none');
  const owner = estimateExposure({ pm25: 220, profile: { ...base, hasPurifier: true }, window: win });
  assert.match(owner.assumptions[2], /your purifier/);
});

test('an auto-rickshaw is not modelled as a closed cabin, a car is', () => {
  const auto = estimateExposure({ pm25: 200, profile: { ...base, commute: 'auto_cab' }, window: null });
  const car = estimateExposure({ pm25: 200, profile: { ...base, commute: 'car' }, window: null });
  assert.ok(auto.baseline > car.baseline);
  const p = plan({ commute: 'auto_cab' });
  assert.match(p.routine.find((a) => a.id === 'r-commute').title, /auto-rickshaw/);
});

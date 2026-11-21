import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, LANGS, translate } from '../web/strings.js';
import { isUrgent, quickGroup } from '../web/quick.js';
import { isLowPower } from '../web/power.js';
import { planToText } from '../web/share.js';

const slots = (s) => (typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);

test('English and Hindi have exactly the same keys, shapes and {slots}', () => {
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(Object.keys(STRINGS.hi).sort(), en);
  for (const key of en) {
    const a = STRINGS.en[key];
    const b = STRINGS.hi[key];
    assert.equal(Array.isArray(a), Array.isArray(b), `${key}: same shape`);
    if (Array.isArray(a)) {
      assert.equal(a.length, b.length, `${key}: same length`);
      a.forEach((pair, i) => assert.equal(pair.length, b[i].length));
    } else {
      assert.deepEqual(slots(b), slots(a), `${key}: same placeholders`);
      assert.ok(b.length > 0 || key === 'plan.forPre', `${key}: Hindi text present`);
    }
  }
});

test('Hindi strings really are Devanagari where they should be', () => {
  const dev = /[ऀ-ॿ]/;
  for (const key of ['hero.title', 'hero.cta', 'submit', 'band.4', 'quick.severe']) {
    const v = STRINGS.hi[key];
    assert.ok(dev.test(Array.isArray(v) ? v.flat().join('') : v), key);
  }
});

test('translate fills slots, falls back to English, then to the key', () => {
  assert.equal(translate('en', 'status.ready', { city: 'Delhi' }), 'Plan ready for Delhi.');
  assert.match(translate('hi', 'status.ready', { city: 'दिल्ली' }), /दिल्ली/);
  assert.equal(translate('fr', 'city'), 'City');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  assert.equal(translate('en', 'scale.today', {}), 'Today {aqi}', 'unfilled slots are left visible, not blanked');
  assert.deepEqual(LANGS, ['en', 'hi']);
});

test('quickGroup follows the CPCB bands and defaults to the mildest set', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(quickGroup), ['clear', 'clear', 'moderate', 'poor', 'severe', 'severe']);
  assert.equal(quickGroup(undefined), 'clear');
  assert.equal(quickGroup(2.5), 'clear');
  assert.equal(isUrgent(2), false);
  assert.equal(isUrgent(3), true);
  assert.equal(isUrgent(NaN), false);
});

test('every quick-action set has exactly three actions, and the severe set mentions medical help', () => {
  for (const lang of LANGS) {
    for (const g of ['clear', 'moderate', 'poor', 'severe']) assert.equal(STRINGS[lang][`quick.${g}`].length, 3);
  }
  assert.match(STRINGS.en['quick.severe'].flat().join(' '), /doctor/i);
});

test('isLowPower: weak hardware, data-saver and the ?fx override', () => {
  assert.equal(isLowPower({ deviceMemory: 8, hardwareConcurrency: 8 }), false);
  assert.equal(isLowPower({ deviceMemory: 2, hardwareConcurrency: 8 }), true);
  assert.equal(isLowPower({ deviceMemory: 8, hardwareConcurrency: 4 }), true);
  assert.equal(isLowPower({ connection: { saveData: true }, deviceMemory: 8, hardwareConcurrency: 8 }), true);
  assert.equal(isLowPower({}), false, 'unknown hardware is treated as capable');
  assert.equal(isLowPower({ deviceMemory: 1 }, '?fx=full'), false);
  assert.equal(isLowPower({ deviceMemory: 8, hardwareConcurrency: 8 }, '?fx=lite'), true);
  assert.equal(isLowPower(undefined, ''), false);
});

const RESULT = {
  city: { name: 'Delhi' },
  air: { aqi: 350, levelIndex: 4 },
  exposure: { baseline: 120, plan: 70, reductionPct: 42, whoGuideline: 15, indiaStandard: 60 },
  briefing: { text: 'Keep windows shut today.' },
  plan: {
    routine: [{ title: 'Wear an N95', detail: 'On the metro.', impact: 'Cuts exposure.' }],
    indoor: [],
    alternatives: [{ title: 'Switch to induction', detail: 'Cook cleaner.', impact: 'Less indoor smoke.' }],
  },
  disclaimer: 'General guidance, not medical advice.',
};

test('planToText is plain text with the same numbers, skipping empty groups', () => {
  const text = planToText(RESULT, 'en');
  assert.match(text, /^Your plan for Delhi\nAQI 350, Very Poor\./);
  assert.match(text, /about 120 µg\/m³.*about 70 µg\/m³.*42% lower/s);
  assert.match(text, /- Wear an N95\n {2}On the metro\.\n {2}Cuts exposure\./);
  assert.ok(!text.includes('Indoor air-quality hacks'), 'empty group omitted');
  assert.ok(!/[<>]/.test(text.replace(/µg\/m³/g, '')), 'no markup');
  assert.match(text, /not medical advice\.\nClearBreath$/);
});

test('planToText speaks Hindi for the labels and keeps server text as is', () => {
  const text = planToText(RESULT, 'hi');
  assert.match(text, /^दिल्ली|^Delhi के लिए आपकी योजना/);
  assert.match(text, /बहुत खराब/);
  assert.match(text, /- Wear an N95/);
});

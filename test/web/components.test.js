import test from 'node:test';
import assert from 'node:assert/strict';
import { loadComponents } from '../helpers/render.js';

const values = {
  adults: '2',
  children: '0',
  seniors: '0',
  conditions: [],
  commute: 'bus_metro',
  commuteKm: '10',
  cooking: 'lpg',
  heating: 'none',
  hasPurifier: false,
  hasN95: false,
  lang: 'en',
  notes: '',
  manualPm25: '',
};
const noop = () => {};

async function form(props = {}, lang = 'en') {
  const { render, h, PlanForm } = await loadComponents();
  return render(
    h(PlanForm, {
      values,
      set: noop,
      onSubmit: noop,
      busy: false,
      errors: null,
      cityName: 'Delhi',
      ...props,
    }),
    lang,
  );
}

test('every form control has a visible label bound to it', async () => {
  const html = await form();
  const ids = [...html.matchAll(/<(?:input|select|textarea)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 9, 'the form renders its controls');
  for (const id of ids) assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `label for #${id}`);
});

test('the form groups related controls in fieldsets with legends', async () => {
  const html = await form();
  assert.equal((html.match(/<fieldset/g) ?? []).length, (html.match(/<legend/g) ?? []).length);
  assert.ok((html.match(/<fieldset/g) ?? []).length >= 4);
});

test('a clean form has no error summary and no invalid fields', async () => {
  const html = await form();
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /id="form-errors"/);
});

test('server field errors mark the named fields invalid, with an inline message and a focusable summary', async () => {
  const html = await form({
    errors: {
      code: 'invalid_input',
      message: 'Please check the highlighted fields.',
      fields: ['adults', 'commute'],
    },
  });
  for (const id of ['adults', 'commute'])
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-invalid="true"`), `#${id} is invalid`);
  assert.doesNotMatch(html, /id="children"[^>]*aria-invalid/);
  assert.equal((html.match(/class="field__error"/g) ?? []).length, 2, 'one inline message per bad field');
  assert.match(html, /id="form-errors"[^>]*tabindex="-1"/);
  assert.match(html, /aria-describedby="form-errors"/);
});

test('the Hindi form is Devanagari and keeps the same controls', async () => {
  const en = await form();
  const hi = await form({}, 'hi');
  assert.match(hi, /[ऀ-ॿ]/);
  const ids = (s) => [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(hi), ids(en));
});

test('the submit button reports its busy state without being removed from the tab order', async () => {
  const html = await form({ busy: true });
  assert.match(html, /<button[^>]*type="submit"[^>]*aria-disabled="true"/);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*\sdisabled/);
});

test('the question box is labelled and only shows an error after a failed ask', async () => {
  const { render, h, AskPanel } = await loadComponents();
  const html = render(h(AskPanel, { city: 'delhi', lang: 'en' }));
  assert.match(html, /<label[^>]*for="question"/);
  assert.match(html, /id="question"/);
  assert.doesNotMatch(html, /aria-invalid/);
  assert.match(html, /aria-live="polite"/);
});

test('animated headline text is exposed to screen readers once, as plain text', async () => {
  const { render, h, SmogText } = await loadComponents();
  const html = render(h(SmogText, { text: 'Breathe easier today' }));
  assert.equal((html.match(/visually-hidden">Breathe easier today</g) ?? []).length, 1);
  assert.match(html, /class="smog__vis" aria-hidden="true"/);
});

test('the AQI scale states the reading in words, not only colour', async () => {
  const { render, h, BandScale } = await loadComponents();
  const html = render(h(BandScale, { aqi: 312, levelIndex: 4 }));
  assert.match(html, /312/);
  assert.match(html, /Very poor|Severe|Poor/i);
});

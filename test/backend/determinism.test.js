import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedNumbers,
  checkTranslation,
  normalizeDigits,
  numberTokens,
  sameNumbers,
  ungroundedNumbers,
} from '../../src/determinism.js';
import { chunkTexts, translateTexts } from '../../src/translate.js';
import { createLlm } from '../../src/llm.js';
import { createApp } from '../../src/app.js';

test('numbers are compared as values, ignoring Devanagari digits and names that contain digits', () => {
  assert.equal(normalizeDigits('५४.६ और १२'), '54.6 और 12');
  assert.deepEqual(numberTokens('Wear an N95 when PM2.5 is 54.60 µg/m³, 10-15 min, CO2 and MERV-13'), [
    '54.6',
    '10',
    '15',
  ]);
  assert.ok(sameNumbers('about 30-50%', 'लगभग ३०-५०%'));
  assert.ok(!sameNumbers('about 30-50%', 'लगभग 30-60%'));
  assert.ok(!sameNumbers('1 pm', 'दोपहर बजे'));
});

test('briefing figures above 10 must come from the facts; small counting numbers are free', () => {
  const facts = {
    aqi: { value: 123, pm25: 67 },
    exposure: { todayAsUsual: 54.6, withPlan: 31.6, reductionPct: 42, whoGuideline: 15 },
  };
  assert.deepEqual(
    ungroundedNumbers('AQI 123, PM2.5 67; exposure falls from 54.6 to 31.6, a 42% cut vs WHO 15.', facts),
    [],
  );
  assert.deepEqual(ungroundedNumbers('About 55 and 32 when rounded, in 3 steps over 10 minutes.', facts), []);
  assert.deepEqual(ungroundedNumbers('It is above the guideline by 52.', facts), ['52']);
  assert.ok(allowedNumbers(facts).has('55'));
});

test('checkTranslation accepts a faithful batch and rejects every kind of bad one', () => {
  const src = ['Wear an N95 for 10-15 minutes', 'Cuts PM2.5 by 80%'];
  const ok = ['10-15 मिनट N95 पहनें', 'PM2.5 को 80% घटाता है'];
  assert.deepEqual(checkTranslation(src, ok), ok);
  assert.equal(checkTranslation(src, [ok[0]]), null, 'wrong count');
  assert.equal(checkTranslation(src, [ok[0], '']), null, 'empty');
  assert.equal(checkTranslation(src, [ok[0], 'PM2.5 by 80%']), null, 'not Hindi');
  assert.equal(checkTranslation(src, [ok[0], 'PM2.5 को 90% घटाता है']), null, 'figure changed');
  assert.equal(checkTranslation(src, [ok[0], 'PM2.5 को 80% घटाता है <b>']), null, 'markup');
  assert.equal(checkTranslation(src, [ok[0], 'PM2.5 को 80% घटाता है https://x.test']), null, 'link');
  assert.equal(checkTranslation(src, 'nope'), null, 'not a list');
  assert.equal(checkTranslation(src, [ok[0], 'अ'.repeat(2000)]), null, 'runaway');
});

test('chunkTexts keeps order and never splits a string', () => {
  const texts = ['a'.repeat(1000), 'b'.repeat(900), 'c'.repeat(2500), 'd'];
  const chunks = chunkTexts(texts, 1800);
  assert.deepEqual(chunks, [[0], [1], [2], [3]]);
  assert.deepEqual(chunkTexts(['ab', 'cd', 'ef'], 4), [[0, 1], [2]]);
  assert.deepEqual(chunkTexts([], 10), []);
});

const EN = ['Step out at 1 pm', 'It cuts 80%', 'Be safe', 'Last one'];
const BUILTIN = ['१ बजे निकलें', '80% कम', 'सुरक्षित रहें', 'आख़िरी'];
const fakeLlm = (impl, enabled = true) => ({ enabled, translate: impl });

test('translateTexts: Gemini first, per-chunk built-in fallback, and null only when nothing can cover', async () => {
  const long = ['x'.repeat(1000), 'y'.repeat(1000)]; // two chunks
  const hiBuiltin = ['ब1', 'ब2'];
  const good = (arr) => Promise.resolve(arr.map((t) => `जी-${t.slice(0, 1)}`));

  const all = await translateTexts(fakeLlm(good), long, hiBuiltin);
  assert.equal(all.source, 'gemini');
  assert.deepEqual(all.texts, ['जी-x', 'जी-y']);

  let n = 0;
  const flaky = (arr) => (n++ === 0 ? good(arr) : Promise.resolve(null));
  const mixed = await translateTexts(fakeLlm(flaky), long, hiBuiltin);
  assert.equal(mixed.source, 'mixed');
  assert.deepEqual(mixed.texts, ['जी-x', 'ब2']);

  const none = await translateTexts(
    fakeLlm(() => Promise.reject(new Error('down'))),
    long,
    hiBuiltin,
  );
  assert.equal(none.source, 'builtin');
  assert.deepEqual(none.texts, hiBuiltin);

  const off = await translateTexts(
    fakeLlm(() => assert.fail('must not call'), false),
    EN,
    BUILTIN,
  );
  assert.equal(off.source, 'builtin');
  assert.deepEqual(off.texts, BUILTIN);

  assert.equal(
    await translateTexts(
      fakeLlm(() => Promise.resolve(null)),
      EN,
      null,
    ),
    null,
  );
});

const reply = (obj, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
});

test('llm: deterministic request settings, retry on busy, cache, and validation of translations', async () => {
  const seen = [];
  const statuses = [503, 200];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    seen.push(body);
    const status = statuses.shift() ?? 200;
    if (status !== 200) return reply({}, status);
    const { texts } = JSON.parse(body.contents[0].parts[0].text);
    return reply({ translations: texts.map((t) => `${t.replace(/[A-Za-z ]+/g, '')} हिंदी`) });
  };
  const llm = createLlm({ apiKey: 'k', fetchImpl, retryDelayMs: 0 });

  const out = await llm.translate(['Wear 2 masks', 'Cut 40%']);
  assert.deepEqual(out, ['2 हिंदी', '40% हिंदी'], 'one 503, then a retry succeeded');
  assert.equal(seen.length, 2);
  assert.equal(seen[1].generationConfig.temperature, 0);
  assert.equal(seen[1].generationConfig.seed, 7);

  const again = await llm.translate(['Wear 2 masks', 'Cut 40%']);
  assert.deepEqual(again, out);
  assert.equal(seen.length, 2, 'identical request is served from the cache');

  // A translation that changes a figure is rejected, and the rejection is not cached.
  const bad = createLlm({
    apiKey: 'k',
    retryDelayMs: 0,
    fetchImpl: async () => reply({ translations: ['३ मास्क'] }),
  });
  assert.equal(await bad.translate(['Wear 2 masks']), null);
  assert.equal(await createLlm({ apiKey: '' }).translate(['x']), null, 'no key, no call');
});

test('llm: a briefing quoting a figure that is not in the facts is rejected', async () => {
  const facts = { aqi: { value: 123, pm25: 67 }, exposure: { whoGuideline: 15 } };
  const ask = (briefing) =>
    createLlm({ apiKey: 'k', fetchImpl: async () => reply({ briefing, topActionIds: [] }) }).briefing({
      facts,
      untrusted: { notes: '' },
      allowedIds: [],
    });
  assert.equal((await ask('AQI is 123 and PM2.5 is 67, above the WHO 15.')).source, 'gemini');
  assert.equal(await ask('You will be above the guideline by 52 points.'), null);
});

const AIR = {
  current: { time: '2026-11-21T10:00', pm2_5: 210, pm10: 290 },
  hourly: {
    time: Array.from({ length: 24 }, (_, h) => `2026-11-21T${String(h).padStart(2, '0')}:00`),
    pm2_5: Array.from({ length: 24 }, (_, h) => (h === 15 ? 110 : 230)),
  },
};
const boot = async (env, fetchImpl) => {
  const server = createApp({ env, fetchImpl, now: () => new Date('2026-11-21T05:00:00Z') });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
};
const post = (base, body) =>
  fetch(`${base}/api/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
const airOnly = async (url) => {
  if (String(url).includes('air-quality-api')) return { ok: true, json: async () => AIR };
  throw new Error('network down');
};

test('without Gemini the same request always returns the identical response, English and Hindi', async () => {
  const a = await boot({}, airOnly);
  try {
    const req = {
      city: 'delhi',
      adults: 2,
      children: 1,
      conditions: ['asthma'],
      commute: 'car',
      cooking: 'biomass',
      heating: 'wood_coal',
    };
    for (const lang of ['en', 'hi']) {
      const one = await post(a.base, { ...req, lang });
      const two = await post(a.base, { ...req, lang });
      assert.deepEqual(one, two, `${lang}: repeat requests match`);
      assert.equal(one.textLang, lang);
      assert.equal(one.translation, lang === 'hi' ? 'builtin' : null);
    }
    const hi = await post(a.base, { ...req, lang: 'hi' });
    const texts = [hi.disclaimer, ...hi.plan.routine, ...hi.plan.indoor, ...hi.plan.alternatives].flatMap(
      (x) => (typeof x === 'string' ? [x] : [x.title, x.detail, x.impact]),
    );
    assert.ok(
      texts.every((t) => /[ऀ-ॿ]/.test(t)),
      'every server-written string is Hindi',
    );
    assert.ok(hi.plan.alerts.every((x) => /[ऀ-ॿ]/.test(x.text)));
    assert.ok(hi.exposure.assumptions.every((x) => /[ऀ-ॿ]/.test(x)));
    assert.ok(
      hi.plan.routine.every((x) => !('p' in x)),
      'internal params are not sent',
    );
  } finally {
    await a.close();
  }
});

test('with Gemini the plan is translated by Gemini; a failing Gemini falls back to the built-in Hindi', async () => {
  const translating = async (url, init) => {
    if (String(url).includes('generativelanguage')) {
      const { texts, facts } = JSON.parse(JSON.parse(init.body).contents[0].parts[0].text);
      if (texts) return reply({ translations: texts.map((t) => `जेमिनी: ${t}`) });
      return reply({ briefing: `AQI ${facts.aqi.value}.`, topActionIds: [] });
    }
    return airOnly(url);
  };
  const g = await boot({ GEMINI_API_KEY: 'k' }, translating);
  const down = await boot({ GEMINI_API_KEY: 'k' }, async (url) =>
    String(url).includes('generativelanguage')
      ? { ok: false, status: 500, json: async () => ({}) }
      : airOnly(url),
  );
  try {
    const body = { city: 'delhi', lang: 'hi', commute: 'bus_metro' };
    const viaGemini = await post(g.base, body);
    assert.equal(viaGemini.translation, 'gemini');
    assert.equal(viaGemini.textLang, 'hi');
    assert.match(viaGemini.plan.routine[0].title, /^जेमिनी: /);
    assert.match(viaGemini.disclaimer, /^जेमिनी: /);

    const fallback = await post(down.base, body);
    const offline = await boot({}, airOnly);
    try {
      const builtin = await post(offline.base, body);
      assert.equal(fallback.translation, 'builtin');
      assert.deepEqual(
        fallback.plan,
        builtin.plan,
        'a failed Gemini gives exactly the keyless built-in Hindi',
      );
      assert.equal(fallback.disclaimer, builtin.disclaimer);
    } finally {
      await offline.close();
    }
  } finally {
    await g.close();
    await down.close();
  }
});

test('checkTranslation rejects a bare www address and handles a source with no letters', () => {
  assert.equal(checkTranslation(['Visit us'], ['हमसे www.example.com पर मिलें']), null);
  assert.deepEqual(checkTranslation(['80%'], ['80%']), ['80%']);
});

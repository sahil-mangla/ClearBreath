import test from 'node:test';
import assert from 'node:assert/strict';
import { bestWindow, createAirClient } from '../../src/airdata.js';

const hours = (date, values, startHour = 0) =>
  values.map((pm25, i) => ({ time: `${date}T${String(startHour + i).padStart(2, '0')}:00`, pm25 }));

test('bestWindow picks the cleanest and dirtiest daytime hour', () => {
  const day = hours(
    '2026-11-21',
    Array.from({ length: 24 }, (_, h) => (h === 15 ? 80 : h === 8 ? 300 : 200)),
  );
  const w = bestWindow(day, '2026-11-21T07:00');
  assert.equal(w.bestHour, 15);
  assert.equal(w.bestPm25, 80);
  assert.equal(w.worstHour, 8);
  assert.equal(w.bestDay, 'today');
});

test('bestWindow ignores night hours and past hours, and labels tomorrow', () => {
  const day1 = hours('2026-11-21', Array(24).fill(200));
  day1[3].pm25 = 5; // 3 am: ignored (night)
  day1[9].pm25 = 5; // 9 am: already past at 10:00
  const day2 = hours('2026-11-22', Array(24).fill(200));
  day2[7].pm25 = 90; // 7 am tomorrow is inside the 24 h lookahead from 10:00 today
  day2[13].pm25 = 10; // 1 pm tomorrow is beyond the lookahead: ignored
  const w = bestWindow([...day1, ...day2], '2026-11-21T10:00');
  assert.equal(w.bestHour, 7);
  assert.equal(w.bestDay, 'tomorrow');
});

test('bestWindow returns null with too little data', () => {
  assert.equal(bestWindow([], '2026-11-21T10:00'), null);
  assert.equal(bestWindow(hours('2026-11-21', [1, 2], 10), '2026-11-21T10:00'), null);
  assert.equal(bestWindow(null, 'x'), null);
});

const upstream = (overrides = {}) => ({
  ok: true,
  json: async () => ({
    current: { time: '2026-11-21T10:00', pm2_5: 180.4, pm10: 260 },
    hourly: { time: ['2026-11-21T10:00', '2026-11-21T11:00', '2026-11-21T12:00'], pm2_5: [180, null, 150] },
    ...overrides,
  }),
});

test('client parses upstream data, skips null hours and uses the allow-listed coordinates', async () => {
  let url;
  const client = createAirClient({ fetchImpl: async (u) => ((url = u), upstream()) });
  const d = await client.get('delhi');
  assert.equal(d.pm25, 180.4);
  assert.equal(d.hourly.length, 2);
  assert.match(url, /latitude=28\.6139&longitude=77\.209/);
});

test('client caches per city within the TTL and refetches after it', async () => {
  let calls = 0;
  let t = 0;
  const client = createAirClient({ fetchImpl: async () => (calls++, upstream()), ttlMs: 1000, now: () => t });
  await client.get('delhi');
  await client.get('delhi');
  assert.equal(calls, 1);
  await client.get('noida');
  assert.equal(calls, 2);
  t = 1500;
  await client.get('delhi');
  assert.equal(calls, 3);
});

test('client de-duplicates concurrent requests for the same city', async () => {
  let calls = 0;
  const client = createAirClient({ fetchImpl: async () => (calls++, upstream()) });
  await Promise.all([client.get('delhi'), client.get('delhi'), client.get('delhi')]);
  assert.equal(calls, 1);
});

test('client rejects on upstream errors and on missing PM2.5', async () => {
  await assert.rejects(createAirClient({ fetchImpl: async () => ({ ok: false, status: 500 }) }).get('delhi'));
  await assert.rejects(
    createAirClient({ fetchImpl: async () => upstream({ current: { time: 't', pm2_5: null } }) }).get(
      'delhi',
    ),
  );
});

test('when the upstream fails it serves the last good reading, labelled stale, for up to an hour', async () => {
  let t = 0;
  let down = false;
  const client = createAirClient({
    fetchImpl: async () => (down ? { ok: false, status: 503 } : upstream()),
    ttlMs: 1000,
    now: () => t,
  });
  const fresh = await client.get('delhi');
  down = true;
  t = 2000;
  const stale = await client.get('delhi');
  assert.equal(stale.pm25, fresh.pm25);
  assert.match(stale.source, /last reading/);
  t = 2000 + 60 * 60_000;
  await assert.rejects(client.get('delhi'), 'too old to serve');
});

test('an outage is remembered for 30 s so visitors do not each wait for the timeout', async () => {
  let t = 0;
  let calls = 0;
  const client = createAirClient({
    fetchImpl: async () => (calls++, { ok: false, status: 500 }),
    now: () => t,
  });
  await assert.rejects(client.get('delhi'));
  await assert.rejects(client.get('delhi'));
  assert.equal(calls, 1, 'second request skipped the upstream');
  t = 31_000;
  await assert.rejects(client.get('delhi'));
  assert.equal(calls, 2, 'retried after the failure window');
});

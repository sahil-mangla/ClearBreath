import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  clearedDensity,
  densityFor,
  easeOutCubic,
  hash,
  letterTiming,
  makePuffs,
  makeSkyline,
  seedFor,
  SMOKE_LAYERS,
  splitWords,
  stepPuff,
  windowLit,
  withAlpha,
} from '../../web/lib.js';

test('densityFor rises with AQI, stays in 0.08..1 and tolerates bad input', () => {
  assert.equal(densityFor(0), 0.08);
  assert.ok(densityFor(100) < densityFor(200) && densityFor(200) < densityFor(350));
  assert.equal(densityFor(400), 1);
  assert.equal(densityFor(9999), 1);
  assert.equal(densityFor('abc'), 0.08);
  assert.equal(densityFor(-50), 0.08);
});

test('clearedDensity thins the haze by the exposure reduction, with sane bounds', () => {
  assert.equal(clearedDensity(0.8, 0), 0.8);
  assert.ok(Math.abs(clearedDensity(0.8, 50) - 0.4) < 1e-9);
  assert.equal(clearedDensity(0.8, 500), clearedDensity(0.8, 90)); // capped at 90%
  assert.equal(clearedDensity(0.1, 90), 0.05); // never fully clear
  assert.equal(clearedDensity(0.8, 'x'), 0.8);
});

test('splitWords splits on whitespace into letters and keeps Devanagari clusters whole', () => {
  assert.deepEqual(splitWords('Breathe  easy'), [Array.from('Breathe'), Array.from('easy')]);
  assert.deepEqual(splitWords('   '), []);
  assert.deepEqual(splitWords(null), []);
  const hindi = splitWords('स्वच्छ हवा');
  assert.equal(hindi.length, 2);
  if (typeof Intl.Segmenter === 'function') {
    assert.ok(
      hindi[0].length < Array.from('स्वच्छ').length,
      'conjunct clusters are not split into code points',
    );
  }
});

test('letterTiming is deterministic, staggered, quick enough, and blurrier in thicker air', () => {
  assert.deepEqual(letterTiming(3, 0.5), letterTiming(3, 0.5));
  assert.ok(letterTiming(10, 0.5).delay > letterTiming(1, 0.5).delay);
  const thin = letterTiming(5, 0.1).blur;
  const thick = letterTiming(5, 1).blur;
  assert.ok(thick > thin);
  assert.ok(letterTiming(0, 1).blur <= 5 + 13 + 4);
  assert.ok(letterTiming(45, 1).delay < 800, 'a long headline still starts its last letter within 0.8 s');
});

test('hash stays in [0,1) and is stable; seedFor is stable and differs per string', () => {
  for (let i = 0; i < 200; i += 1) {
    const h = hash(i);
    assert.ok(h >= 0 && h < 1);
    assert.equal(h, hash(i));
  }
  assert.equal(seedFor('delhi'), seedFor('delhi'));
  assert.notEqual(seedFor('delhi'), seedFor('mumbai'));
  assert.equal(typeof seedFor(undefined), 'number');
});

test('makePuffs is deterministic, fills every layer and keeps values in range', () => {
  const a = makePuffs();
  assert.equal(
    a.length,
    SMOKE_LAYERS.reduce((n, l) => n + l.count, 0),
  );
  assert.deepEqual(a, makePuffs());
  for (const layer of [0, 1, 2]) assert.ok(a.some((p) => p.layer === layer));
  assert.ok(
    a.every(
      (p) => p.vx > 0 && p.s > 0.2 && p.s < 1 && [0, 1, 2].includes(p.tone) && [0, 1].includes(p.shape),
    ),
  );
  const speed = (layer) => Math.min(...a.filter((p) => p.layer === layer).map((p) => p.vx));
  assert.ok(speed(2) > speed(0), 'near wisps move faster than the far bank (parallax)');
});

test('smoke moves visibly: a near puff crosses a noticeable share of the frame in 10 s', () => {
  const p = { ...makePuffs().find((q) => q.layer === 2), x: 0.2, y: 0.5 };
  const start = p.x;
  for (let i = 0; i < 100; i += 1) stepPuff(p, i * 0.1, 0.1, null);
  assert.ok(p.x - start > 0.3, `moved ${p.x - start}`);
});

test('stepPuff wraps only after the puff has left the frame, and never teleports on screen', () => {
  const p = { ...makePuffs()[0], x: 1.0, s: 0.5, vx: 0.05 };
  let wrapped = false;
  for (let i = 0; i < 2000; i += 1) {
    const before = p.x;
    stepPuff(p, i * 0.1, 0.1, null);
    if (p.x < before - 1) {
      wrapped = true;
      assert.ok(before > 1 + p.s * 0.5, 'was already off the right edge when it wrapped');
      assert.ok(p.x < -p.s * 0.5, 're-enters from beyond the left edge');
    }
  }
  assert.ok(wrapped);
});

test('the pointer pushes a puff away, then it springs back', () => {
  const p = { x: 0.5, y: 0.5, s: 0.3, vx: 0, phase: 0, rot: 0, vr: 0, ox: 0, oy: 0 };
  for (let i = 0; i < 20; i += 1) stepPuff(p, 0, 0.016, { x: 0.45, y: 0.5 });
  assert.ok(p.ox > 0, 'pushed away from a pointer on its left');
  const peak = p.ox;
  for (let i = 0; i < 200; i += 1) stepPuff(p, 0, 0.016, null);
  assert.ok(Math.abs(p.ox) < peak * 0.05, 'offset springs back to rest');
});

test('makeSkyline is deterministic, fills the width in three layers and stays inside the frame', () => {
  const a = makeSkyline(seedFor('delhi'), 200, 52, 'delhi');
  assert.deepEqual(a, makeSkyline(seedFor('delhi'), 200, 52, 'delhi'));
  assert.deepEqual(
    a.layers.map((l) => l.name),
    ['far', 'mid', 'near'],
  );
  for (const layer of a.layers) {
    assert.ok(layer.buildings.length > 8);
    for (const b of layer.buildings) {
      assert.ok(b.x >= 0 && b.x + b.w <= 200, 'building inside the width');
      assert.ok(b.h >= 4 && b.h <= 52, 'building inside the height');
    }
  }
  assert.notDeepEqual(a.layers, makeSkyline(seedFor('lucknow'), 200, 52, 'lucknow').layers);
});

test('Delhi gets its landmarks, other cities do not', () => {
  assert.deepEqual(
    makeSkyline(1, 200, 52, 'delhi').landmarks.map((l) => l.type),
    ['minar', 'gate'],
  );
  assert.deepEqual(makeSkyline(1, 200, 52, 'patna').landmarks, []);
});

test('windowLit is deterministic and lights roughly a quarter of windows', () => {
  assert.equal(windowLit(5, 3, 4, 0), windowLit(5, 3, 4, 0));
  let lit = 0;
  for (let x = 0; x < 60; x += 1) for (let y = 0; y < 40; y += 1) if (windowLit(9, x, y, 0)) lit += 1;
  assert.ok(lit / 2400 > 0.15 && lit / 2400 < 0.4, `lit share ${lit / 2400}`);
});

test('withAlpha appends an alpha channel and clamps it', () => {
  assert.equal(withAlpha('oklch(0.5 0.1 60)', 0.25), 'oklch(0.5 0.1 60 / 0.250)');
  assert.equal(withAlpha(' oklch(0.5 0.1 60) ', 2), 'oklch(0.5 0.1 60 / 1.000)');
});

test('easeOutCubic and clamp behave at the edges', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
  assert.equal(easeOutCubic(3), 1);
  assert.equal(clamp(5, 0, 1), 1);
});

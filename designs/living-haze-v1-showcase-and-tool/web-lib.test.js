import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, clearedDensity, densityFor, easeOutCubic, hash, letterTiming, makeBlobs, parseLayout, splitWords, stepBlob, withAlpha,
} from '../web/lib.js';

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

test('parseLayout prefers the URL, then storage, then showcase', () => {
  assert.equal(parseLayout('?layout=tool', 'showcase'), 'tool');
  assert.equal(parseLayout('?layout=showcase', 'tool'), 'showcase');
  assert.equal(parseLayout('', 'tool'), 'tool');
  assert.equal(parseLayout('?layout=evil', 'junk'), 'showcase');
  assert.equal(parseLayout(undefined, undefined), 'showcase');
});

test('splitWords splits on whitespace into letters and keeps Devanagari clusters whole', () => {
  assert.deepEqual(splitWords('Breathe  easy'), [Array.from('Breathe'), Array.from('easy')]);
  assert.deepEqual(splitWords('   '), []);
  assert.deepEqual(splitWords(null), []);
  const hindi = splitWords('स्वच्छ हवा');
  assert.equal(hindi.length, 2);
  if (typeof Intl.Segmenter === 'function') {
    assert.ok(hindi[0].length < Array.from('स्वच्छ').length, 'conjunct clusters are not split into code points');
  }
});

test('letterTiming is deterministic, staggered, and blurrier in thicker air', () => {
  assert.deepEqual(letterTiming(3, 0.5), letterTiming(3, 0.5));
  assert.ok(letterTiming(10, 0.5).delay > letterTiming(1, 0.5).delay);
  const thin = letterTiming(5, 0.1).blur;
  const thick = letterTiming(5, 1).blur;
  assert.ok(thick > thin);
  assert.ok(letterTiming(0, 1).blur <= 5 + 13 + 4);
});

test('hash stays in [0,1) and is stable', () => {
  for (let i = 0; i < 200; i += 1) {
    const h = hash(i);
    assert.ok(h >= 0 && h < 1);
    assert.equal(h, hash(i));
  }
});

test('makeBlobs is deterministic and fills the requested count', () => {
  const a = makeBlobs(20);
  assert.equal(a.length, 20);
  assert.deepEqual(a, makeBlobs(20));
  assert.ok(a.every((b) => b.r > 0.2 && b.r < 0.6 && [0, 1, 2].includes(b.tone)));
});

test('stepBlob drifts, wraps around the edge, and the pointer pushes then springs back', () => {
  const b = { x: 0.5, y: 0.5, r: 0.3, phase: 0, speed: 1, tone: 0, ox: 0, oy: 0 };
  stepBlob(b, 1, 1, null);
  assert.ok(b.x !== 0.5 || b.y !== 0.5);

  const wrap = { ...b, x: 1.7, speed: 1 };
  let wrapped = false;
  for (let i = 0; i < 4000; i += 1) {
    const before = wrap.x;
    stepBlob(wrap, i, 0.1, null);
    if (wrap.x < before - 1) wrapped = true;
    assert.ok(wrap.x <= 1 + 0.3 * 2.4 && wrap.x >= -0.3 * 2.4 - 1e-9, 'x stays inside the wrapped range');
  }
  assert.ok(wrapped, 'a blob re-enters from the far side only after leaving the frame');

  const pushed = { x: 0.5, y: 0.5, r: 0.3, phase: 0, speed: 1, tone: 0, ox: 0, oy: 0 };
  for (let i = 0; i < 20; i += 1) stepBlob(pushed, 0, 0.016, { x: 0.45, y: 0.5 });
  assert.ok(pushed.ox > 0, 'blob is pushed away from a pointer on its left');
  const peak = pushed.ox;
  for (let i = 0; i < 200; i += 1) stepBlob(pushed, 0, 0.016, null);
  assert.ok(Math.abs(pushed.ox) < peak * 0.05, 'offset springs back to rest');
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

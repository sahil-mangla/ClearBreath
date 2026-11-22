import assert from 'node:assert/strict';
import test from 'node:test';
import { createBudget } from '../../src/llm/budget.js';
import { createCache } from '../../src/llm/cache.js';

test('the budget allows up to the ceiling per minute, then refuses until the window rolls over', () => {
  let t = 0;
  const budget = createBudget({ maxCallsPerMin: 2, now: () => t });
  assert.equal(budget.take(), true);
  assert.equal(budget.take(), true);
  assert.equal(budget.take(), false);
  t = 59_999;
  assert.equal(budget.take(), false);
  t = 60_000;
  assert.equal(budget.take(), true);
});

test('the cache returns what was stored until it expires', () => {
  let t = 0;
  const cache = createCache({ ttlMs: 1000, max: 10, now: () => t });
  assert.equal(cache.recall('a'), undefined);
  cache.remember('a', { v: 1 });
  assert.deepEqual(cache.recall('a'), { v: 1 });
  t = 999;
  assert.deepEqual(cache.recall('a'), { v: 1 });
  t = 1000;
  assert.equal(cache.recall('a'), undefined);
});

test('a full cache drops its oldest entry first', () => {
  const cache = createCache({ ttlMs: 1000, max: 2, now: () => 0 });
  cache.remember('a', 1);
  cache.remember('b', 2);
  cache.remember('c', 3);
  assert.equal(cache.recall('a'), undefined);
  assert.equal(cache.recall('b'), 2);
  assert.equal(cache.recall('c'), 3);
});

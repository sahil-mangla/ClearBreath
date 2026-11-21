import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/ratelimit.js';

test('allows up to the limit then blocks until the window resets', () => {
  let t = 1000;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  assert.equal(rl.check('a').allowed, true);
  assert.equal(rl.check('a').allowed, true);
  const blocked = rl.check('a');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  t += 1001;
  assert.equal(rl.check('a').allowed, true);
});

test('keys are independent', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(rl.check('a').allowed, true);
  assert.equal(rl.check('b').allowed, true);
  assert.equal(rl.check('a').allowed, false);
});

test('a full key table evicts the oldest entry instead of locking every new caller out', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2, now: () => 0 });
  rl.check('a');
  rl.check('b');
  assert.equal(rl.check('c').allowed, true, 'a new caller is still served');
  assert.equal(rl.check('a').allowed, true, 'the evicted oldest key starts a fresh window');
  assert.equal(rl.check('c').allowed, false, 'a live key is still limited');
});

test('purges expired keys to make room', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 2, now: () => t });
  rl.check('a');
  rl.check('b');
  t = 2000;
  assert.equal(rl.check('c').allowed, true);
});

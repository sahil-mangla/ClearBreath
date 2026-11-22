import assert from 'node:assert/strict';
import test from 'node:test';
import { clientIp, HttpError, rateKey, SECURITY_HEADERS, sendJson } from '../../src/http.js';

const fakeRes = () => {
  const res = { status: 0, headers: {}, body: '' };
  res.writeHead = (status, headers) => Object.assign(res, { status, headers });
  res.end = (body = '') => Object.assign(res, { body });
  return res;
};

test('IPv4 addresses are their own rate-limit key', () => {
  assert.equal(rateKey('203.0.113.9'), '203.0.113.9');
  assert.equal(rateKey('::ffff:203.0.113.9'), '::ffff:203.0.113.9');
});

test('IPv6 addresses share one key per /64, however they are written', () => {
  const a = rateKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd');
  assert.equal(a, '2001:0db8:0001:0002::/64');
  assert.equal(rateKey('2001:db8:1:2::1'), a);
  assert.equal(rateKey('2001:db8:1:2:0:0:0:99'), a);
  assert.notEqual(rateKey('2001:db8:1:3::1'), a);
  assert.equal(rateKey('::1'), '0000:0000:0000:0000::/64');
});

test('clientIp uses the socket address, or the last forwarded hop only behind a trusted proxy', () => {
  const req = {
    socket: { remoteAddress: '198.51.100.7' },
    headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.5' },
  };
  assert.equal(clientIp(req, false), '198.51.100.7');
  assert.equal(clientIp(req, true), '203.0.113.5');
  assert.equal(clientIp({ socket: {}, headers: {} }, false), 'unknown');
  assert.equal(clientIp({ socket: { remoteAddress: '198.51.100.7' }, headers: {} }, true), '198.51.100.7');
});

test('sendJson sets the security headers, no-store caching and lets callers override', () => {
  const res = fakeRes();
  sendJson(res, 201, { ok: true }, { 'Cache-Control': 'public, max-age=60' });
  assert.equal(res.status, 201);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'public, max-age=60');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(res.headers[name], value);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
  const plain = fakeRes();
  sendJson(plain, 200, {});
  assert.equal(plain.headers['Cache-Control'], 'no-store');
});

test('HttpError carries its status and extra fields', () => {
  const err = new HttpError(429, 'slow down', { code: 'rate_limited' });
  assert.equal(err.status, 429);
  assert.equal(err.message, 'slow down');
  assert.equal(err.extra.code, 'rate_limited');
});

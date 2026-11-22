import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { SECURITY_HEADERS } from '../src/http.js';
import handler from '../api/index.js';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('vercel.json serves the committed public/ folder and rewrites only the API to the function', () => {
  assert.equal(config.outputDirectory, 'public');
  assert.ok(existsSync(new URL('../public/index.html', import.meta.url)));
  assert.ok(existsSync(new URL('../api/index.js', import.meta.url)));
  const sources = config.rewrites.map((r) => r.source);
  assert.deepEqual(sources.sort(), ['/api/:path*', '/healthz']);
  for (const r of config.rewrites) assert.equal(r.destination, '/api');
});

test('the deploy runs the front-end build and the full test suite before publishing', () => {
  assert.match(config.buildCommand, /npm run build/);
  assert.match(config.buildCommand, /npm test/);
  assert.ok(pkg.scripts.build && pkg.scripts.test);
});

test('static files on the CDN carry exactly the security headers the server sends', () => {
  const all = config.headers.find((h) => h.source === '/(.*)');
  const served = Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
  assert.deepEqual(served, SECURITY_HEADERS);
});

test('fonts are cached as immutable', () => {
  const fonts = config.headers.find((h) => h.source === '/fonts/(.*)');
  assert.match(fonts.headers.find((h) => h.key === 'Cache-Control').value, /immutable/);
});

test('the Node engine in package.json matches what Vercel is asked to run', () => {
  assert.match(pkg.engines.node, /22/);
});

// The Vercel function handler, driven through a real HTTP socket like a platform would.
async function call(method, path, { headers = {}, body } = {}) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers, body });
    return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
  } finally {
    server.close();
  }
}

test('function: /healthz and /api/cities answer, with the security headers', async () => {
  const health = await call('GET', '/healthz');
  assert.equal(health.status, 200);
  assert.equal(health.json.status, 'ok');
  const cities = await call('GET', '/api/cities');
  assert.equal(cities.status, 200);
  assert.equal(cities.json.cities.length, 22);
  assert.equal(cities.headers.get('x-content-type-options'), 'nosniff');
  assert.match(cities.headers.get('content-security-policy'), /default-src 'none'/);
});

test('function: it serves the API only, so a page request is a clean 404 and bad input is rejected', async () => {
  assert.equal((await call('GET', '/')).status, 404);
  assert.equal((await call('GET', '/api/nope')).status, 404);
  assert.equal((await call('POST', '/api/plan', { headers: { 'content-type': 'text/plain' }, body: 'x' })).status, 415);
  assert.equal((await call('GET', '/api/plan')).status, 405);
});

test('function: behind the platform proxy the rate limiter keys on X-Forwarded-For', async () => {
  const hit = (ip) => call('GET', '/api/cities', { headers: { 'x-forwarded-for': ip } });
  // The limit is 20 a minute per address; a different forwarded address has its own allowance.
  for (let i = 0; i < 20; i++) assert.equal((await hit('203.0.113.9')).status, 200);
  assert.equal((await hit('203.0.113.9')).status, 429);
  assert.equal((await hit('203.0.113.10')).status, 200);
});

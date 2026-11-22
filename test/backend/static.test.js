import assert from 'node:assert/strict';
import test from 'node:test';
import { loadStatic, serveStatic } from '../../src/static.js';

const PUBLIC = new URL('../../public', import.meta.url).pathname;
const files = loadStatic(PUBLIC);

const run = (route, headers = {}) => {
  const res = { status: 0, headers: {}, body: null };
  res.writeHead = (status, h) => Object.assign(res, { status, headers: h });
  res.end = (body = null) => Object.assign(res, { body });
  serveStatic(files.get(route), { headers }, res);
  return res;
};

test('only the known assets are loaded', () => {
  assert.ok(files.has('/'));
  assert.ok(files.has('/app.js'));
  assert.ok(!files.has('/server.js'));
  assert.ok(!files.has('/../package.json'));
});

test('text assets are gzipped on request and revalidated with an ETag', () => {
  const plain = run('/app.js');
  assert.equal(plain.status, 200);
  assert.equal(plain.headers['Cache-Control'], 'no-cache');
  assert.equal(plain.headers['Content-Encoding'], undefined);

  const zipped = run('/app.js', { 'accept-encoding': 'gzip, br' });
  assert.equal(zipped.headers['Content-Encoding'], 'gzip');
  assert.ok(zipped.body.length < plain.body.length);
  assert.notEqual(zipped.headers.ETag, plain.headers.ETag);
});

test('a matching If-None-Match gets a 304 with no body', () => {
  const first = run('/styles.css');
  const again = run('/styles.css', { 'if-none-match': first.headers.ETag });
  assert.equal(again.status, 304);
  assert.equal(again.body, null);
});

test('fonts are never gzipped and are cached for a year', () => {
  const font = run('/fonts/gloock-latin-400-normal.woff2', { 'accept-encoding': 'gzip' });
  assert.equal(font.status, 200);
  assert.equal(font.headers['Content-Encoding'], undefined);
  assert.match(font.headers['Cache-Control'], /immutable/);
  assert.equal(font.headers.ETag, undefined);
});

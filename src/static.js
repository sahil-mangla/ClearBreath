import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { SECURITY_HEADERS } from './http.js';

const WOFF2 = 'font/woff2';

// route -> [file under public/, content type]. Only these routes are ever served (no path traversal).
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/tokens.css': ['tokens.css', 'text/css; charset=utf-8'],
  '/base.css': ['base.css', 'text/css; charset=utf-8'],
  '/fonts/gloock-latin-400-normal.woff2': ['fonts/gloock-latin-400-normal.woff2', WOFF2],
  '/fonts/hanken-grotesk-latin-wght-normal.woff2': ['fonts/hanken-grotesk-latin-wght-normal.woff2', WOFF2],
  '/fonts/hanken-grotesk-latin-ext-wght-normal.woff2': [
    'fonts/hanken-grotesk-latin-ext-wght-normal.woff2',
    WOFF2,
  ],
};

/** Read every static file once at start-up: bytes, ETag and (except fonts, already compressed) a gzip copy. */
export function loadStatic(dir) {
  const files = new Map();
  for (const [route, [file, type]] of Object.entries(STATIC_FILES)) {
    const raw = fs.readFileSync(path.join(dir, file));
    const etag = `"${createHash('sha256').update(raw).digest('hex').slice(0, 20)}"`;
    files.set(route, { type, raw, etag, gzip: type === WOFF2 ? null : zlib.gzipSync(raw, { level: 9 }) });
  }
  return files;
}

/** Serve one loaded file. Pages, script and styles revalidate with an ETag (an unchanged file costs a 304). */
/**
 * @param {{type:string, raw:Buffer, etag:string, gzip:Buffer|null}} file one entry from loadStatic()
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function serveStatic(file, req, res) {
  const gzip = file.gzip !== null && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const immutable = file.type === WOFF2;
  const etag = immutable ? null : gzip ? file.etag.replace(/"$/, '-gzip"') : file.etag;

  if (etag && req.headers['if-none-match'] === etag) {
    res.writeHead(304, {
      ...SECURITY_HEADERS,
      'Cache-Control': 'no-cache',
      ETag: etag,
      Vary: 'Accept-Encoding',
    });
    res.end();
    return;
  }
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': file.type,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...(etag ? { ETag: etag } : {}),
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(gzip ? file.gzip : file.raw);
}

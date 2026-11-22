/** Small HTTP helpers shared by the server: headers, errors, body parsing, JSON replies, client identity. */

const MAX_BODY_BYTES = 8 * 1024;

export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** An error that maps to an HTTP response. `extra.headers` become response headers; the rest goes in the JSON body. */
export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/**
 * Send a JSON reply with the security headers.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers] extra headers, e.g. Cache-Control
 */
export function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

const tooLarge = () => new HttpError(413, 'Request body too large.', { code: 'too_large' });

/**
 * Read a small JSON body. Rejects with an HttpError for a wrong type, oversize body or invalid JSON.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<unknown>}
 */
export function readJson(req, res) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
      reject(new HttpError(415, 'Content-Type must be application/json.', { code: 'bad_type' }));
      return;
    }
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      reject(tooLarge());
      return;
    }
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // Chunked uploads have no Content-Length: stop buffering, answer 413,
        // then drop the connection once the response has been flushed.
        rejected = true;
        chunks.length = 0;
        res.once('finish', () => req.destroy());
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON.', { code: 'bad_json' }));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'Could not read request body.', { code: 'body_read' })));
  });
}

/** Expand an IPv6 address (with optional `::`) to its eight groups. */
function ipv6Groups(ip) {
  const [head, tail = ''] = ip.split('::');
  const first = head ? head.split(':') : [];
  const last = tail ? tail.split(':') : [];
  return [...first, ...Array(Math.max(0, 8 - first.length - last.length)).fill('0'), ...last];
}

/** One IPv6 subscriber usually owns a whole /64, so key on the /64 or a single host could mint endless keys. */
export function rateKey(ip) {
  if (!ip.includes(':') || ip.includes('.')) return ip; // IPv4 and IPv4-mapped addresses stay as they are
  return `${ipv6Groups(ip)
    .slice(0, 4)
    .map((g) => g.padStart(4, '0'))
    .join(':')}::/64`;
}

/** The caller's address for rate limiting. Behind a trusted proxy, the last X-Forwarded-For hop is used. */
/**
 * @param {import('node:http').IncomingMessage} req
 * @param {boolean} trustProxy
 */
export function clientIp(req, trustProxy) {
  let ip = req.socket.remoteAddress ?? 'unknown';
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '')
      .split(',')
      .pop()
      ?.trim();
    if (forwarded) ip = forwarded;
  }
  return rateKey(ip);
}

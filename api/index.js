/**
 * Vercel entry point. Vercel serves `public/` from its CDN and sends every `/api/*` and `/healthz` request here
 * (see vercel.json). The same request handler that `server.js` runs locally answers them, so behaviour is identical.
 * Behind Vercel the client address arrives in X-Forwarded-For, so the rate limiter trusts it by default.
 */
import { createApp } from '../src/app.js';

const server = createApp({ env: { TRUST_PROXY: '1', ...process.env }, publicDir: null });

export default function handler(req, res) {
  server.emit('request', req, res);
}

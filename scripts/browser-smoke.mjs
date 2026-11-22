// Browser smoke test: starts the server, drives real Chrome over the DevTools protocol and checks that
// the visuals mount, the page stays inside its CSP, and the main controls work. Not part of `npm test`
// (it needs Chrome); run it with `npm run test:browser`. Skips with exit 0 when no Chrome is found.
// The pieces live in scripts/smoke/: launch (processes), session (DevTools), pageScripts, checks.
import { installCspRecorder, runChecks } from './smoke/checks.mjs';
import { findChrome, startProcesses, until } from './smoke/launch.mjs';
import { connect } from './smoke/session.mjs';

const SERVER_PORT = 3217;
const DEBUG_PORT = 9317;
const BASE = `http://127.0.0.1:${SERVER_PORT}/`;

const chromePath = findChrome();
if (!chromePath) {
  console.log('browser-smoke: no Chrome found (set CHROME_PATH); skipping.');
  process.exit(0);
}

const cleanup = startProcesses({ chromePath, serverPort: SERVER_PORT, debugPort: DEBUG_PORT });
await until(async () => (await fetch(`${BASE}healthz`)).ok, 8000, 'the server');
const session = await connect({ debugPort: DEBUG_PORT, base: BASE });

/** @type {boolean[]} */
const results = [];
/** @type {import('./smoke/session.mjs').Check} */
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `  (${extra})`}`);
};

for (const domain of ['Runtime', 'Log', 'Page']) await session.send(`${domain}.enable`);
await session.send('Fetch.enable', { patterns: [{ urlPattern: '*api/air*' }] });
await installCspRecorder(session);
await runChecks(session, check);

const failed = results.filter((ok) => !ok).length;
console.log(
  failed ? `\n${failed} of ${results.length} checks failed` : `\nall ${results.length} checks passed`,
);
session.close();
cleanup();
process.exit(failed ? 1 : 0);

// Browser smoke test: starts the server, drives real Chrome over the DevTools protocol and checks that
// the visuals mount, the page stays inside its CSP, and the main controls work. Not part of `npm test`
// (it needs Chrome); run it with `npm run test:browser`. Skips with exit 0 when no Chrome is found.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SERVER_PORT = 3217;
const DEBUG_PORT = 9317;
const BASE = `http://127.0.0.1:${SERVER_PORT}/`;
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chromePath = CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.log('browser-smoke: no Chrome found (set CHROME_PATH); skipping.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(path.join(tmpdir(), 'cb-smoke-'));
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(SERVER_PORT), GEMINI_API_KEY: '' }, stdio: 'ignore' });
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let cleaned = false;
const cleanup = () => {
  if (cleaned) return;
  cleaned = true;
  chrome.kill();
  server.kill();
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* Chrome may still be flushing; the OS temp cleaner will take it */
  }
};
process.on('exit', cleanup);

async function until(fn, ms, what) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* retry */
    }
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(200);
  }
}

await until(async () => (await fetch(`${BASE}healthz`)).ok, 8000, 'the server');
const targets = await until(async () => (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find((t) => t.type === 'page'), 10000, 'Chrome');
const ws = new WebSocket(targets.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
const problems = []; // console errors, exceptions, CSP violations
let airLevel = { aqi: 350, levelIndex: 4, category: 'Very Poor', pm25: 250 };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push(`log: ${m.params.entry.text}`.slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') problems.push(`exception: ${JSON.stringify(m.params.exceptionDetails).slice(0, 200)}`);
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request } = m.params;
    if (request.url.includes('/api/air')) {
      const body = { city: { key: 'delhi', name: 'Delhi' }, air: { ...airLevel, dominant: 'PM2.5', observedAt: new Date().toISOString(), source: 'smoke-test' } };
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
    } else send('Fetch.continueRequest', { requestId });
  }
};
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(`page script failed: ${expression.slice(0, 80)}`);
  return r.result?.result?.value;
};
const load = async (query = '', { reduced = false, width = 1280, height = 800, mobile = false } = {}) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: `${BASE}${query}` });
  await until(() => js(`!!document.querySelector('.readout__num')`), 8000, 'the AQI readout');
  await sleep(600);
};
const fingerprint = (sel) => js(`(() => { const c = document.querySelector('${sel}'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i] + d[i + 3]) >>> 0; return s; })()`);

const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `  (${extra})`}`);
};

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*api/air*' }] });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));` });

// 1. Full effects: canvases mount and the smoke moves.
await load('?fx=full');
check('smoke canvases mount (page + header + toolset + footer)', (await js(`document.querySelectorAll('canvas.smoke').length`)) === 4);
check('pixel city canvas mounts', (await js(`!!document.querySelector('canvas.city')`)) === true);
const a = await fingerprint('.smoke--page');
const h1 = await fingerprint('.bar__smoke');
await sleep(2200);
check('page smoke moves between frames', a !== (await fingerprint('.smoke--page')));
check('header smoke moves between frames', h1 !== (await fingerprint('.bar__smoke')));
check('no CSP violations', (await js('window.__csp.length')) === 0, await js('window.__csp.join(", ")'));

// 2. Right-now actions follow the band.
check('"do these now" shows three urgent actions at AQI 350', (await js(`document.querySelectorAll('.now__list li').length`)) === 3 && (await js(`document.querySelector('.now').dataset.urgent`)) === 'true');

// 3. Dropdown is themed (no browser-default look).
const appearance = await js(`getComputedStyle(document.getElementById('city')).appearance`);
check('dropdowns are themed', appearance === 'base-select' || appearance === 'none', appearance);

// 4. Hindi interface.
await js(`[...document.querySelectorAll('.langs button')].find((b) => b.lang === 'hi').click()`);
await sleep(400);
check('Hindi toggle sets <html lang> and translates the interface', (await js('document.documentElement.lang')) === 'hi' && /[ऀ-ॿ]/.test(await js(`document.querySelector('.hero__lead').textContent`)) && /[ऀ-ॿ]/.test(await js(`document.querySelector('.plan-form legend').textContent`)));

// 4b. Whole page in Hindi: build a real plan (manual PM2.5, so no live air data is needed) and look for stray English.
const setValue = (sel, v) => js(`(() => { const el = document.querySelector('${sel}'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '${v}'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await setValue('#manualPm25', '240');
await js(`document.querySelector('.plan-form').requestSubmit()`);
await until(() => js(`document.querySelectorAll('.results .act').length > 3`), 8000, 'the Hindi plan');
await sleep(300);
const ALLOWED = /^(ClearBreath|AQI|PM|CPCB|SAFAR|CAMS|WHO|HEPA|GRAP|RWA|CAQM|PUC|LPG|PNG|NOx|CO|FFP|MERV|CADR|IST|PDF|LED|PE|AC|AI|Gemini|Open|Meteo|NCR|NAAQS|PM2|N95|SMOKE|PNG)$/i;
const words = await js(`(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || el.closest('[lang="en"]') || getComputedStyle(el).display === 'none') continue; (n.textContent.match(/[A-Za-z][A-Za-z'’]{2,}/g) || []).forEach((m) => out.push(m)); } return out; })()`);
const stray = [...new Set(words.filter((x) => !ALLOWED.test(x)))];
check('Hindi mode: no stray English words on the page (plan, alerts, notes, cities)', stray.length === 0, stray.slice(0, 12).join(', '));
check('Hindi plan text is labelled lang="hi" and says who translated it', (await js(`document.querySelector('.actions__list').lang`)) === 'hi' && /[ऀ-ॿ]/.test(await js(`document.querySelector('.results__english').textContent`)));
await js(`[...document.querySelectorAll('.langs button')].find((b) => b.lang === 'en').click()`);
await until(() => js(`document.querySelector('.actions__list')?.lang === 'en'`), 8000, 'the English plan');

// 5. Print layout keeps only the plan.
await send('Emulation.setEmulatedMedia', { media: 'print' });
check('print layout hides hero and smoke', (await js(`getComputedStyle(document.querySelector('.hero')).display`)) === 'none' && (await js(`getComputedStyle(document.querySelector('.smoke--page')).display`)) === 'none');
await send('Emulation.setEmulatedMedia', { media: '' });

// 6. Low-power mode draws one smoke canvas and no band smoke.
await load('?fx=lite');
check('low-power mode: one smoke canvas, no band smoke', (await js(`document.querySelectorAll('canvas.smoke').length`)) === 1 && (await js(`document.querySelectorAll('.smoke--band').length`)) === 0);

// 7. Reduced motion: smoke stays still and the pause button is gone.
await load('?fx=full', { reduced: true });
await sleep(1500); // the smoke settles to the live density for about a second, then must hold still
const r1 = await fingerprint('.smoke--page'); await sleep(1500);
check('reduced motion: smoke is still', r1 === (await fingerprint('.smoke--page')));
check('reduced motion: pause button hidden', (await js(`document.querySelectorAll('.bar__tools > button').length`)) === 0);

// 8. Phone width: no horizontal scroll.
await load('?fx=full', { width: 390, height: 844, mobile: true });
check('mobile: no horizontal scroll', (await js('document.documentElement.scrollWidth - document.documentElement.clientWidth')) <= 0);

check('no console errors or exceptions', problems.length === 0, problems.join(' | '));
const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} of ${results.length} checks failed` : `\nall ${results.length} checks passed`);
ws.close();
cleanup();
process.exit(failed ? 1 : 0);

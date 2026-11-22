// Starting and stopping the processes the browser smoke test needs: the app server and a headless Chrome.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** @param {number} ms */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The first Chrome or Chromium binary found on this machine, or undefined. */
export const findChrome = () => CANDIDATES.find((p) => typeof p === 'string' && existsSync(p));

/**
 * Retry `fn` every 200 ms until it returns something truthy; throws after `ms`.
 * @template T
 * @param {() => T | Promise<T>} fn
 * @param {number} ms
 * @param {string} what
 * @returns {Promise<NonNullable<T>>}
 */
export async function until(fn, ms, what) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* not ready yet: retry */
    }
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(200);
  }
}

// CI runners run as a container user without a usable sandbox or GPU, so Chrome needs these flags there.
const CI_FLAGS = ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];

/**
 * Start the server and Chrome. Returns `cleanup`, which stops both and removes Chrome's temporary profile.
 * @param {{chromePath:string, serverPort:number, debugPort:number}} options
 */
export function startProcesses({ chromePath, serverPort, debugPort }) {
  const profile = mkdtempSync(path.join(tmpdir(), 'cb-smoke-'));
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(serverPort), GEMINI_API_KEY: '' },
    stdio: 'ignore',
  });
  const flags = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--hide-scrollbars',
    ...(process.env.CI ? CI_FLAGS : []),
    'about:blank',
  ];
  const chrome = spawn(chromePath, flags, {
    stdio: ['ignore', 'ignore', process.env.CI ? 'inherit' : 'ignore'],
  });
  let cleaned = false;
  chrome.on('exit', (code) => {
    if (!cleaned) console.error(`browser-smoke: Chrome exited early (code ${code})`);
  });
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
  return cleanup;
}

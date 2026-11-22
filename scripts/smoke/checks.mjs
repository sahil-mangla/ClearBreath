// The browser smoke checks, one function per area of the page. Each takes the session and `check`.
import { sleep, until } from './launch.mjs';
import {
  canvasFingerprint,
  canvasOpacity,
  inPage,
  recordCspViolations,
  stackedWithoutOverlap,
  typeInto,
  visibleLatinWords,
} from './pageScripts.mjs';

/** @typedef {import('./session.mjs').Session} Session */
/** @typedef {import('./session.mjs').Check} Check */

const DEVANAGARI = /[ऀ-ॿ]/;

// Words that are fine in a Hindi page: names, acronyms and units that stay in Latin script.
const KEPT_LATIN = [
  ...['ClearBreath', 'AQI', 'PM', 'PM2', 'CPCB', 'SAFAR', 'CAMS', 'WHO', 'HEPA', 'GRAP', 'RWA', 'CAQM'],
  ...['PUC', 'LPG', 'PNG', 'NOx', 'CO', 'FFP', 'MERV', 'CADR', 'IST', 'PDF', 'LED', 'PE', 'AC', 'AI'],
  ...['Gemini', 'Open', 'Meteo', 'NCR', 'NAAQS', 'N95', 'SMOKE'],
];
const KEPT = new RegExp(`^(${KEPT_LATIN.join('|')})$`, 'i');

/**
 * Install the page-side CSP recorder; call once before the first page load.
 * @param {Session} s
 */
export const installCspRecorder = (s) =>
  s.send('Page.addScriptToEvaluateOnNewDocument', { source: `(${recordCspViolations})()` });

/** @param {Session} s */
const printHaze = (s) => s.js(inPage(canvasOpacity, '.results__smoke'));
/** @param {Session} s @param {string} lang */
const clickLang = (s, lang) =>
  s.js(`[...document.querySelectorAll('.langs button')].find((b) => b.lang === '${lang}').click()`);

/** @param {Session} s @param {Check} check */
async function fullEffects(s, check) {
  /** @param {string} sel */
  const fingerprint = (sel) => s.js(inPage(canvasFingerprint, sel));
  await s.load('?fx=full');
  check(
    'smoke canvases mount (page + header + toolset + footer)',
    (await s.js(`document.querySelectorAll('canvas.smoke').length`)) === 4,
  );
  check('pixel city canvas mounts', (await s.js(`!!document.querySelector('canvas.city')`)) === true);
  const page = await fingerprint('.smoke--page');
  const header = await fingerprint('.bar__smoke');
  await sleep(2200);
  check('page smoke moves between frames', page !== (await fingerprint('.smoke--page')));
  check('header smoke moves between frames', header !== (await fingerprint('.bar__smoke')));
  check(
    'no CSP violations',
    (await s.js('window.cspViolations.length')) === 0,
    await s.js('window.cspViolations.join(", ")'),
  );
}

/** @param {Session} s @param {Check} check */
async function readoutAndDropdown(s, check) {
  check(
    '"do these now" shows three urgent actions at AQI 350',
    (await s.js(`document.querySelectorAll('.now__list li').length`)) === 3 &&
      (await s.js(`document.querySelector('.now').dataset.urgent`)) === 'true',
  );
  const appearance = await s.js(`getComputedStyle(document.getElementById('city')).appearance`);
  check('dropdowns are themed', appearance === 'base-select' || appearance === 'none', appearance);
}

/** Switch to Hindi, build a real plan (manual PM2.5, so no live air data is needed) and look for stray English. */
/** @param {Session} s @param {Check} check */
async function hindi(s, check) {
  await clickLang(s, 'hi');
  await sleep(400);
  check(
    'Hindi toggle sets <html lang> and translates the interface',
    (await s.js('document.documentElement.lang')) === 'hi' &&
      DEVANAGARI.test(await s.js(`document.querySelector('.hero__lead').textContent`)) &&
      DEVANAGARI.test(await s.js(`document.querySelector('.plan-form legend').textContent`)),
  );
  await s.js(inPage(typeInto, '#manualPm25', '240'));
  await s.js(`document.querySelector('.plan-form').requestSubmit()`);
  await until(() => s.js(`document.querySelectorAll('.results .act').length > 3`), 8000, 'the Hindi plan');
  await sleep(300);
  const stray = [
    ...new Set((await s.js(inPage(visibleLatinWords))).filter((/** @type {string} */ w) => !KEPT.test(w))),
  ];
  check(
    'Hindi mode: no stray English words on the page (plan, alerts, notes, cities)',
    stray.length === 0,
    stray.slice(0, 12).join(', '),
  );
  check(
    'Hindi plan text is labelled lang="hi" and says who translated it',
    (await s.js(`document.querySelector('.actions__list').lang`)) === 'hi' &&
      DEVANAGARI.test(await s.js(`document.querySelector('.results__english').textContent`)),
  );
  await clickLang(s, 'en');
  await until(
    () => s.js(`document.querySelector('.actions__list')?.lang === 'en'`),
    8000,
    'the English plan',
  );
}

/** @param {Session} s @param {Check} check */
async function hazeSwitch(s, check) {
  /** @param {string} view */
  const choose = (view) => s.js(`document.querySelector('input[name="hazeView"][value="${view}"]').click()`);
  await choose('usual');
  await sleep(4500);
  const usual = await printHaze(s);
  await choose('plan');
  await sleep(4500);
  const plan = await printHaze(s);
  check(
    'the haze switch changes the smoke behind the results',
    plan < usual * 0.85,
    `usual ${usual.toFixed(1)} vs plan ${plan.toFixed(1)}`,
  );
}

/** @param {Session} s @param {Check} check */
async function printLayout(s, check) {
  await s.send('Emulation.setEmulatedMedia', { media: 'print' });
  check(
    'print layout hides hero and smoke',
    (await s.js(`getComputedStyle(document.querySelector('.hero')).display`)) === 'none' &&
      (await s.js(`getComputedStyle(document.querySelector('.smoke--page')).display`)) === 'none',
  );
  await s.send('Emulation.setEmulatedMedia', { media: '' });
}

/** @param {Session} s @param {Check} check */
async function lowPower(s, check) {
  await s.load('?fx=lite');
  check(
    'low-power mode: one smoke canvas, no band smoke',
    (await s.js(`document.querySelectorAll('canvas.smoke').length`)) === 1 &&
      (await s.js(`document.querySelectorAll('.smoke--band').length`)) === 0,
  );
}

/** @param {Session} s @param {Check} check */
async function reducedMotion(s, check) {
  const fingerprint = () => s.js(inPage(canvasFingerprint, '.smoke--page'));
  await s.load('?fx=full', { reduced: true });
  await sleep(1500); // the smoke settles to the live density for about a second, then must hold still
  const before = await fingerprint();
  await sleep(1500);
  check('reduced motion: smoke is still', before === (await fingerprint()));
  check(
    'reduced motion: pause button hidden',
    (await s.js(`document.querySelectorAll('.bar__tools > button').length`)) === 0,
  );
}

/** @param {Session} s @param {Check} check */
async function phoneWidth(s, check) {
  await s.load('?fx=full', { width: 390, height: 844, mobile: true });
  check(
    'mobile: no horizontal scroll',
    (await s.js('document.documentElement.scrollWidth - document.documentElement.clientWidth')) <= 0,
  );
  check(
    'mobile: the AQI scale bands stack without overlapping',
    await s.js(inPage(stackedWithoutOverlap, '.scale__band')),
  );
}

/**
 * Run every check in order; `check(name, ok, detail)` records and prints each result.
 * @param {Session} s @param {Check} check
 */
export async function runChecks(s, check) {
  for (const section of [fullEffects, readoutAndDropdown, hindi, hazeSwitch, printLayout]) {
    await section(s, check);
  }
  for (const section of [lowPower, reducedMotion, phoneWidth]) await section(s, check);
  check('no console errors or exceptions', s.problems.length === 0, s.problems.join(' | '));
}

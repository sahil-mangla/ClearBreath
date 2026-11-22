// Functions that run inside the page under test (sent to Chrome as source text with `inPage`), so they can
// be written, formatted and linted as ordinary code. They must not use anything from this file's scope.

/**
 * A cheap hash of a canvas's pixels: it changes when the picture moves.
 * @param {string} selector
 */
export function canvasFingerprint(selector) {
  const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector(selector));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 0;
  for (let i = 0; i < data.length; i += 97) hash = (hash * 31 + data[i] + data[i + 3]) >>> 0;
  return hash;
}

/**
 * The mean opacity of a canvas (sampled), a measure of how thick its smoke is.
 * @param {string} selector
 */
export function canvasOpacity(selector) {
  const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector(selector));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  let count = 0;
  for (let i = 3; i < data.length; i += 4 * 41) {
    sum += data[i];
    count += 1;
  }
  return sum / count;
}

/**
 * Type into a React-controlled input so its onChange fires.
 * @param {string} selector @param {string} value
 */
export function typeInto(selector, value) {
  const input = /** @type {HTMLInputElement} */ (document.querySelector(selector));
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Every visible English-looking word outside elements marked lang="en". */
export function visibleLatinWords() {
  const words = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    const skipped = !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || el.closest('[lang="en"]');
    if (skipped || getComputedStyle(el).display === 'none') continue;
    words.push(...((node.textContent ?? '').match(/[A-Za-z][A-Za-z'’]{2,}/g) || []));
  }
  return words;
}

/** Whether the elements matching `selector` sit one below the other without overlapping (a stacked list). */
export function stackedWithoutOverlap(/** @type {string} */ selector) {
  const boxes = [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect());
  return boxes.length > 1 && boxes.every((box, i) => i === 0 || box.top >= boxes[i - 1].bottom - 1);
}

/** Record CSP violations on `window.cspViolations`; installed before the page's own scripts run. */
export function recordCspViolations() {
  /** @type {string[]} */
  const seen = [];
  /** @type {any} */ (window).cspViolations = seen;
  document.addEventListener('securitypolicyviolation', (e) => {
    seen.push(`${e.violatedDirective} ${e.blockedURI}`);
  });
}

/**
 * The source text of a call to `fn(...args)`, for Runtime.evaluate.
 * @param {Function} fn @param {unknown[]} args
 */
export const inPage = (fn, ...args) => `(${fn})(${args.map((a) => JSON.stringify(a)).join(', ')})`;

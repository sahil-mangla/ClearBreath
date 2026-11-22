import { makePuffs, stepPuff } from './lib.js';
import { createPainter } from './smokePainter.js';
import { watchOnScreen } from './visibility.js';

const FRAME_MS = 33; // 30 fps is plenty for slow smoke and halves the cost
const LITE_FRAME_MS = 66; // lighter visuals: about 15 fps
const MIN_SCALE = 2;
const MAX_CANVAS_W = 960;
const LITE_CANVAS_W = 640;

/** @typedef {import('./types.js').SmokeState} SmokeState */
/** @typedef {import('./lib.js').Puff} Puff */
/** @typedef {{current:{x:number, y:number}|null}} Pointer */

/**
 * The frame loop: eases `state.current` toward `state.target`, steps the puffs and draws, at `frameMs` while
 * moving. Stops when nothing changes, when the tab is hidden and when the canvas is off screen.
 * @param {{state:SmokeState, puffs:Puff[], draw:() => void, frameMs:number, pointer:Pointer}} parts
 */
function createLoop({ state, puffs, draw, frameMs, pointer }) {
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let t = 0;
  let onScreen = true; // band canvases below the fold stop animating until scrolled into view

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  /** @param {number} now */
  const frame = (now) => {
    raf = 0;
    if (!onScreen) return;
    if (now - lastDraw < frameMs && state.motion) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.1, (now - last) / 1000 || 0.033);
    last = now;
    lastDraw = now;
    state.current += (state.target - state.current) * (1 - Math.exp(-dt * (state.motion ? 1.4 : 6)));
    if (Math.abs(state.target - state.current) < 0.002) state.current = state.target;
    if (state.motion) {
      t += dt;
      for (const p of puffs) stepPuff(p, t, dt, pointer.current);
    }
    draw();
    if (state.motion || state.current !== state.target) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || document.hidden || !onScreen) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  /** @param {boolean} visible */
  const setOnScreen = (visible) => {
    onScreen = visible;
    if (visible) kick();
    else stop();
  };

  return { kick, stop, setOnScreen };
}

/**
 * The page backdrop follows the window and the pointer; returns the function that removes the listeners.
 * @param {() => void} resize @param {Pointer} pointer
 */
function trackWindow(resize, pointer) {
  /** @param {PointerEvent} e */
  const onMove = (e) => {
    pointer.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
  };
  const onLeave = () => {
    pointer.current = null;
  };
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
  };
}

/**
 * The animation half. Starts drawing into `canvas` and returns a cleanup function. `state` is the shared,
 * mutable { target, current, motion, boost, kick } the component updates each render; the loop reads it every
 * frame and installs `state.kick` so the component can wake a stopped loop.
 * @param {HTMLCanvasElement} canvas @param {SmokeState} state @param {{page:boolean, lite:boolean}} options
 */
export function startSmoke(canvas, state, { page, lite }) {
  const ctx = canvas.getContext('2d', { alpha: !page });
  if (!ctx) return undefined;

  const maxW = lite ? LITE_CANVAS_W : MAX_CANVAS_W;
  const all = makePuffs(page ? 7 : 19);
  const puffs = lite ? all.filter((_, i) => i % 2 === 0) : all; // half the clouds on weak devices
  const size = { w: 2, h: 2 };
  /** @type {Pointer} */
  const pointer = { current: null };
  const draw = createPainter(ctx, { page, puffs, size, state });
  const loop = createLoop({
    state,
    puffs,
    draw,
    frameMs: lite ? LITE_FRAME_MS : FRAME_MS,
    pointer: page ? pointer : { current: null },
  });
  state.kick = loop.kick;

  const resize = () => {
    const cw = page ? window.innerWidth : canvas.clientWidth;
    const ch = page ? window.innerHeight : canvas.clientHeight;
    const scale = Math.max(MIN_SCALE, cw / maxW);
    size.w = Math.max(2, Math.ceil(cw / scale));
    size.h = Math.max(2, Math.ceil(ch / scale));
    canvas.width = size.w;
    canvas.height = size.h;
    draw();
  };
  const onVisibility = () => (document.hidden ? loop.stop() : loop.kick());

  resize();
  loop.kick();
  const ro = page ? null : new ResizeObserver(resize);
  ro?.observe(canvas);
  const untrackWindow = page ? trackWindow(resize, pointer) : () => {};
  const stopWatching = page ? () => {} : watchOnScreen(canvas, loop.setOnScreen);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    loop.stop();
    stopWatching();
    ro?.disconnect();
    untrackWindow();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

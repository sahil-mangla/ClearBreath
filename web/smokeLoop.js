import { SMOKE_LAYERS, clamp, makePuffs, stepPuff, withAlpha } from './lib.js';
import { buildGrain, buildSprite, token } from './smokeSprites.js';

const FRAME_MS = 33; // 30 fps is plenty for slow smoke and halves the cost
const LITE_FRAME_MS = 66; // lighter visuals: about 15 fps
const MIN_SCALE = 2;
const MAX_CANVAS_W = 960;
const LITE_CANVAS_W = 640;

/**
 * The drawing half: paints one frame of clouds (and, for the page backdrop, the paper, sun glow and grain).
 * `size` is the canvas's current { w, h }, read at draw time so a resize needs no new painter.
 */
function createPainter(ctx, { page, puffs, size, state }) {
  const paper = token('--color-paper');
  const ember = token('--haze-ember');
  const tones = [token('--haze-smoke'), token('--haze-ember'), token('--haze-clear')];
  const sprites = tones.map((c, ti) => [buildSprite(c, ti * 2 + 1), buildSprite(c, ti * 2 + 2)]);
  const grain = page ? ctx.createPattern(buildGrain(), 'repeat') : null;

  function paintBackdrop(d) {
    const { w, h } = size;
    ctx.globalAlpha = 1;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    // A low amber sun burning through the smog; stronger the thicker the air.
    const gx = w * 0.82;
    const gy = h * 0.96;
    const gr = Math.max(w, h) * 0.75;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, withAlpha(ember, 0.1 + 0.2 * d));
    glow.addColorStop(1, withAlpha(ember, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  function paintPuff(p, d, reach) {
    const { w, h } = size;
    const layer = SMOKE_LAYERS[p.layer];
    const weight = p.tone === 2 ? (1 - d) * 0.75 : p.tone === 1 ? 0.15 + 0.6 * d : 0.3 + 0.7 * d;
    const a = clamp(layer.alpha * weight, 0, 0.95);
    if (a < 0.02) return;
    const px = p.s * reach;
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate((p.x + p.ox) * w, (p.y + p.oy) * h);
    ctx.rotate(p.rot);
    if (!page) ctx.scale(1, 0.55);
    ctx.drawImage(sprites[p.tone][p.shape], -px / 2, -px / 2, px, px);
    ctx.restore();
  }

  return function draw() {
    const { w, h } = size;
    const d = clamp(state.current + state.boost, 0, 1);
    if (page) paintBackdrop(d);
    else ctx.clearRect(0, 0, w, h);
    const reach = page ? Math.max(w, h) : w * 0.7;
    for (const p of puffs) paintPuff(p, d, reach);
    ctx.globalAlpha = 1;
    if (grain) {
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

/**
 * The animation half. Starts drawing into `canvas` and returns a cleanup function. `state` is the shared,
 * mutable { target, current, motion, boost, kick } the component updates each render; the loop reads it every
 * frame and installs `state.kick` so the component can wake a stopped loop.
 */
export function startSmoke(canvas, state, { page, lite }) {
  const ctx = canvas.getContext('2d', { alpha: !page });
  if (!ctx) return undefined;

  const frameMs = lite ? LITE_FRAME_MS : FRAME_MS;
  const maxW = lite ? LITE_CANVAS_W : MAX_CANVAS_W;
  const all = makePuffs(page ? 7 : 19);
  const puffs = lite ? all.filter((_, i) => i % 2 === 0) : all; // half the clouds on weak devices
  const size = { w: 2, h: 2 };
  const draw = createPainter(ctx, { page, puffs, size, state });
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let t = 0;
  let pointer = null;
  let onScreen = true; // band canvases below the fold stop animating until scrolled into view

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

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
      for (const p of puffs) stepPuff(p, t, dt, page ? pointer : null);
    }
    draw();
    if (state.motion || state.current !== state.target) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || document.hidden || !onScreen) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  state.kick = kick;

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
  const onMove = (e) => {
    pointer = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
  };
  const onLeave = () => {
    pointer = null;
  };
  const onVisibility = () => (document.hidden ? stop() : kick());

  resize();
  kick();
  const ro = page ? null : new ResizeObserver(resize);
  ro?.observe(canvas);
  if (page) {
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
  }
  document.addEventListener('visibilitychange', onVisibility);
  const io =
    page || typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          if (onScreen) kick();
          else stop();
        });
  io?.observe(canvas);

  return () => {
    stop();
    io?.disconnect();
    ro?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

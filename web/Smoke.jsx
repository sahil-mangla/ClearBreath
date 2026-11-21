import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './hooks.js';
import { SMOKE_LAYERS, clamp, hash, makePuffs, stepPuff, withAlpha } from './lib.js';

const FRAME_MS = 33; // 30 fps is plenty for slow smoke and halves the cost
const LITE_FRAME_MS = 66; // lighter visuals: about 15 fps
const MIN_SCALE = 2;
const MAX_CANVAS_W = 960;
const LITE_CANVAS_W = 640;
const SPRITE = 192;

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** A soft, lumpy cloud sprite in one colour: many overlapping gradients, edges faded to nothing. */
function buildSprite(color, seed) {
  const c = document.createElement('canvas');
  c.width = SPRITE;
  c.height = SPRITE;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i += 1) {
    const a = hash(seed * 31 + i * 7) * Math.PI * 2;
    const d = Math.sqrt(hash(seed * 17 + i * 13)) * SPRITE * 0.3;
    const x = SPRITE / 2 + Math.cos(a) * d;
    const y = SPRITE / 2 + Math.sin(a) * d * 0.75;
    const r = SPRITE * (0.12 + hash(seed * 5 + i * 3) * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, withAlpha(color, 0.34));
    grad.addColorStop(1, withAlpha(color, 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(SPRITE / 2, SPRITE / 2, SPRITE * 0.08, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  m.addColorStop(0, 'rgb(0 0 0 / 1)');
  m.addColorStop(1, 'rgb(0 0 0 / 0)');
  g.fillStyle = m;
  g.fillRect(0, 0, SPRITE, SPRITE);
  return c;
}

/** Fine static noise, tiled over the page: breaks up gradient banding and gives the smoke some grit. */
function buildGrain() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = c.getContext('2d');
  const img = g.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = hash(i * 3 + 11) > 0.5 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 11;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Drifting smoke clouds. `density` is the air quality: thick amber-grey smoke when the AQI is high,
 * thin cool wisps when it is low. Three parallax layers drift on the wind and the pointer parts them.
 *  - variant "page": fixed full-viewport backdrop with a low amber sun glow and grain.
 *  - variant "band": a transparent strip (header, footer, behind the city) that fills its parent.
 * `lite` halves the clouds, the frame rate and the canvas size for weak devices.
 * Stops when the tab is hidden, when paused, and under reduced motion (which still draws the smoke, still).
 */
export default function Smoke({ density, paused, variant = 'page', boost = 0, className = '', lite = false }) {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const motion = !paused && !reduced;
  const shared = useRef({ target: density, current: density, motion, boost, kick: () => {} });

  shared.current.target = density;
  shared.current.motion = motion;
  shared.current.boost = boost;

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = variant === 'page';
    const ctx = canvas.getContext('2d', { alpha: !page });
    if (!ctx) return undefined;

    const s = shared.current;
    const frameMs = lite ? LITE_FRAME_MS : FRAME_MS;
    const maxW = lite ? LITE_CANVAS_W : MAX_CANVAS_W;
    const all = makePuffs(page ? 7 : 19);
    const puffs = lite ? all.filter((_, i) => i % 2 === 0) : all; // half the clouds on weak devices
    const paper = token('--color-paper');
    const tones = [token('--haze-smoke'), token('--haze-ember'), token('--haze-clear')];
    const sprites = tones.map((c, ti) => [buildSprite(c, ti * 2 + 1), buildSprite(c, ti * 2 + 2)]);
    const ember = token('--haze-ember');
    const grain = page ? ctx.createPattern(buildGrain(), 'repeat') : null;
    let w = 2;
    let h = 2;
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let t = 0;
    let pointer = null;
    let onScreen = true; // band canvases below the fold stop animating until scrolled into view

    const draw = () => {
      const d = clamp(s.current + s.boost, 0, 1);
      if (page) {
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
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const reach = page ? Math.max(w, h) : w * 0.7;
      for (const p of puffs) {
        const layer = SMOKE_LAYERS[p.layer];
        const weight = p.tone === 2 ? (1 - d) * 0.75 : p.tone === 1 ? 0.15 + 0.6 * d : 0.3 + 0.7 * d;
        const a = clamp(layer.alpha * weight, 0, 0.95);
        if (a < 0.02) continue;
        const size = p.s * reach;
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate((p.x + p.ox) * w, (p.y + p.oy) * h);
        ctx.rotate(p.rot);
        if (!page) ctx.scale(1, 0.55);
        ctx.drawImage(sprites[p.tone][p.shape], -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (grain) {
        ctx.fillStyle = grain;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const frame = (now) => {
      raf = 0;
      if (!onScreen) return;
      if (now - lastDraw < frameMs && s.motion) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000 || 0.033);
      last = now;
      lastDraw = now;
      s.current += (s.target - s.current) * (1 - Math.exp(-dt * (s.motion ? 1.4 : 6)));
      if (Math.abs(s.target - s.current) < 0.002) s.current = s.target;
      if (s.motion) {
        t += dt;
        for (const p of puffs) stepPuff(p, t, dt, page ? pointer : null);
      }
      draw();
      if (s.motion || s.current !== s.target) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || document.hidden || !onScreen) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    s.kick = kick;

    const resize = () => {
      const cw = page ? window.innerWidth : canvas.clientWidth;
      const ch = page ? window.innerHeight : canvas.clientHeight;
      const scale = Math.max(MIN_SCALE, cw / maxW);
      w = Math.max(2, Math.ceil(cw / scale));
      h = Math.max(2, Math.ceil(ch / scale));
      canvas.width = w;
      canvas.height = h;
      draw();
    };
    const onMove = (e) => {
      pointer = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    const onLeave = () => {
      pointer = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else kick();
    };

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
            else {
              cancelAnimationFrame(raf);
              raf = 0;
            }
          });
    io?.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [variant, lite]);

  useEffect(() => {
    shared.current.kick();
  }, [density, motion, boost]);

  return <canvas ref={canvasRef} className={`smoke smoke--${variant} ${className}`.trim()} aria-hidden="true" />;
}

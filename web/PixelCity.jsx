import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './hooks.js';
import { clamp, makeSkyline, seedFor, windowLit } from './lib.js';

const PIXEL = 5; // CSS pixels per art pixel
const TICK_MS = 1400; // windows flicker slowly, at a few frames per second at most

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function drawBuilding(ctx, b, rows, seedBase, lit, litAlpha, litColor) {
  const top = rows - b.h;
  ctx.fillRect(b.x, top, b.w, b.h);
  if (b.roof === 'step' && b.w > 5) ctx.fillRect(b.x + 1, top - 2, b.w - 2, 2);
  if (b.roof === 'spire') ctx.fillRect(b.x + Math.floor(b.w / 2), top - 5, 1, 5);
  if (!lit) return;
  const prev = ctx.fillStyle;
  const prevAlpha = ctx.globalAlpha;
  ctx.fillStyle = litColor;
  ctx.globalAlpha = litAlpha;
  for (let y = top + 2; y < rows - 2; y += 3) {
    for (let x = b.x + 1; x < b.x + b.w - 1; x += 2) {
      if (lit(seedBase, x, y)) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = prev;
  ctx.globalAlpha = prevAlpha;
}

function drawLandmark(ctx, m, rows) {
  const base = rows;
  if (m.type === 'minar') {
    // A tapering fluted tower in stacked tiers, topped with a small cupola.
    const tiers = 5;
    const tierH = Math.floor(m.h / tiers);
    for (let i = 0; i < tiers; i += 1) {
      const w = Math.max(2, m.w - i);
      const x = m.x + Math.floor((m.w - w) / 2);
      ctx.fillRect(x, base - (i + 1) * tierH, w, tierH);
      if (i < tiers - 1) ctx.fillRect(x - 1, base - (i + 1) * tierH, w + 2, 1); // balcony
    }
    ctx.fillRect(m.x + Math.floor(m.w / 2) - 1, base - m.h - 2, 2, 2);
  } else {
    // A war-memorial arch: two piers, a lintel and a stepped top, with the opening cut through.
    ctx.fillRect(m.x, base - m.h, m.w, m.h);
    ctx.fillRect(m.x + 2, base - m.h - 2, m.w - 4, 2);
    ctx.fillRect(m.x + 4, base - m.h - 3, m.w - 8, 1);
    const ow = Math.floor(m.w * 0.42);
    ctx.clearRect(
      m.x + Math.floor((m.w - ow) / 2),
      base - Math.floor(m.h * 0.72),
      ow,
      Math.floor(m.h * 0.72),
    );
  }
}

/**
 * A pixel-art skyline for the chosen city, drawn on a tiny canvas and scaled up without smoothing.
 * Distant towers fade out as the air thickens, so the skyline doubles as a visibility gauge.
 * Windows glow amber and a few flicker. Decorative only.
 */
export default function PixelCity({ city, density, still = false }) {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const live = useRef({ density, city });
  const redrawRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const colors = {
      far: token('--haze-smoke'),
      mid: token('--color-paper-3'),
      near: token('--color-paper'),
      lit: token('--color-accent'),
    };
    let sky = null;
    let tick = 0;
    let timer = 0;
    let onScreen = true;

    const render = () => {
      if (!sky) return;
      const { density: d, city: key } = live.current;
      const seed = seedFor(key);
      ctx.clearRect(0, 0, sky.cols, sky.rows);
      const [far, mid, near] = sky.layers;
      // Far towers vanish into thick smog; mid ones dim; the near row stays solid.
      const draw = (layer, color, alpha, litAlpha, base) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        for (const b of layer.buildings) {
          drawBuilding(
            ctx,
            b,
            sky.rows,
            seed + base,
            litAlpha ? (sd, x, y) => windowLit(sd, x, y, tick) : null,
            litAlpha,
            colors.lit,
          );
        }
        ctx.globalAlpha = 1;
      };
      draw(far, colors.far, clamp(0.75 - d * 0.5, 0.2, 0.75), 0, 1);
      draw(mid, colors.mid, clamp(1 - d * 0.35, 0.6, 1), 0.45, 2);
      ctx.fillStyle = colors.near;
      draw(near, colors.near, 1, 0.9, 3);
      ctx.fillStyle = colors.near;
      for (const m of sky.landmarks) drawLandmark(ctx, m, sky.rows);
      ctx.globalAlpha = 1;
    };

    const build = () => {
      const cols = Math.max(40, Math.floor(canvas.clientWidth / PIXEL));
      const rows = Math.max(24, Math.floor(canvas.clientHeight / PIXEL));
      canvas.width = cols;
      canvas.height = rows;
      sky = makeSkyline(seedFor(live.current.city), cols, rows, live.current.city);
      render();
    };

    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
          });
    io?.observe(canvas);
    build();
    if (!reduced && !still) {
      timer = window.setInterval(() => {
        if (document.hidden || !onScreen) return;
        tick += 1;
        render();
      }, TICK_MS);
    }
    redrawRef.current = () => {
      sky = makeSkyline(seedFor(live.current.city), canvas.width, canvas.height, live.current.city);
      render();
    };
    return () => {
      ro.disconnect();
      io?.disconnect();
      window.clearInterval(timer);
    };
  }, [reduced, still]);

  // City or haze changed: rebuild the skyline for it and repaint.
  useEffect(() => {
    live.current = { density, city };
    redrawRef.current?.();
  }, [city, density]);

  return <canvas ref={canvasRef} className="city" aria-hidden="true" />;
}

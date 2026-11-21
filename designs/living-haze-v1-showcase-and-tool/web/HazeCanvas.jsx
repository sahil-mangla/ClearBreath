import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './hooks.js';
import { clamp, makeBlobs, stepBlob, withAlpha } from './lib.js';

const BLOB_COUNT = 20;
// Draw at half the viewport (at most 960 px wide) and let the browser smooth the upscale.
// Coarser than this magnifies the gradient dithering into a visible grid.
const MIN_SCALE = 2;
const MAX_CANVAS_W = 960;

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Full-viewport drifting haze. Its density is the air quality: thick amber smoke when the AQI is high,
 * thinning to faint clear-air teal as `density` falls. Density changes ease in rather than jump.
 * The pointer parts the haze. Stops when the tab is hidden, when paused, and under reduced motion
 * (which still settles to the right density, drawn still).
 */
export default function HazeCanvas({ density, paused }) {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const motion = !paused && !reduced;
  const shared = useRef({ target: density, current: density, motion, kick: () => {} });

  shared.current.target = density;
  shared.current.motion = motion;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const s = shared.current;
    const blobs = makeBlobs(BLOB_COUNT);
    const paper = token('--color-paper');
    const tones = [token('--haze-smoke'), token('--haze-ember'), token('--haze-clear')];
    let w = 2;
    let h = 2;
    let raf = 0;
    let last = 0;
    let t = 0;
    let pointer = null;

    const draw = () => {
      const d = s.current;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
      const reach = Math.max(w, h);
      for (const b of blobs) {
        const x = (b.x + b.ox) * w;
        const y = (b.y + b.oy) * h;
        const r = b.r * reach;
        // Clear-air teal fades in as the haze thins; ember is the quieter smoke tone.
        const weight = b.tone === 2 ? (1 - d) * 0.55 : d * (b.tone === 1 ? 0.7 : 1);
        const a = clamp(0.5 * weight, 0, 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, withAlpha(tones[b.tone], a));
        g.addColorStop(1, withAlpha(tones[b.tone], 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      s.current += (s.target - s.current) * (1 - Math.exp(-dt * (s.motion ? 1.4 : 6)));
      if (Math.abs(s.target - s.current) < 0.002) s.current = s.target;
      if (s.motion) {
        t += dt;
        for (const b of blobs) stepBlob(b, t, dt, pointer);
      }
      draw();
      if (s.motion || s.current !== s.target) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    s.kick = kick;

    const resize = () => {
      const scale = Math.max(MIN_SCALE, window.innerWidth / MAX_CANVAS_W);
      w = Math.max(2, Math.ceil(window.innerWidth / scale));
      h = Math.max(2, Math.ceil(window.innerHeight / scale));
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
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Restart the loop when the target density or the motion setting changes.
  useEffect(() => {
    shared.current.kick();
  }, [density, motion]);

  return <canvas ref={canvasRef} className="haze" aria-hidden="true" />;
}

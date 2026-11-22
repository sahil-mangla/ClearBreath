import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './hooks.js';
import { seedFor } from './lib.js';
import { paintSkyline } from './pixelArt.js';
import { makeSkyline } from './skyline.js';
import { token } from './smokeSprites.js';
import { watchOnScreen } from './visibility.js';

const PIXEL = 5; // CSS pixels per art pixel
const TICK_MS = 1400; // windows flicker slowly, at a few frames per second at most

/** @typedef {{density:number, city:string}} CityState */

/**
 * Start drawing the skyline into `canvas`. `live` holds the current { density, city }, read at draw time.
 * Returns `redraw` (rebuild for a new city or haze) and `stop`.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {{current:CityState}} live
 * @param {boolean} animated whether the windows flicker
 */
function startCity(canvas, ctx, live, animated) {
  const colors = {
    far: token('--haze-smoke'),
    mid: token('--color-paper-3'),
    near: token('--color-paper'),
    lit: token('--color-accent'),
  };
  let sky = /** @type {import('./skyline.js').Skyline|null} */ (null);
  let tick = 0;
  let onScreen = true;

  const render = () => {
    if (!sky) return;
    const { density, city } = live.current;
    paintSkyline(ctx, sky, { density, seed: seedFor(city), tick, colors });
  };
  /** @param {number} cols @param {number} rows */
  const rebuild = (cols, rows) => {
    const { city } = live.current;
    sky = makeSkyline(seedFor(city), cols, rows, city);
    render();
  };
  const resize = () => {
    canvas.width = Math.max(40, Math.floor(canvas.clientWidth / PIXEL));
    canvas.height = Math.max(24, Math.floor(canvas.clientHeight / PIXEL));
    rebuild(canvas.width, canvas.height);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const stopWatching = watchOnScreen(canvas, (visible) => {
    onScreen = visible;
  });
  resize();
  const timer = animated
    ? window.setInterval(() => {
        if (document.hidden || !onScreen) return;
        tick += 1;
        render();
      }, TICK_MS)
    : 0;

  return {
    redraw: () => rebuild(canvas.width, canvas.height),
    stop: () => {
      ro.disconnect();
      stopWatching();
      window.clearInterval(timer);
    },
  };
}

/**
 * A pixel-art skyline for the chosen city, drawn on a tiny canvas and scaled up without smoothing.
 * Distant towers fade out as the air thickens, so the skyline doubles as a visibility gauge.
 * Windows glow amber and a few flicker. Decorative only.
 * @param {{city:string, density:number, still?:boolean}} props
 */
export default function PixelCity({ city, density, still = false }) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement|null} */ (null));
  const reduced = usePrefersReducedMotion();
  const live = useRef(/** @type {CityState} */ ({ density, city }));
  const redrawRef = useRef(/** @type {(() => void)|null} */ (null));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const { redraw, stop } = startCity(canvas, ctx, live, !reduced && !still);
    redrawRef.current = redraw;
    return stop;
  }, [reduced, still]);

  // City or haze changed: rebuild the skyline for it and repaint.
  useEffect(() => {
    live.current = { density, city };
    redrawRef.current?.();
  }, [city, density]);

  return <canvas ref={canvasRef} className="city" aria-hidden="true" />;
}

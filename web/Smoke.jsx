import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './hooks.js';
import { startSmoke } from './smokeLoop.js';

/**
 * Drifting smoke clouds. `density` is the air quality: thick amber-grey smoke when the AQI is high,
 * thin cool wisps when it is low. Three parallax layers drift on the wind and the pointer parts them.
 *  - variant "page": fixed full-viewport backdrop with a low amber sun glow and grain.
 *  - variant "band": a transparent strip (header, footer, behind the city) that fills its parent.
 * `lite` halves the clouds, the frame rate and the canvas size for weak devices.
 * Stops when the tab is hidden, when paused, and under reduced motion (which still draws the smoke, still).
 * The drawing and the loop live in ./smokeLoop.js; this component only owns the canvas and passes props in.
 * @param {{density:number, paused?:boolean, variant?:'page'|'band', boost?:number, className?:string,
 *   lite?:boolean}} props
 */
export default function Smoke({
  density,
  paused,
  variant = 'page',
  boost = 0,
  className = '',
  lite = false,
}) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement|null} */ (null));
  const reduced = usePrefersReducedMotion();
  const motion = !paused && !reduced;
  const shared = useRef(
    /** @type {import('./types.js').SmokeState} */ ({
      target: density,
      current: density,
      motion,
      boost,
      kick: () => {},
    }),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    return canvas ? startSmoke(canvas, shared.current, { page: variant === 'page', lite }) : undefined;
  }, [variant, lite]);

  // Hand the latest props to the running animation loop (it reads them every frame), then wake it.
  useEffect(() => {
    const s = shared.current;
    s.target = density;
    s.motion = motion;
    s.boost = boost;
    s.kick();
  }, [density, motion, boost]);

  return (
    <canvas ref={canvasRef} className={`smoke smoke--${variant} ${className}`.trim()} aria-hidden="true" />
  );
}

import { useEffect, useRef, useState } from 'react';
import { getAir } from './api.js';
import { easeOutCubic } from './lib.js';
import { isLowPower } from './power.js';

const REDUCED = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia(REDUCED).matches);
  useEffect(() => {
    const mq = matchMedia(REDUCED);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Smoothly tween a number toward `target` (jumps straight there under reduced motion). */
export function useTween(target, ms = 900) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (reduced || target === current.current) {
      current.current = target;
      setValue(target);
      return undefined;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      current.current = from + (target - from) * easeOutCubic(p);
      setValue(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return value;
}

const airCache = new Map(); // city -> {at, data}
const AIR_TTL_MS = 120_000;

/** Live reading for a city: {status: 'loading'|'ok'|'error', data, error}. */
export function useLiveAir(city) {
  const [state, setState] = useState(
    /** @type {import('./types.js').LiveAir} */ ({ status: 'loading', data: null, error: '' }),
  );
  useEffect(() => {
    if (!city) return undefined;
    const hit = airCache.get(city);
    if (hit && Date.now() - hit.at < AIR_TTL_MS) {
      // oxlint-disable-next-line react/set-state-in-effect -- syncing component state with an external (module-level) cache
      setState({ status: 'ok', data: hit.data, error: '' });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: '' });
    getAir(city, controller.signal)
      .then((data) => {
        airCache.set(city, { at: Date.now(), data });
        setState({ status: 'ok', data, error: '' });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', data: null, error: err.message });
      });
    return () => controller.abort();
  }, [city]);
  return state;
}

/** True on devices likely to struggle with several animated canvases (decided once per page load). */
export function useLowPower() {
  const [low] = useState(() => isLowPower(navigator, location.search));
  return low;
}

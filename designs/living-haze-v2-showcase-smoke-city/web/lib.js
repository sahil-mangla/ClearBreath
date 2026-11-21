// Pure helpers for the front end (no DOM, no React) so they can be unit-tested in Node.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic 0..1 hash (mulberry32 step). Same input, same output: no flicker between renders. */
export function hash(n) {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Stable integer seed from a string (city key etc). */
export function seedFor(str) {
  let h = 2166136261;
  for (const ch of String(str ?? '')) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** How thick the haze is drawn for an AQI value (0-500). Never fully clear, never fully opaque. */
export function densityFor(aqi) {
  const v = clamp(Number(aqi) || 0, 0, 500);
  return clamp(0.08 + 0.92 * (v / 400) ** 0.85, 0.08, 1);
}

/** Haze density after following the plan: thinned by the estimated exposure reduction (capped at 90%). */
export function clearedDensity(density, reductionPct) {
  return clamp(density * (1 - clamp(Number(reductionPct) || 0, 0, 90) / 100), 0.05, 1);
}

/** Split text into words of grapheme clusters (keeps Devanagari conjuncts whole). */
export function splitWords(text) {
  const seg =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  const graphemes = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
  return String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(graphemes);
}

/**
 * Per-letter timing for the "resolving out of smog" text. Thicker air starts blurrier.
 * @param {number} i      letter index across the whole string
 * @param {number} density 0..1
 */
export function letterTiming(i, density, salt = 1) {
  const r = hash(i * 97 + salt * 131);
  const r2 = hash(i * 57 + salt * 17 + 3);
  return {
    delay: Math.round(i * 14 + r * 100),
    blur: Math.round(5 + clamp(density, 0, 1) * 13 + r2 * 4),
    rise: Math.round((r2 - 0.5) * 14),
  };
}

/* ------------------------------------------------------------------ *
 * Smoke clouds: puffs drifting on the wind, in three parallax layers.  *
 * ------------------------------------------------------------------ */

/** Layer 0 is the far, slow, large bank; layer 2 is the near, quick, small wisps. */
export const SMOKE_LAYERS = Object.freeze([
  { count: 6, size: [0.55, 0.95], speed: [0.010, 0.018], alpha: 0.55 },
  { count: 8, size: [0.35, 0.65], speed: [0.020, 0.032], alpha: 0.7 },
  { count: 7, size: [0.22, 0.42], speed: [0.036, 0.055], alpha: 0.8 },
]);

/** Puffs in normalised 0..1 space; `s` is size as a fraction of the canvas's longer side. */
export function makePuffs(seed = 7) {
  const puffs = [];
  let i = 0;
  SMOKE_LAYERS.forEach((L, layer) => {
    for (let k = 0; k < L.count; k += 1, i += 1) {
      const r = (n) => hash(i * 31 + seed * 7 + n);
      puffs.push({
        layer,
        x: r(1) * 1.3 - 0.15,
        y: r(2),
        s: L.size[0] + r(3) * (L.size[1] - L.size[0]),
        vx: L.speed[0] + r(4) * (L.speed[1] - L.speed[0]),
        phase: r(5) * Math.PI * 2,
        rot: r(6) * Math.PI * 2,
        vr: (r(7) - 0.5) * 0.06,
        tone: i % 3,
        shape: i % 2,
        ox: 0,
        oy: 0,
      });
    }
  });
  return puffs;
}

/**
 * Advance one puff by dt seconds: wind drift left to right, a slow vertical bob and spin, wrap-around
 * once fully off-screen, and a spring-back offset that lets the pointer part the cloud.
 * @param {object} p puff (mutated)
 * @param {number} t seconds since start
 * @param {{x:number,y:number}|null} pointer normalised
 */
export function stepPuff(p, t, dt, pointer) {
  p.x += p.vx * dt;
  p.y += Math.sin(t * 0.25 + p.phase) * 0.012 * dt;
  p.rot += p.vr * dt;
  const edge = p.s * 1.2; // wide on a tall viewport, so wrap only once the whole puff has left the frame
  if (p.x > 1 + edge) p.x = -edge;

  if (pointer) {
    const dx = p.x + p.ox - pointer.x;
    const dy = p.y + p.oy - pointer.y;
    const d2 = dx * dx + dy * dy;
    const reach = 0.06;
    if (d2 < reach && d2 > 1e-9) {
      const d = Math.sqrt(d2);
      const push = (1 - d / Math.sqrt(reach)) * 0.9 * dt * 0.5;
      p.ox += (dx / d) * push;
      p.oy += (dy / d) * push;
    }
  }
  const spring = Math.exp(-dt * 1.6);
  p.ox *= spring;
  p.oy *= spring;
}

/* ------------------------------------------------------------------ *
 * Pixel city: a deterministic skyline in three layers.                 *
 * ------------------------------------------------------------------ */

const LANDMARKS = Object.freeze({
  delhi: [{ type: 'minar', at: 0.18 }, { type: 'gate', at: 0.64 }],
  mumbai: [{ type: 'gate', at: 0.5 }],
});

const SKYLINE_LAYERS = Object.freeze([
  { name: 'far', hMin: 0.25, hMax: 0.55, wMin: 5, wMax: 10, gap: [0, 1] },
  { name: 'mid', hMin: 0.3, hMax: 0.68, wMin: 6, wMax: 12, gap: [0, 2] },
  { name: 'near', hMin: 0.22, hMax: 0.62, wMin: 8, wMax: 15, gap: [1, 3] },
]);

/**
 * @param {number} seed
 * @param {number} cols pixels across
 * @param {number} rows pixels tall
 * @param {string} [cityKey] picks landmarks
 * @returns {{cols:number, rows:number, layers:{name:string, buildings:{x:number,w:number,h:number,roof:'flat'|'step'|'spire'}[]}[], landmarks:{type:string,x:number,w:number,h:number}[]}}
 */
export function makeSkyline(seed, cols, rows, cityKey) {
  const layers = SKYLINE_LAYERS.map((L, li) => {
    const buildings = [];
    let x = 0;
    let n = 0;
    while (x < cols) {
      const r = (k) => hash(seed * 13 + li * 1009 + n * 17 + k);
      const w = Math.min(cols - x, L.wMin + Math.floor(r(1) * (L.wMax - L.wMin + 1)));
      const h = Math.max(4, Math.round(rows * (L.hMin + r(2) * (L.hMax - L.hMin))));
      const roof = r(3) > 0.78 ? 'spire' : r(3) > 0.5 ? 'step' : 'flat';
      buildings.push({ x, w, h, roof });
      x += w + L.gap[0] + Math.floor(r(4) * (L.gap[1] - L.gap[0] + 1));
      n += 1;
    }
    return { name: L.name, buildings };
  });

  const landmarks = (LANDMARKS[cityKey] ?? []).map(({ type, at }) =>
    type === 'minar'
      ? { type, x: Math.round(cols * at), w: Math.max(5, Math.round(rows * 0.11)), h: Math.round(rows * 0.82) }
      : { type, x: Math.round(cols * at), w: Math.max(14, Math.round(rows * 0.3)), h: Math.round(rows * 0.34) },
  );
  return { cols, rows, layers, landmarks };
}

/** Whether the window at (x, y) of a building is lit; `tick` flips a few of them over time. */
export function windowLit(seed, x, y, tick = 0) {
  const base = hash(seed + x * 7 + y * 13);
  const flicker = hash(seed + x * 3 + y * 5 + 99) < 0.12 ? hash(seed + x + y + tick * 31) : 0.5;
  return base < 0.3 && flicker > 0.18;
}

/** Append an alpha channel to an `oklch(...)`/`rgb(...)` token string for canvas gradients. */
export function withAlpha(color, alpha) {
  const a = clamp(alpha, 0, 1).toFixed(3);
  return String(color).trim().replace(/\)\s*$/, ` / ${a})`);
}

/** Ease-out for number tweens. */
export const easeOutCubic = (p) => 1 - (1 - clamp(p, 0, 1)) ** 3;

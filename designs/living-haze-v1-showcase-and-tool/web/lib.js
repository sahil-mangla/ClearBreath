// Pure helpers for the front end (no DOM, no React) so they can be unit-tested in Node.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic 0..1 hash (mulberry32 step). Same input, same output: no flicker between renders. */
export function hash(n) {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

/** Which page shape to show: ?layout=tool|showcase wins, then the stored choice, then showcase. */
export function parseLayout(search, stored) {
  const fromUrl = new URLSearchParams(search || '').get('layout');
  if (fromUrl === 'tool' || fromUrl === 'showcase') return fromUrl;
  return stored === 'tool' ? 'tool' : 'showcase';
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

/** Haze blobs in normalised 0..1 canvas space. */
export function makeBlobs(n, seed = 7) {
  return Array.from({ length: n }, (_, i) => ({
    x: hash(i * 13 + seed),
    y: hash(i * 29 + seed + 1),
    r: 0.22 + hash(i * 41 + seed + 2) * 0.38,
    phase: hash(i * 53 + seed + 3) * Math.PI * 2,
    speed: 0.5 + hash(i * 7 + seed) * 0.9,
    tone: i % 3,
    ox: 0,
    oy: 0,
  }));
}

/**
 * Advance one blob by dt seconds: slow flow-field drift, wrap-around, and a spring-back
 * offset that lets the pointer part the haze.
 * @param {object} b blob (mutated)
 * @param {number} t seconds since start
 * @param {{x:number,y:number}|null} pointer normalised
 */
export function stepBlob(b, t, dt, pointer) {
  b.x += (Math.sin(t * 0.07 * b.speed + b.phase + b.y * 3) * 0.012 + 0.006 * b.speed) * dt;
  b.y += Math.cos(t * 0.05 * b.speed + b.phase * 1.3 + b.x * 2.4) * 0.008 * dt;
  // Wrap only once the whole blob is off-screen (its reach can be ~2.4x its radius on a tall viewport).
  const edge = b.r * 2.4;
  if (b.x > 1 + edge) b.x = -edge;
  if (b.y > 1 + edge) b.y = -edge;
  if (b.y < -edge) b.y = 1 + edge;

  if (pointer) {
    const dx = b.x + b.ox - pointer.x;
    const dy = b.y + b.oy - pointer.y;
    const d2 = dx * dx + dy * dy;
    const reach = 0.06;
    if (d2 < reach && d2 > 1e-9) {
      const d = Math.sqrt(d2);
      const push = (1 - d / Math.sqrt(reach)) * 0.9 * dt * 0.25;
      b.ox += (dx / d) * push;
      b.oy += (dy / d) * push;
    }
  }
  const spring = Math.exp(-dt * 1.6);
  b.ox *= spring;
  b.oy *= spring;
}

/** Append an alpha channel to an `oklch(...)`/`rgb(...)` token string for canvas gradients. */
export function withAlpha(color, alpha) {
  const a = clamp(alpha, 0, 1).toFixed(3);
  return String(color).trim().replace(/\)\s*$/, ` / ${a})`);
}

/** Ease-out for number tweens. */
export const easeOutCubic = (p) => 1 - (1 - clamp(p, 0, 1)) ** 3;

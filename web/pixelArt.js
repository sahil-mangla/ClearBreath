import { clamp, windowLit } from './lib.js';

/** @typedef {import('./skyline.js').Skyline} Skyline */
/** @typedef {import('./skyline.js').Building} Building */
/** @typedef {import('./skyline.js').Landmark} Landmark */
/** @typedef {{isLit:(x:number, y:number) => boolean, alpha:number, color:string}} Glow */

/**
 * How each skyline layer is painted: far towers vanish into thick smog, mid ones dim, the near row stays
 * solid. `glow` is the opacity of lit windows (0 for none); `seedStep` keeps each layer's windows distinct.
 */
const LAYER_STYLES = Object.freeze([
  { tone: 'far', alpha: (/** @type {number} */ d) => clamp(0.75 - d * 0.5, 0.2, 0.75), glow: 0, seedStep: 1 },
  { tone: 'mid', alpha: (/** @type {number} */ d) => clamp(1 - d * 0.35, 0.6, 1), glow: 0.45, seedStep: 2 },
  { tone: 'near', alpha: () => 1, glow: 0.9, seedStep: 3 },
]);

/**
 * One tower, with its roof, and (when `glow` is given) its lit windows on a 2 x 3 grid.
 * @param {CanvasRenderingContext2D} ctx @param {Building} b @param {number} rows @param {Glow|null} [glow]
 */
export function drawBuilding(ctx, b, rows, glow) {
  const top = rows - b.h;
  ctx.fillRect(b.x, top, b.w, b.h);
  if (b.roof === 'step' && b.w > 5) ctx.fillRect(b.x + 1, top - 2, b.w - 2, 2);
  if (b.roof === 'spire') ctx.fillRect(b.x + Math.floor(b.w / 2), top - 5, 1, 5);
  if (!glow) return;
  const prev = { style: ctx.fillStyle, alpha: ctx.globalAlpha };
  ctx.fillStyle = glow.color;
  ctx.globalAlpha = glow.alpha;
  for (let y = top + 2; y < rows - 2; y += 3) {
    for (let x = b.x + 1; x < b.x + b.w - 1; x += 2) {
      if (glow.isLit(x, y)) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = prev.style;
  ctx.globalAlpha = prev.alpha;
}

/**
 * A tapering fluted tower in stacked tiers, topped with a small cupola.
 * @param {CanvasRenderingContext2D} ctx @param {Landmark} m @param {number} rows
 */
function drawMinar(ctx, m, rows) {
  const tiers = 5;
  const tierH = Math.floor(m.h / tiers);
  for (let i = 0; i < tiers; i += 1) {
    const w = Math.max(2, m.w - i);
    const x = m.x + Math.floor((m.w - w) / 2);
    ctx.fillRect(x, rows - (i + 1) * tierH, w, tierH);
    if (i < tiers - 1) ctx.fillRect(x - 1, rows - (i + 1) * tierH, w + 2, 1); // balcony
  }
  ctx.fillRect(m.x + Math.floor(m.w / 2) - 1, rows - m.h - 2, 2, 2);
}

/**
 * A war-memorial arch: two piers, a lintel and a stepped top, with the opening cut through.
 * @param {CanvasRenderingContext2D} ctx @param {Landmark} m @param {number} rows
 */
function drawGate(ctx, m, rows) {
  ctx.fillRect(m.x, rows - m.h, m.w, m.h);
  ctx.fillRect(m.x + 2, rows - m.h - 2, m.w - 4, 2);
  ctx.fillRect(m.x + 4, rows - m.h - 3, m.w - 8, 1);
  const openW = Math.floor(m.w * 0.42);
  const openH = Math.floor(m.h * 0.72);
  ctx.clearRect(m.x + Math.floor((m.w - openW) / 2), rows - openH, openW, openH);
}

/** @param {CanvasRenderingContext2D} ctx @param {Landmark} m @param {number} rows */
export function drawLandmark(ctx, m, rows) {
  if (m.type === 'minar') drawMinar(ctx, m, rows);
  else drawGate(ctx, m, rows);
}

/**
 * Paint a whole skyline frame. `tick` drives the window flicker; `seed` makes a city's windows its own.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Skyline} sky
 * @param {{density:number, seed:number, tick:number, colors:Record<string, string>}} frame
 */
export function paintSkyline(ctx, sky, { density, seed, tick, colors }) {
  ctx.clearRect(0, 0, sky.cols, sky.rows);
  sky.layers.forEach((layer, i) => {
    const style = LAYER_STYLES[i];
    ctx.fillStyle = colors[style.tone];
    ctx.globalAlpha = style.alpha(density);
    /** @param {number} x @param {number} y */
    const lit = (x, y) => windowLit(seed + style.seedStep, x, y, tick);
    const glow = style.glow ? { isLit: lit, alpha: style.glow, color: colors.lit } : null;
    for (const b of layer.buildings) drawBuilding(ctx, b, sky.rows, glow);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.near;
  for (const m of sky.landmarks) drawLandmark(ctx, m, sky.rows);
}

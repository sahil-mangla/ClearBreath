import { SMOKE_LAYERS, clamp, withAlpha } from './lib.js';
import { buildGrain, buildSprite, token } from './smokeSprites.js';

/** @typedef {import('./types.js').SmokeState} SmokeState */
/** @typedef {import('./lib.js').Puff} Puff */

/**
 * The drawing half: paints one frame of clouds (and, for the page backdrop, the paper, sun glow and grain).
 * `size` is the canvas's current { w, h }, read at draw time so a resize needs no new painter.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{page:boolean, puffs:Puff[], size:{w:number, h:number}, state:SmokeState}} parts
 */
export function createPainter(ctx, { page, puffs, size, state }) {
  const paper = token('--color-paper');
  const ember = token('--haze-ember');
  const tones = [token('--haze-smoke'), token('--haze-ember'), token('--haze-clear')];
  const sprites = tones.map((c, ti) => [buildSprite(c, ti * 2 + 1), buildSprite(c, ti * 2 + 2)]);
  const grain = page ? ctx.createPattern(buildGrain(), 'repeat') : null;

  /** @param {number} d */
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

  /** @param {Puff} p @param {number} d @param {number} reach */
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

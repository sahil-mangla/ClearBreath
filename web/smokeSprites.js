import { hash, withAlpha } from './lib.js';

const SPRITE = 192;

/** Read a CSS custom property from the document root. */
export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** A soft, lumpy cloud sprite in one colour: many overlapping gradients, edges faded to nothing. */
export function buildSprite(color, seed) {
  const c = document.createElement('canvas');
  c.width = SPRITE;
  c.height = SPRITE;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
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
export function buildGrain() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
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

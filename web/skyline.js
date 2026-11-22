import { hash } from './lib.js';

/**
 * @typedef {{x:number, w:number, h:number, roof:'flat'|'step'|'spire'}} Building
 * @typedef {{name:string, buildings:Building[]}} SkylineLayer
 * @typedef {{type:string, x:number, w:number, h:number}} Landmark
 * @typedef {{cols:number, rows:number, layers:SkylineLayer[], landmarks:Landmark[]}} Skyline
 */

/** @type {Readonly<Record<string, {type:string, at:number}[]>>} */
const LANDMARKS = Object.freeze({
  delhi: [
    { type: 'minar', at: 0.18 },
    { type: 'gate', at: 0.64 },
  ],
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
 * @returns {Skyline}
 */
export function makeSkyline(seed, cols, rows, cityKey) {
  const layers = SKYLINE_LAYERS.map((L, li) => {
    /** @type {Building[]} */
    const buildings = [];
    let x = 0;
    let n = 0;
    while (x < cols) {
      /** @param {number} k */
      const r = (k) => hash(seed * 13 + li * 1009 + n * 17 + k);
      const w = Math.min(cols - x, L.wMin + Math.floor(r(1) * (L.wMax - L.wMin + 1)));
      const h = Math.max(4, Math.round(rows * (L.hMin + r(2) * (L.hMax - L.hMin))));
      /** @type {Building['roof']} */
      const roof = r(3) > 0.78 ? 'spire' : r(3) > 0.5 ? 'step' : 'flat';
      buildings.push({ x, w, h, roof });
      x += w + L.gap[0] + Math.floor(r(4) * (L.gap[1] - L.gap[0] + 1));
      n += 1;
    }
    return { name: L.name, buildings };
  });

  const landmarks = ((cityKey && LANDMARKS[cityKey]) || []).map(({ type, at }) =>
    type === 'minar'
      ? {
          type,
          x: Math.round(cols * at),
          w: Math.max(5, Math.round(rows * 0.11)),
          h: Math.round(rows * 0.82),
        }
      : {
          type,
          x: Math.round(cols * at),
          w: Math.max(14, Math.round(rows * 0.3)),
          h: Math.round(rows * 0.34),
        },
  );
  return { cols, rows, layers, landmarks };
}

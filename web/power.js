// Decide whether to draw the lighter visuals (one smoke canvas, half the puffs, still skyline).
// Budget phones are the people most likely to open this in bad air, so the default errs on the light side.

/**
 * @param {{connection?: {saveData?: boolean}, deviceMemory?: number, hardwareConcurrency?: number}} nav
 * @param {string} search location.search; `?fx=lite` or `?fx=full` overrides detection
 */
export function isLowPower(nav = {}, search = '') {
  const fx = new URLSearchParams(search).get('fx');
  if (fx === 'lite') return true;
  if (fx === 'full') return false;
  if (nav.connection?.saveData) return true;
  if (Number.isFinite(nav.deviceMemory) && nav.deviceMemory <= 4) return true;
  if (Number.isFinite(nav.hardwareConcurrency) && nav.hardwareConcurrency <= 4) return true;
  return false;
}

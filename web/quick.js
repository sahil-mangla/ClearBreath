// "Do these now": three safety-first actions chosen from the CPCB band, shown before the form.

/**
 * Which action set to show for a CPCB level index 0..5 (anything else is treated as the cleanest).
 * @param {number} [levelIndex]
 */
export function quickGroup(levelIndex) {
  const L = typeof levelIndex === 'number' && Number.isInteger(levelIndex) ? levelIndex : 0;
  if (L >= 4) return 'severe';
  if (L === 3) return 'poor';
  if (L === 2) return 'moderate';
  return 'clear';
}

/**
 * Poor and above is urgent enough to be styled as a warning rather than a tip.
 * @param {number} [levelIndex]
 */
export const isUrgent = (levelIndex) => typeof levelIndex === 'number' && levelIndex >= 3;

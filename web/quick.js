// "Do these now": three safety-first actions chosen from the CPCB band, shown before the form.

/** Which action set to show for a CPCB level index 0..5 (anything else is treated as the cleanest). */
export function quickGroup(levelIndex) {
  const L = Number.isInteger(levelIndex) ? levelIndex : 0;
  if (L >= 4) return 'severe';
  if (L === 3) return 'poor';
  if (L === 2) return 'moderate';
  return 'clear';
}

/** Poor and above is urgent enough to be styled as a warning rather than a tip. */
export const isUrgent = (levelIndex) => Number.isInteger(levelIndex) && levelIndex >= 3;

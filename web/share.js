import { cityLabel, translate } from './strings.js';

const flatten = (items) => items.flatMap((a) => [`- ${a.title}`, `  ${a.detail}`, `  ${a.impact}`]);

/**
 * The plan as plain text for pasting into a family or RWA chat. Same facts as the page, no markup,
 * numbers exactly as the server computed them.
 */
export function planToText(result, lang = 'en') {
  const t = (k, v) => translate(lang, k, v);
  const { air, exposure: e, plan, briefing } = result;
  const lines = [
    t('results.title', { city: cityLabel(result.city, lang) }),
    t('results.aqi', { aqi: air.aqi, cat: t(`band.${air.levelIndex}`) }),
    '',
    briefing.text,
    '',
    t('exposure.body', {
      base: e.baseline,
      plan: e.plan,
      pct: e.reductionPct,
      who: e.whoGuideline,
      india: e.indiaStandard,
    }),
  ];
  const groups = [
    ['group.routine', plan.routine],
    ['group.indoor', plan.indoor],
    ['group.alternatives', plan.alternatives],
  ];
  for (const [key, items] of groups) {
    if (!items.length) continue;
    lines.push('', t(key), ...flatten(items));
  }
  lines.push('', result.disclaimer, 'ClearBreath');
  return lines.join('\n');
}

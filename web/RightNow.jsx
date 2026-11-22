import { useLang, useT } from './i18n.js';
import { isUrgent, quickGroup } from './quick.js';
import { translateSteps } from './strings.js';

/**
 * Three things to do right now, chosen from today's CPCB band and shown before the form,
 * so someone in bad air gets an answer without scrolling. Plain text; urgent bands get a warning edge.
 * @param {{aqi?:number, levelIndex?:number}} props
 */
export default function RightNow({ aqi, levelIndex }) {
  const t = useT();
  const lang = useLang();
  const has =
    typeof aqi === 'number' &&
    Number.isFinite(aqi) &&
    typeof levelIndex === 'number' &&
    Number.isInteger(levelIndex);
  const items = translateSteps(lang, `quick.${quickGroup(has ? levelIndex : undefined)}`);
  return (
    <section
      className="now"
      data-urgent={has && isUrgent(levelIndex)}
      data-level={has ? levelIndex : undefined}
      aria-labelledby="now-title"
    >
      <h2 id="now-title" className="now__title">
        {has ? t('now.title', { aqi }) : t('now.title.none')}
      </h2>
      <ol className="now__list">
        {items.map(([title, detail]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

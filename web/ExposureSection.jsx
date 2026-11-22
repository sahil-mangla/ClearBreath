import { useT } from './i18n.js';

function Bars({ exposure: e }) {
  const t = useT();
  const max = Math.max(e.baseline, e.plan, e.whoGuideline) || 1;
  const rows = [
    [t('haze.usual'), e.baseline, 'base'],
    [t('haze.plan'), e.plan, 'plan'],
  ];
  return (
    <div className="bars">
      {rows.map(([label, value, kind]) => (
        <div className="bars__row" key={kind}>
          <span className="bars__label">{label}</span>
          <span className="bars__track" aria-hidden="true">
            <span
              className={`bars__fill bars__fill--${kind}`}
              style={{ '--p': Math.max(0.02, value / max) }}
            />
          </span>
          <strong className="bars__value num">{value} µg/m³</strong>
        </div>
      ))}
    </div>
  );
}

/** Switch the page haze between today's air and the air with the plan followed. */
function HazeSwitch({ hazeView, onHazeView }) {
  const t = useT();
  return (
    <fieldset className="view">
      <legend>{t('haze.legend')}</legend>
      {['usual', 'plan'].map((view) => (
        <label className="view__opt" key={view}>
          <input
            type="radio"
            name="hazeView"
            value={view}
            checked={hazeView === view}
            onChange={() => onHazeView(view)}
          />
          <span>{t(`haze.${view}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Exposure with and without the plan: the haze switch, the sentence, the bars and the assumptions. */
export default function ExposureSection({ result, hazeView, onHazeView }) {
  const t = useT();
  const { air, exposure: e } = result;
  return (
    <section className="exposure" aria-labelledby="exposure-title">
      <h3 id="exposure-title">{t('exposure.title')}</h3>
      <HazeSwitch hazeView={hazeView} onHazeView={onHazeView} />
      <p className="exposure__note">
        {hazeView === 'plan' ? t('haze.notePlan', { aqi: air.aqi }) : t('haze.noteUsual', { aqi: air.aqi })}
      </p>
      <p>
        {t('exposure.body', {
          base: e.baseline,
          plan: e.plan,
          pct: e.reductionPct,
          who: e.whoGuideline,
          india: e.indiaStandard,
        })}
      </p>
      <Bars exposure={e} />
      <details>
        <summary>{t('exposure.how')}</summary>
        <ul lang={result.textLang}>
          {e.assumptions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

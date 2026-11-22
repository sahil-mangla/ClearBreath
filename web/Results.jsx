import { forwardRef, useState } from 'react';
import { useLang, useT } from './i18n.js';
import { cityLabel } from './strings.js';
import { planToText } from './share.js';
import SmogText from './SmogText.jsx';

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

function ActionGroup({ title, items, topIds, offset, srcLang }) {
  const t = useT();
  const lang = useLang();
  if (!items.length) return null;
  return (
    <section className="actions" aria-labelledby={`g-${offset}`}>
      <h3 id={`g-${offset}`}>{title}</h3>
      <ul className="actions__list" lang={srcLang}>
        {items.map((a, i) => {
          const isTop = topIds.includes(a.id);
          return (
            <li className={`act${isTop ? ' act--top' : ''}`} key={a.id} style={{ '--i': offset + i }}>
              <h4>
                {a.title}
                {isTop ? (
                  <span className="act__tag" lang={lang}>
                    {t('act.top')}
                  </span>
                ) : null}
              </h4>
              <p>{a.detail}</p>
              <p className="act__impact">
                <strong lang={lang}>{t('act.impact')}</strong>
                {a.impact}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Print the plan, or copy it as plain text for a family or RWA chat. */
function Share({ result }) {
  const t = useT();
  const lang = useLang();
  const [note, setNote] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToText(result, lang));
      setNote(t('share.copied'));
    } catch {
      setNote(t('share.copyFail'));
    }
  };
  return (
    <div className="share">
      <p className="share__hint">{t('share.hint')}</p>
      <div className="share__btns">
        <button type="button" className="btn" onClick={() => window.print()}>
          {t('share.print')}
        </button>
        <button type="button" className="btn" onClick={copy}>
          {t('share.copy')}
        </button>
      </div>
      <p className="share__note" role="status">
        {note}
      </p>
    </div>
  );
}

/** The plan: headline, alerts, briefing, the haze-view switch with exposure bars, then the action lists. */
const Results = forwardRef(function Results({ result, hazeView, onHazeView, density }, ref) {
  const t = useT();
  const lang = useLang();
  const { air, exposure: e, plan, briefing } = result;
  const top = briefing.topActionIds;
  const briefingLabel = briefing.source === 'gemini' ? t('briefing.gemini') : t('briefing.rules');
  const srcLang = result.textLang; // the language the server wrote the plan, alerts, assumptions and disclaimer in
  const translationNote = result.translation ? t(`translation.${result.translation}`) : '';
  const cat = t(`band.${air.levelIndex}`);

  return (
    <div className="results">
      <h2 ref={ref} tabIndex={-1} className="results__title">
        <SmogText
          key={`${result.city.name}-${lang}`}
          text={t('results.title', { city: cityLabel(result.city, lang) })}
          density={density}
          salt={3}
        />
      </h2>

      <p className="results__air">
        <strong className="results__aqi num" data-level={air.levelIndex}>
          {t('results.aqi', { aqi: air.aqi, cat })}
        </strong>{' '}
        <span lang={lang}>{air.healthImpact}</span>
      </p>

      {plan.alerts.map((a) => (
        <p
          key={a.text}
          className={`alert alert--${a.level}`}
          role={a.level === 'critical' ? 'alert' : undefined}
        >
          <strong>
            {t(`alert.${a.level === 'critical' ? 'critical' : a.level === 'warning' ? 'warning' : 'info'}`)}
          </strong>
          <span lang={srcLang}>{a.text}</span>
        </p>
      ))}

      <div className="briefing">
        <p lang={briefing.lang}>{briefing.text}</p>
        <p className="briefing__source">{briefingLabel}</p>
      </div>

      <Share result={result} />

      <section className="exposure" aria-labelledby="exposure-title">
        <h3 id="exposure-title">{t('exposure.title')}</h3>
        <fieldset className="view">
          <legend>{t('haze.legend')}</legend>
          <label className="view__opt">
            <input
              type="radio"
              name="hazeView"
              value="usual"
              checked={hazeView === 'usual'}
              onChange={() => onHazeView('usual')}
            />
            <span>{t('haze.usual')}</span>
          </label>
          <label className="view__opt">
            <input
              type="radio"
              name="hazeView"
              value="plan"
              checked={hazeView === 'plan'}
              onChange={() => onHazeView('plan')}
            />
            <span>{t('haze.plan')}</span>
          </label>
        </fieldset>
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
          <ul lang={srcLang}>
            {e.assumptions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      </section>

      {translationNote ? <p className="results__english">{translationNote}</p> : null}
      <ActionGroup
        title={t('group.routine')}
        items={plan.routine}
        topIds={top}
        offset={0}
        srcLang={srcLang}
      />
      <ActionGroup
        title={t('group.indoor')}
        items={plan.indoor}
        topIds={top}
        offset={plan.routine.length}
        srcLang={srcLang}
      />
      <ActionGroup
        title={t('group.alternatives')}
        items={plan.alternatives}
        topIds={top}
        offset={plan.routine.length + plan.indoor.length}
        srcLang={srcLang}
      />

      {plan.totals.co2SavedKgPerWeek > 0 ? (
        <p className="totals">
          {t('co2.line', { week: plan.totals.co2SavedKgPerWeek, year: plan.totals.co2SavedKgPerYear })}
        </p>
      ) : null}
      <p className="disclaimer" lang={srcLang}>
        {result.disclaimer}
      </p>
    </div>
  );
});

export default Results;

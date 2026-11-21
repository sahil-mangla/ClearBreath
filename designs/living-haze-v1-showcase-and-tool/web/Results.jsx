import { forwardRef } from 'react';
import SmogText from './SmogText.jsx';

function Bars({ exposure: e }) {
  const max = Math.max(e.baseline, e.plan, e.whoGuideline) || 1;
  const rows = [
    ['Today as usual', e.baseline, 'base'],
    ['With this plan', e.plan, 'plan'],
  ];
  return (
    <div className="bars">
      {rows.map(([label, value, kind]) => (
        <div className="bars__row" key={kind}>
          <span className="bars__label">{label}</span>
          <span className="bars__track" aria-hidden="true">
            <span className={`bars__fill bars__fill--${kind}`} style={{ '--p': Math.max(0.02, value / max) }} />
          </span>
          <strong className="bars__value num">{value} µg/m³</strong>
        </div>
      ))}
    </div>
  );
}

function ActionGroup({ title, items, topIds, offset }) {
  if (!items.length) return null;
  return (
    <section className="actions" aria-labelledby={`g-${offset}`}>
      <h3 id={`g-${offset}`}>{title}</h3>
      <ul className="actions__list">
        {items.map((a, i) => {
          const isTop = topIds.includes(a.id);
          return (
            <li className={`act${isTop ? ' act--top' : ''}`} key={a.id} style={{ '--i': offset + i }}>
              <h4>
                {a.title}
                {isTop ? <span className="act__tag">Top priority</span> : null}
              </h4>
              <p>{a.detail}</p>
              <p className="act__impact">
                <strong>Impact: </strong>
                {a.impact}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The plan: headline, alerts, briefing, the haze-view switch with exposure bars, then the action lists. */
const Results = forwardRef(function Results({ result, hazeView, onHazeView, density }, ref) {
  const { air, exposure: e, plan, briefing } = result;
  const top = briefing.topActionIds;
  const briefingLabel = briefing.source === 'gemini' ? 'Written by Gemini from your data' : 'Generated from built-in rules';

  return (
    <div className="results">
      <h2 ref={ref} tabIndex={-1} className="results__title">
        <SmogText key={result.city.name} text={`Your plan for ${result.city.name}`} density={density} salt={3} />
      </h2>

      <p className="results__air">
        <strong className="results__aqi num" data-level={air.levelIndex}>
          AQI {air.aqi}, {air.category}.
        </strong>{' '}
        {air.healthImpact}
      </p>

      {plan.alerts.map((a) => (
        <p key={a.text} className={`alert alert--${a.level}`} role={a.level === 'critical' ? 'alert' : undefined}>
          <strong>{a.level === 'critical' ? 'Important: ' : a.level === 'warning' ? 'Care: ' : 'Note: '}</strong>
          {a.text}
        </p>
      ))}

      <div className="briefing">
        <p lang={briefing.lang}>{briefing.text}</p>
        <p className="briefing__source">{briefingLabel}</p>
      </div>

      <section className="exposure" aria-labelledby="exposure-title">
        <h3 id="exposure-title">What your choices change</h3>
        <fieldset className="view">
          <legend>Haze behind the page shows</legend>
          <label className="view__opt">
            <input type="radio" name="hazeView" value="usual" checked={hazeView === 'usual'} onChange={() => onHazeView('usual')} />
            <span>Today as usual</span>
          </label>
          <label className="view__opt">
            <input type="radio" name="hazeView" value="plan" checked={hazeView === 'plan'} onChange={() => onHazeView('plan')} />
            <span>With this plan</span>
          </label>
        </fieldset>
        <p>
          You would breathe about {e.baseline} µg/m³ of PM2.5 over a day as usual, and about {e.plan} µg/m³ following this plan,
          roughly {e.reductionPct}% lower. The WHO guideline is {e.whoGuideline} µg/m³ and India’s standard is {e.indiaStandard} µg/m³.
        </p>
        <Bars exposure={e} />
        <details>
          <summary>How is this estimated?</summary>
          <ul>
            {e.assumptions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      </section>

      <ActionGroup title="Your low-emission daily routine" items={plan.routine} topIds={top} offset={0} />
      <ActionGroup title="Indoor air-quality hacks" items={plan.indoor} topIds={top} offset={plan.routine.length} />
      <ActionGroup title="Sustainable alternatives" items={plan.alternatives} topIds={top} offset={plan.routine.length + plan.indoor.length} />

      {plan.totals.co2SavedKgPerWeek > 0 ? (
        <p className="totals">
          Switching your commute could save about {plan.totals.co2SavedKgPerWeek} kg of CO2 a week, about{' '}
          {plan.totals.co2SavedKgPerYear} kg a year.
        </p>
      ) : null}
      <p className="disclaimer">{result.disclaimer}</p>
    </div>
  );
});

export default Results;

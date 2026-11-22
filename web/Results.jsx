import { forwardRef } from 'react';
import ActionGroup from './ActionGroup.jsx';
import ExposureSection from './ExposureSection.jsx';
import { useLang, useT } from './i18n.js';
import Share from './Share.jsx';
import SmogText from './SmogText.jsx';
import { cityLabel } from './strings.js';

function Alerts({ alerts, srcLang }) {
  const t = useT();
  return alerts.map((a) => (
    <p key={a.text} className={`alert alert--${a.level}`} role={a.level === 'critical' ? 'alert' : undefined}>
      <strong>{t(`alert.${a.level}`)}</strong>
      <span lang={srcLang}>{a.text}</span>
    </p>
  ));
}

/** The three action lists, numbered on from one another so the entrance animation flows down the page. */
function ActionGroups({ plan, topIds, srcLang }) {
  const t = useT();
  const groups = [
    ['group.routine', plan.routine],
    ['group.indoor', plan.indoor],
    ['group.alternatives', plan.alternatives],
  ];
  let offset = 0;
  return groups.map(([titleKey, items]) => {
    const start = offset;
    offset += items.length;
    return (
      <ActionGroup
        key={titleKey}
        title={t(titleKey)}
        items={items}
        topIds={topIds}
        offset={start}
        srcLang={srcLang}
      />
    );
  });
}

/** The plan: headline, alerts, briefing, exposure with the haze-view switch, then the action lists. */
const Results = forwardRef(function Results({ result, hazeView, onHazeView, density }, ref) {
  const t = useT();
  const lang = useLang();
  const { air, plan, briefing } = result;
  const srcLang = result.textLang; // the language the server wrote the plan, alerts, assumptions and disclaimer in
  const translationNote = result.translation ? t(`translation.${result.translation}`) : '';

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
          {t('results.aqi', { aqi: air.aqi, cat: t(`band.${air.levelIndex}`) })}
        </strong>{' '}
        <span lang={lang}>{air.healthImpact}</span>
      </p>

      <Alerts alerts={plan.alerts} srcLang={srcLang} />

      <div className="briefing">
        <p lang={briefing.lang}>{briefing.text}</p>
        <p className="briefing__source">
          {briefing.source === 'gemini' ? t('briefing.gemini') : t('briefing.rules')}
        </p>
      </div>

      <Share result={result} />
      <ExposureSection result={result} hazeView={hazeView} onHazeView={onHazeView} />

      {translationNote ? <p className="results__english">{translationNote}</p> : null}
      <ActionGroups plan={plan} topIds={briefing.topActionIds} srcLang={srcLang} />

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

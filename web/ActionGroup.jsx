import { useLang, useT } from './i18n.js';
import { cssVars } from './lib.js';

/**
 * One list of recommended actions. `topIds` marks the briefing's top picks; `offset` staggers the entrance.
 * @param {{title:string, items:import('./types.js').PlanAction[], topIds:string[], offset:number,
 *   srcLang:string}} props
 */
export default function ActionGroup({ title, items, topIds, offset, srcLang }) {
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
            <li
              className={`act${isTop ? ' act--top' : ''}`}
              key={a.id}
              style={cssVars({ '--i': offset + i })}
            >
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

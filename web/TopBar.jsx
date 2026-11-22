import LangToggle from './LangToggle.jsx';
import { useT } from './i18n.js';
import Smoke from './Smoke.jsx';

/** The sticky bar: brand, language switch, the motion pause button and a strip of smoke behind them. */
export default function TopBar({ lowPower, density, paused, reduced, lang, onLang, onTogglePause }) {
  const t = useT();
  return (
    <header className="bar">
      {lowPower ? null : (
        <Smoke variant="band" className="bar__smoke" density={density} boost={0.2} paused={paused} />
      )}
      <p className="bar__brand" lang="en">
        ClearBreath
      </p>
      <div className="bar__tools">
        <LangToggle lang={lang} onChange={onLang} label={t('lang.label')} />
        {reduced ? null : (
          <button type="button" className="btn btn--quiet" aria-pressed={paused} onClick={onTogglePause}>
            {t('pause')}
          </button>
        )}
      </div>
    </header>
  );
}

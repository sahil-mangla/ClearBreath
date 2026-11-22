import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS as SERVER_DEFAULTS } from '../src/limits.js';
import { getCities } from './api.js';
import AskPanel from './AskPanel.jsx';
import { usePrefersReducedMotion, useLiveAir, useLowPower } from './hooks.js';
import { LangContext } from './i18n.js';
import { clearedDensity, densityFor } from './lib.js';
import LangToggle from './LangToggle.jsx';
import PixelCity from './PixelCity.jsx';
import PlanForm from './PlanForm.jsx';
import Readout, { BandScale } from './Readout.jsx';
import Results from './Results.jsx';
import RightNow from './RightNow.jsx';
import Smoke from './Smoke.jsx';
import SmogText from './SmogText.jsx';
import { cityLabel, LANGS, translate } from './strings.js';
import { usePlanRequest } from './usePlanRequest.js';

const LANG_KEY = 'clearbreath.lang';

function storedLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return LANGS.includes(v) ? v : 'en';
  } catch {
    return 'en'; // storage can be blocked; the page works without it
  }
}

const DEFAULTS = {
  city: 'delhi',
  adults: String(SERVER_DEFAULTS.adults),
  children: String(SERVER_DEFAULTS.children),
  seniors: String(SERVER_DEFAULTS.seniors),
  conditions: [],
  commute: SERVER_DEFAULTS.commute,
  commuteKm: String(SERVER_DEFAULTS.commuteKm),
  cooking: SERVER_DEFAULTS.cooking,
  heating: SERVER_DEFAULTS.heating,
  hasPurifier: false,
  hasN95: false,
  lang: 'en',
  notes: '',
  manualPm25: '',
};
const FALLBACK_CITIES = [{ key: 'delhi', name: 'Delhi', state: 'Delhi' }];
const NO_READING_DENSITY = 0.55; // until the first live reading arrives

export default function App() {
  const reduced = usePrefersReducedMotion();
  const lowPower = useLowPower();
  const [paused, setPaused] = useState(false);
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [values, setValues] = useState(() => ({ ...DEFAULTS, lang: storedLang() }));
  const { busy, errors, result, status, hazeView, setHazeView, shouldFocus, build, reset } = usePlanRequest();
  const resultsRef = useRef(null);
  const air = useLiveAir(values.city);
  const lang = values.lang;
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  useEffect(() => {
    getCities()
      .then((d) => d.cities?.length && setCities(d.cities))
      .catch(() => {}); // the single-city fallback keeps the page usable
  }, []);

  // Keep the document language honest for screen readers and the browser's font choice.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const set = useCallback((patch) => setValues((v) => ({ ...v, ...patch })), []);

  const changeCity = (city) => {
    set({ city });
    reset();
  };

  const cityName = cityLabel(
    cities.find((c) => c.key === values.city),
    lang,
  );

  const submit = (e) => {
    e.preventDefault();
    build(values);
  };

  // Switching language rebuilds an existing plan so its briefing is written in the new language too.
  const changeLang = (next) => {
    if (next === lang) return;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* storage blocked: the choice just lasts for this visit */
    }
    const nextValues = { ...values, lang: next };
    setValues(nextValues);
    if (result) build(nextValues, { focus: false }); // rebuilding in the new language must not pull focus away from the toggle
  };

  // Bring a fresh plan into view and move focus to its heading.
  useEffect(() => {
    const el = resultsRef.current;
    if (!result || !el || !shouldFocus()) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [result, reduced, shouldFocus]);

  const liveAqi = result ? result.air.aqi : air.data?.air.aqi;
  const base = Number.isFinite(liveAqi) ? densityFor(liveAqi) : NO_READING_DENSITY;
  const density = result && hazeView === 'plan' ? clearedDensity(base, result.exposure.reductionPct) : base;

  return (
    <LangContext.Provider value={lang}>
      <Smoke density={density} paused={paused} lite={lowPower} />
      <div className="stage">
        <a className="skip" href="#main">
          {t('skip')}
        </a>

        <header className="bar">
          {lowPower ? null : (
            <Smoke variant="band" className="bar__smoke" density={density} boost={0.2} paused={paused} />
          )}
          <p className="bar__brand" lang="en">
            ClearBreath
          </p>
          <div className="bar__tools">
            <LangToggle lang={lang} onChange={changeLang} label={t('lang.label')} />
            {reduced ? null : (
              <button
                type="button"
                className="btn btn--quiet"
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {t('pause')}
              </button>
            )}
          </div>
        </header>

        <main id="main">
          <div className="page">
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero__copy">
                <h1 id="hero-title" className="hero__title">
                  <SmogText key={lang} text={t('hero.title')} density={density} />
                </h1>
                <p className="hero__lead">{t('hero.lead')}</p>
                <a className="btn btn--primary" href="#plan">
                  {t('hero.cta')}
                </a>
              </div>
              <div className="hero__side">
                <Readout cities={cities} city={values.city} onCity={changeCity} air={air} />
                <RightNow aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
              </div>
            </section>

            <section className="band" aria-labelledby="scale-title">
              <h2 id="scale-title" className="band__title">
                {t('scale.title')}
              </h2>
              <p className="band__lead">{t('scale.lead')}</p>
              <BandScale aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
            </section>

            <section id="plan" className="toolset" aria-labelledby="plan-title">
              <div className="toolset__sky" aria-hidden="true">
                <PixelCity city={values.city} density={base} still={lowPower || paused} />
                {lowPower ? null : (
                  <Smoke
                    variant="band"
                    className="toolset__smoke"
                    density={base}
                    boost={0.1}
                    paused={paused}
                  />
                )}
              </div>
              <div className="panel plan">
                <h2 id="plan-title">{t('plan.title')}</h2>
                <PlanForm
                  values={values}
                  set={set}
                  onSubmit={submit}
                  busy={busy}
                  errors={errors}
                  cityName={cityName}
                />
              </div>
            </section>

            {result ? (
              <section className="panel panel--results" aria-label={t('results.aria')}>
                {/* Squared so a modelled cut reads clearly in this small strip (the full-page haze keeps the plain scale). */}
                {lowPower ? null : (
                  <Smoke variant="band" className="results__smoke" density={density ** 2} paused={paused} />
                )}
                <Results
                  ref={resultsRef}
                  result={result}
                  hazeView={hazeView}
                  onHazeView={setHazeView}
                  density={base}
                />
              </section>
            ) : null}

            {result ? (
              <div className="panel">
                <AskPanel city={values.city} lang={lang} />
              </div>
            ) : null}
          </div>
          <p className="visually-hidden" role="status">
            {status}
          </p>
        </main>

        <footer className="foot">
          {lowPower ? null : (
            <Smoke variant="band" className="foot__smoke" density={density} boost={0.3} paused={paused} />
          )}
          <p>{t('foot.text')}</p>
        </footer>
      </div>
    </LangContext.Provider>
  );
}

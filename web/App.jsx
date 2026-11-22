import { useState } from 'react';
import { usePrefersReducedMotion, useLiveAir, useLowPower } from './hooks.js';
import { hazeDensity, useCities, useFormValues, useResultsFocus } from './appHooks.js';
import { LangContext, useTranslator } from './i18n.js';
import { HeroSection, PlanSection, ResultsSection, ScaleSection } from './sections.jsx';
import Smoke from './Smoke.jsx';
import TopBar from './TopBar.jsx';
import { saveLang } from './settings.js';
import { cityLabel } from './strings.js';
import { usePlanRequest } from './usePlanRequest.js';

/** @typedef {import('./types.js').PlanResult} PlanResult */
/** @typedef {import('./types.js').HazeView} HazeView */

/** Everything the page needs: the request, the live reading, the form, the haze and the handlers. */
function useAppState() {
  const reduced = usePrefersReducedMotion();
  const lowPower = useLowPower();
  const [paused, setPaused] = useState(false);
  const cities = useCities();
  const { values, set, setValues } = useFormValues();
  const request = usePlanRequest();
  const { result, hazeView, shouldFocus, build, reset } = request;
  const headingRef = useResultsFocus(result, shouldFocus, reduced);
  const air = useLiveAir(values.city);
  const { base, shown: density } = hazeDensity(result, air.data?.air.aqi, hazeView);
  const lang = values.lang;

  /** @param {string} city */
  const changeCity = (city) => {
    set({ city });
    reset();
  };

  // Switching language rebuilds an existing plan so its briefing is written in the new language too.
  /** @param {string} next */
  const changeLang = (next) => {
    if (next === lang) return;
    saveLang(next);
    const nextValues = { ...values, lang: next };
    setValues(nextValues);
    // rebuilding in the new language must not pull focus away from the toggle
    if (result) build(nextValues, { focus: false });
  };

  /** @param {import('react').FormEvent} e */
  const submit = (e) => {
    e.preventDefault();
    build(values);
  };

  return {
    ...request,
    reduced,
    lowPower,
    paused,
    togglePause: () => setPaused((p) => !p),
    cities,
    values,
    set,
    lang,
    air,
    base,
    density,
    headingRef,
    changeCity,
    changeLang,
    submit,
  };
}

/** @param {{app: ReturnType<typeof useAppState>}} props */
function Main({ app }) {
  const { values, lang, cities, lowPower, paused, density, base } = app;
  const cityName = cityLabel(
    cities.find((c) => c.key === values.city),
    lang,
  );
  return (
    <main id="main">
      <div className="page">
        <HeroSection
          density={density}
          cities={cities}
          city={values.city}
          onCity={app.changeCity}
          air={app.air}
        />
        <ScaleSection air={app.air} />
        <PlanSection
          city={values.city}
          cityName={cityName}
          density={base}
          lowPower={lowPower}
          paused={paused}
          form={{ values, set: app.set, onSubmit: app.submit, busy: app.busy, errors: app.errors }}
        />
        <ResultsSection
          result={app.result}
          city={values.city}
          lowPower={lowPower}
          paused={paused}
          density={density}
          baseDensity={base}
          hazeView={app.hazeView}
          onHazeView={app.setHazeView}
          headingRef={app.headingRef}
        />
      </div>
      <p className="visually-hidden" role="status">
        {app.status}
      </p>
    </main>
  );
}

export default function App() {
  const app = useAppState();
  const { lang, lowPower, paused, density } = app;
  const t = useTranslator(lang); // App renders the provider, so it cannot read the language from context
  return (
    <LangContext.Provider value={lang}>
      <Smoke density={density} paused={paused} lite={lowPower} />
      <div className="stage">
        <a className="skip" href="#main">
          {t('skip')}
        </a>
        <TopBar
          lowPower={lowPower}
          density={density}
          paused={paused}
          reduced={app.reduced}
          lang={lang}
          onLang={app.changeLang}
          onTogglePause={app.togglePause}
        />
        <Main app={app} />
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

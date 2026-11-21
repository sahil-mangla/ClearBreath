import { useCallback, useEffect, useRef, useState } from 'react';
import { getCities, postPlan } from './api.js';
import AskPanel from './AskPanel.jsx';
import HazeCanvas from './HazeCanvas.jsx';
import { usePrefersReducedMotion, useLiveAir } from './hooks.js';
import LayoutTabs from './LayoutTabs.jsx';
import { clearedDensity, densityFor, parseLayout } from './lib.js';
import PlanForm from './PlanForm.jsx';
import Readout, { BandScale } from './Readout.jsx';
import Results from './Results.jsx';
import SmogText from './SmogText.jsx';

const DEFAULTS = {
  city: 'delhi',
  adults: '2',
  children: '0',
  seniors: '0',
  conditions: [],
  commute: 'bus_metro',
  commuteKm: '10',
  cooking: 'lpg',
  heating: 'none',
  hasPurifier: false,
  hasN95: false,
  lang: 'en',
  notes: '',
  manualPm25: '',
};
const FALLBACK_CITIES = [{ key: 'delhi', name: 'Delhi', state: 'Delhi' }];
const NO_READING_DENSITY = 0.55; // until the first live reading arrives

const num = (v) => (String(v).trim() === '' ? undefined : Number(v));

function storedLayout() {
  try {
    return localStorage.getItem('clearbreath-layout');
  } catch {
    return null;
  }
}

function toRequest(v) {
  return {
    city: v.city,
    adults: num(v.adults),
    children: num(v.children),
    seniors: num(v.seniors),
    conditions: v.conditions,
    commute: v.commute,
    commuteKm: num(v.commuteKm),
    cooking: v.cooking,
    heating: v.heating,
    hasPurifier: v.hasPurifier,
    hasN95: v.hasN95,
    lang: v.lang,
    notes: v.notes,
    manualPm25: num(v.manualPm25),
  };
}

export default function App() {
  const reduced = usePrefersReducedMotion();
  const [layout, setLayout] = useState(() => parseLayout(window.location.search, storedLayout()));
  const [paused, setPaused] = useState(false);
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [values, setValues] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(null);
  const [result, setResult] = useState(null);
  const [hazeView, setHazeView] = useState('plan');
  const [status, setStatus] = useState('');
  const resultsRef = useRef(null);
  const air = useLiveAir(values.city);

  useEffect(() => {
    getCities()
      .then((d) => d.cities?.length && setCities(d.cities))
      .catch(() => {}); // the single-city fallback keeps the page usable
  }, []);

  const changeLayout = useCallback((next) => {
    setLayout(next);
    try {
      localStorage.setItem('clearbreath-layout', next);
    } catch {
      /* storage can be blocked; the choice just won't persist */
    }
    const url = new URL(window.location.href);
    url.searchParams.set('layout', next);
    window.history.replaceState(null, '', url);
  }, []);

  const set = useCallback((patch) => setValues((v) => ({ ...v, ...patch })), []);

  const changeCity = (city) => {
    set({ city });
    setResult(null); // a plan belongs to the city it was built for
    setHazeView('plan');
    setErrors(null);
    setStatus('');
  };

  const cityName = cities.find((c) => c.key === values.city)?.name ?? '';

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErrors(null);
    setBusy(true);
    setStatus('Fetching live air quality and building your plan…');
    try {
      const data = await postPlan(toRequest(values));
      setResult(data);
      setHazeView('plan');
      setStatus(`Plan ready for ${data.city.name}.`);
    } catch (err) {
      setStatus('We could not build your plan.');
      setErrors({ message: err.message, details: err.details });
    } finally {
      setBusy(false);
    }
  };

  // Bring a fresh plan into view and move focus to its heading.
  useEffect(() => {
    const el = resultsRef.current;
    if (!result || !el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [result, reduced]);

  const liveAqi = result ? result.air.aqi : air.data?.air.aqi;
  const base = Number.isFinite(liveAqi) ? densityFor(liveAqi) : NO_READING_DENSITY;
  const density = result && hazeView === 'plan' ? clearedDensity(base, result.exposure.reductionPct) : base;

  const resultsNode = result ? (
    <Results ref={resultsRef} result={result} hazeView={hazeView} onHazeView={setHazeView} density={base} />
  ) : null;

  return (
    <>
      <HazeCanvas density={density} paused={paused} />
      <div className="stage">
        <a className="skip" href="#main">
          Skip to main content
        </a>

        <header className="bar">
          <p className="bar__brand">ClearBreath</p>
          <LayoutTabs layout={layout} onChange={changeLayout} />
          {reduced ? null : (
            <button type="button" className="btn btn--quiet" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume haze motion' : 'Pause haze motion'}
            </button>
          )}
        </header>

        <main id="main">
          <div role="tabpanel" id="panel" key={layout} aria-labelledby={`tab-${layout}`} className={`page page--${layout}`}>
            {layout === 'showcase' ? (
              <>
                <section className="hero" aria-labelledby="hero-title">
                  <div className="hero__copy">
                    <h1 id="hero-title" className="hero__title">
                      <SmogText text="Plan your family’s way through the smog." density={density} />
                    </h1>
                    <p className="hero__lead">Live air quality for your city, turned into a daily routine.</p>
                    <a className="btn btn--primary" href="#plan">
                      Build my plan
                    </a>
                  </div>
                  <Readout cities={cities} city={values.city} onCity={changeCity} air={air} />
                </section>

                <section className="band" aria-labelledby="scale-title">
                  <h2 id="scale-title" className="band__title">
                    Where today sits on India’s scale
                  </h2>
                  <p className="band__lead">
                    Bands follow India’s CPCB index. The haze behind this page is drawn thicker as the number climbs.
                  </p>
                  <BandScale aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
                </section>

                <section id="plan" className="panel plan" aria-labelledby="plan-title">
                  <h2 id="plan-title">Tell us about your home</h2>
                  <PlanForm values={values} set={set} onSubmit={submit} busy={busy} errors={errors} cityName={cityName} />
                </section>

                {resultsNode ? <section className="panel panel--results">{resultsNode}</section> : null}
              </>
            ) : (
              <>
                <section className="toolhead" aria-labelledby="hero-title">
                  <h1 id="hero-title" className="toolhead__title">
                    <SmogText text="Your air today, and what to do about it." density={density} />
                  </h1>
                  <Readout compact cities={cities} city={values.city} onCity={changeCity} air={air} />
                </section>

                <div className="tool">
                  <section id="plan" className="panel plan" aria-labelledby="plan-title">
                    <h2 id="plan-title">Your household</h2>
                    <PlanForm values={values} set={set} onSubmit={submit} busy={busy} errors={errors} cityName={cityName} />
                  </section>
                  <section className="panel panel--results" aria-label="Your plan">
                    {resultsNode ?? (
                      <p className="empty">Fill in your household and build your plan. It appears here, and the haze thins to match.</p>
                    )}
                  </section>
                </div>
              </>
            )}

            {result ? (
              <div className="panel">
                <AskPanel city={values.city} lang={values.lang} />
              </div>
            ) : null}
          </div>
          <p className="visually-hidden" role="status">
            {status}
          </p>
        </main>

        <footer className="foot">
          <p>
            Air-quality data from Open-Meteo (CAMS model). AQI bands from India’s CPCB. General guidance, not medical advice. Impact
            figures are approximate estimates.
          </p>
        </footer>
      </div>
    </>
  );
}

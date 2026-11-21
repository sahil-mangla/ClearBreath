import { useCallback, useEffect, useRef, useState } from 'react';
import { getCities, postPlan } from './api.js';
import AskPanel from './AskPanel.jsx';
import { usePrefersReducedMotion, useLiveAir } from './hooks.js';
import { clearedDensity, densityFor } from './lib.js';
import PixelCity from './PixelCity.jsx';
import PlanForm from './PlanForm.jsx';
import Readout, { BandScale } from './Readout.jsx';
import Results from './Results.jsx';
import Smoke from './Smoke.jsx';
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

  return (
    <>
      <Smoke density={density} paused={paused} />
      <div className="stage">
        <a className="skip" href="#main">
          Skip to main content
        </a>

        <header className="bar">
          <Smoke variant="band" className="bar__smoke" density={density} boost={0.2} paused={paused} />
          <p className="bar__brand">ClearBreath</p>
          {reduced ? null : (
            <button type="button" className="btn btn--quiet" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              Pause smoke motion
            </button>
          )}
        </header>

        <main id="main">
          <div className="page">
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
                Bands follow India’s CPCB index. The smoke behind this page is drawn thicker as the number climbs.
              </p>
              <BandScale aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
            </section>

            <section id="plan" className="toolset" aria-labelledby="plan-title">
              <div className="toolset__sky" aria-hidden="true">
                <PixelCity city={values.city} density={base} />
                <Smoke variant="band" className="toolset__smoke" density={base} boost={0.1} paused={paused} />
              </div>
              <div className="panel plan">
                <h2 id="plan-title">Tell us about your home</h2>
                <PlanForm values={values} set={set} onSubmit={submit} busy={busy} errors={errors} cityName={cityName} />
              </div>
            </section>

            {result ? (
              <section className="panel panel--results" aria-label="Your plan">
                <Results ref={resultsRef} result={result} hazeView={hazeView} onHazeView={setHazeView} density={base} />
              </section>
            ) : null}

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
          <Smoke variant="band" className="foot__smoke" density={density} boost={0.3} paused={paused} />
          <p>
            Air-quality data from Open-Meteo (CAMS model). AQI bands from India’s CPCB. General guidance, not medical advice. Impact
            figures are approximate estimates.
          </p>
        </footer>
      </div>
    </>
  );
}

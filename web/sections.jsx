import AskPanel from './AskPanel.jsx';
import { useLang, useT } from './i18n.js';
import PixelCity from './PixelCity.jsx';
import PlanForm from './PlanForm.jsx';
import Readout, { BandScale } from './Readout.jsx';
import Results from './Results.jsx';
import RightNow from './RightNow.jsx';
import Smoke from './Smoke.jsx';
import SmogText from './SmogText.jsx';

/** @typedef {import('./types.js').City} City */
/** @typedef {import('./types.js').LiveAir} LiveAir */
/** @typedef {import('./types.js').PlanResult} PlanResult */
/** @typedef {import('./types.js').HazeView} HazeView */
/** @typedef {import('./types.js').RequestErrors} RequestErrors */

/**
 * The opening section: headline, a way down to the form, and the live reading for the chosen city.
 * @param {{density:number, cities:City[], city:string, onCity:(key:string) => void, air:LiveAir}} props
 */
export function HeroSection({ density, cities, city, onCity, air }) {
  const t = useT();
  const lang = useLang();
  return (
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
        <Readout cities={cities} city={city} onCity={onCity} air={air} />
        <RightNow aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
      </div>
    </section>
  );
}

/** The AQI band scale with a short explanation. @param {{air:LiveAir}} props */
export function ScaleSection({ air }) {
  const t = useT();
  return (
    <section className="band" aria-labelledby="scale-title">
      <h2 id="scale-title" className="band__title">
        {t('scale.title')}
      </h2>
      <p className="band__lead">{t('scale.lead')}</p>
      <BandScale aqi={air.data?.air.aqi} levelIndex={air.data?.air.levelIndex} />
    </section>
  );
}

/**
 * The form, set against the city's skyline.
 * @param {{
 *   city: string, cityName: string, density: number, lowPower: boolean, paused: boolean,
 *   form: Omit<import('./PlanForm.jsx').PlanFormProps, 'cityName'>,
 * }} props
 */
export function PlanSection({ city, cityName, density, lowPower, paused, form }) {
  const t = useT();
  return (
    <section id="plan" className="toolset" aria-labelledby="plan-title">
      <div className="toolset__sky" aria-hidden="true">
        <PixelCity city={city} density={density} still={lowPower || paused} />
        {lowPower ? null : (
          <Smoke variant="band" className="toolset__smoke" density={density} boost={0.1} paused={paused} />
        )}
      </div>
      <div className="panel plan">
        <h2 id="plan-title">{t('plan.title')}</h2>
        <PlanForm {...form} cityName={cityName} />
      </div>
    </section>
  );
}

/**
 * The plan and the question box that follows it. Renders nothing until a plan exists.
 * @param {{
 *   result: PlanResult|null, city: string, lowPower: boolean, paused: boolean,
 *   density: number, baseDensity: number, hazeView: HazeView, onHazeView: (view:HazeView) => void,
 *   headingRef: import('react').Ref<HTMLHeadingElement>,
 * }} props
 */
export function ResultsSection({
  result,
  city,
  lowPower,
  paused,
  density,
  baseDensity,
  hazeView,
  onHazeView,
  headingRef,
}) {
  const t = useT();
  const lang = useLang();
  if (!result) return null;
  return (
    <>
      <section className="panel panel--results" aria-label={t('results.aria')}>
        {/* Squared so a modelled cut reads clearly in this small strip (page haze: plain scale). */}
        {lowPower ? null : (
          <Smoke variant="band" className="results__smoke" density={density ** 2} paused={paused} />
        )}
        <Results
          ref={headingRef}
          result={result}
          hazeView={hazeView}
          onHazeView={onHazeView}
          density={baseDensity}
        />
      </section>
      <div className="panel">
        <AskPanel city={city} lang={lang} />
      </div>
    </>
  );
}

import { useTween } from './hooks.js';
import { BANDS, SCALE_MAX } from './bands.js';
import { useLang, useT } from './i18n.js';
import { cssVars } from './lib.js';
import { cityLabel, stateLabel } from './strings.js';

/** @typedef {import('./types.js').City} City */
/** @typedef {import('./types.js').LiveAir} LiveAir */

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

function observed(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${timeFmt.format(d)} IST`;
}

/**
 * The big live number: city picker, AQI that counts up into place, its category and the model source.
 * @param {{cities:City[], city:string, onCity:(key:string) => void, air:LiveAir, compact?:boolean}} props
 */
export default function Readout({ cities, city, onCity, air, compact }) {
  const t = useT();
  const lang = useLang();
  const reading = air.data?.air;
  const shown = Math.round(useTween(reading ? reading.aqi : 0));
  const cityName = cityLabel(
    cities.find((c) => c.key === city),
    lang,
  );
  const cat = reading ? t(`band.${reading.levelIndex}`) : '';

  return (
    <section className={`readout${compact ? ' readout--compact' : ''}`} aria-labelledby="readout-label">
      <div className="field readout__city">
        <label id="readout-label" htmlFor="city">
          {t('city')}
        </label>
        <select id="city" value={city} onChange={(e) => onCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c.key} value={c.key}>
              {cityLabel(c, lang)}, {stateLabel(c, lang)}
            </option>
          ))}
        </select>
      </div>

      {reading ? (
        <div className="readout__body" data-level={reading.levelIndex}>
          <p className="readout__aqi">
            <span className="visually-hidden" aria-live="polite">
              {t('reading.aria', { city: cityName, aqi: reading.aqi, cat })}
            </span>
            <span className="readout__num num" aria-hidden="true">
              {shown}
            </span>
            <span className="readout__cat" aria-hidden="true">
              {cat}
            </span>
          </p>
          <p className="readout__meta">
            {t('reading.meta', {
              pm: reading.pm25,
              dom: reading.dominant,
              time: observed(reading.observedAt),
            })}
          </p>
          <details className="why">
            <summary>{t('why.title')}</summary>
            <p>{t('why.body')}</p>
          </details>
        </div>
      ) : (
        <div className="readout__body" role="status">
          <p className="readout__meta">
            {air.status === 'error' ? t('reading.fail', { error: air.error }) : t('reading.loading')}
          </p>
        </div>
      )}
    </section>
  );
}

/** The six CPCB bands drawn to scale, with a marker where today sits. */
export function BandScale({ aqi, levelIndex }) {
  const t = useT();
  const has = Number.isFinite(aqi);
  const pos = has ? Math.min(100, (aqi / SCALE_MAX) * 100) : 0;
  return (
    <figure className="scale">
      <div className="scale__bar">
        {BANDS.map((b, i) => (
          <div
            key={b.name}
            className={`scale__band${has && levelIndex === i ? ' is-now' : ''}`}
            data-level={i}
            style={{ flexGrow: b.to - b.from + (i === 0 ? 1 : 0) }}
          >
            <span className="scale__name">{t(`band.${i}`)}</span>
            <span className="scale__range num">{t('scale.range', { from: b.from, to: b.to })}</span>
            {has && levelIndex === i ? (
              <span className="scale__today num">{t('scale.today', { aqi })}</span>
            ) : null}
          </div>
        ))}
        {has ? (
          <div className="scale__marker" style={cssVars({ '--p': pos })} aria-hidden="true">
            <span className="scale__tick" />
          </div>
        ) : null}
      </div>
      <figcaption className="visually-hidden">
        {has ? t('scale.aria', { aqi, band: t(`band.${levelIndex}`) }) : t('scale.wait')}
      </figcaption>
    </figure>
  );
}

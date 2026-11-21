import { useTween } from './hooks.js';
import { BANDS, SCALE_MAX } from './bands.js';

const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

function observed(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${timeFmt.format(d)} IST`;
}

/** The big live number: city picker, AQI that counts up into place, its category and the model source. */
export default function Readout({ cities, city, onCity, air, compact }) {
  const reading = air.data?.air;
  const shown = Math.round(useTween(reading ? reading.aqi : 0));
  const cityName = cities.find((c) => c.key === city)?.name ?? '';

  return (
    <section className={`readout${compact ? ' readout--compact' : ''}`} aria-labelledby="readout-label">
      <div className="field readout__city">
        <label id="readout-label" htmlFor="city">
          City
        </label>
        <select id="city" value={city} onChange={(e) => onCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}, {c.state}
            </option>
          ))}
        </select>
      </div>

      {reading ? (
        <div className="readout__body" data-level={reading.levelIndex}>
          <p className="readout__aqi">
            <span className="visually-hidden" aria-live="polite">
              {cityName} air quality index {reading.aqi}, {reading.category}.
            </span>
            <span className="readout__num num" aria-hidden="true">
              {shown}
            </span>
            <span className="readout__cat" aria-hidden="true">
              {reading.category}
            </span>
          </p>
          <p className="readout__meta">
            PM2.5 {reading.pm25} µg/m³, main pollutant {reading.dominant}. Modelled by Open-Meteo, {observed(reading.observedAt)}.
          </p>
        </div>
      ) : (
        <div className="readout__body" role="status">
          <p className="readout__meta">
            {air.status === 'error' ? `${air.error} You can still build a plan by entering PM2.5 yourself.` : 'Reading the air…'}
          </p>
        </div>
      )}
    </section>
  );
}

/** The six CPCB bands drawn to scale, with a marker where today sits. */
export function BandScale({ aqi, levelIndex }) {
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
            <span className="scale__name">{b.name}</span>
            <span className="scale__range num">
              {b.from} to {b.to}
            </span>
            {has && levelIndex === i ? <span className="scale__today num">Today {aqi}</span> : null}
          </div>
        ))}
        {has ? (
          <div className="scale__marker" style={{ '--p': pos }} aria-hidden="true">
            <span className="scale__tick" />
          </div>
        ) : null}
      </div>
      <figcaption className="visually-hidden">
        {has ? `Today's AQI is ${aqi}, in the ${BANDS[levelIndex]?.name} band.` : 'Waiting for the live reading.'}
      </figcaption>
    </figure>
  );
}

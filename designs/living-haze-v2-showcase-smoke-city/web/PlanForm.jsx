const COMMUTES = [
  ['bus_metro', 'Bus or metro'],
  ['car', 'Car'],
  ['auto_cab', 'Auto or cab'],
  ['two_wheeler', 'Scooter or motorbike'],
  ['walk_cycle', 'Walk or cycle'],
  ['wfh', 'Work or study from home'],
];
const COOKING = [
  ['lpg', 'LPG cylinder'],
  ['png', 'Piped gas (PNG)'],
  ['induction', 'Induction or electric'],
  ['biomass', 'Wood, dung or crop residue'],
];
const HEATING = [
  ['none', 'Blankets and clothing'],
  ['electric', 'Electric heater or geyser'],
  ['wood_coal', 'Burning wood, coal or charcoal'],
];
const CONDITIONS = [
  ['asthma', 'Asthma or lung disease'],
  ['heart', 'Heart disease'],
  ['pregnancy', 'Pregnancy'],
];

function Num({ id, label, value, onChange, min, max, hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="help">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Pick({ id, label, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check({ checked, onChange, children, name, type = 'checkbox', value }) {
  return (
    <label className="check">
      <input type={type} name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Household form. State lives in the parent so the live city and the plan stay in sync. */
export default function PlanForm({ values, set, onSubmit, busy, errors, cityName }) {
  const toggleCondition = (id, on) =>
    set({ conditions: on ? [...values.conditions, id] : values.conditions.filter((c) => c !== id) });

  return (
    <form className="plan-form" onSubmit={onSubmit} noValidate aria-describedby={errors ? 'form-errors' : undefined}>
      <p className="plan-form__for">
        Planning for <strong>{cityName || 'your city'}</strong>. Change the city in the air reading.
      </p>

      <fieldset>
        <legend>Who lives at home</legend>
        <div className="row">
          <Num id="adults" label="Adults" value={values.adults} onChange={(v) => set({ adults: v })} min={1} max={10} />
          <Num id="children" label="Children under 12" value={values.children} onChange={(v) => set({ children: v })} min={0} max={10} />
          <Num id="seniors" label="Seniors 65 and over" value={values.seniors} onChange={(v) => set({ seniors: v })} min={0} max={10} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Health conditions in the household</legend>
        <div className="checks">
          {CONDITIONS.map(([id, label]) => (
            <Check key={id} name="conditions" value={id} checked={values.conditions.includes(id)} onChange={(on) => toggleCondition(id, on)}>
              {label}
            </Check>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Daily commute</legend>
        <div className="row">
          <Pick id="commute" label="Main way of travelling" value={values.commute} onChange={(v) => set({ commute: v })} options={COMMUTES} />
          <Num id="commuteKm" label="One-way distance in km" value={values.commuteKm} onChange={(v) => set({ commuteKm: v })} min={0} max={100} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Home</legend>
        <div className="row">
          <Pick id="cooking" label="Cooking fuel" value={values.cooking} onChange={(v) => set({ cooking: v })} options={COOKING} />
          <Pick id="heating" label="Winter warmth" value={values.heating} onChange={(v) => set({ heating: v })} options={HEATING} />
        </div>
        <div className="checks">
          <Check name="hasPurifier" checked={values.hasPurifier} onChange={(on) => set({ hasPurifier: on })}>
            We have an air purifier
          </Check>
          <Check name="hasN95" checked={values.hasN95} onChange={(on) => set({ hasN95: on })}>
            We have N95 masks
          </Check>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="notes">
          Anything else we should know? <span className="optional">Optional</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={200}
          value={values.notes}
          onChange={(e) => set({ notes: e.target.value })}
          aria-describedby="notes-hint"
        />
        <p id="notes-hint" className="help">
          For example: ground-floor flat next to a main road, or school at 8 am. Up to 200 characters.
        </p>
      </div>

      <fieldset>
        <legend>Language for the AI summary</legend>
        <div className="checks">
          <Check type="radio" name="lang" value="en" checked={values.lang === 'en'} onChange={() => set({ lang: 'en' })}>
            English
          </Check>
          <Check type="radio" name="lang" value="hi" checked={values.lang === 'hi'} onChange={() => set({ lang: 'hi' })}>
            <span lang="hi">हिन्दी</span>
          </Check>
        </div>
      </fieldset>

      <details>
        <summary>Live data not loading? Enter PM2.5 yourself</summary>
        <Num id="manualPm25" label="PM2.5 in µg/m³" value={values.manualPm25} onChange={(v) => set({ manualPm25: v })} min={0} max={1000} />
      </details>

      {errors ? (
        <div id="form-errors" className="error" role="alert">
          <p>{errors.message}</p>
          {errors.details?.length ? (
            <ul>
              {errors.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <button type="submit" className="btn btn--primary" aria-disabled={busy} data-busy={busy}>
        {busy ? 'Working on it…' : 'Build my clean-air plan'}
      </button>
    </form>
  );
}

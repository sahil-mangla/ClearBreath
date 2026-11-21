import { useEffect, useRef } from 'react';
import { useLang, useT } from './i18n.js';
import { errorMessage } from './strings.js';

const COMMUTES = ['bus_metro', 'car', 'auto_cab', 'two_wheeler', 'walk_cycle', 'wfh'];
const COOKING = ['lpg', 'png', 'induction', 'biomass'];
const HEATING = ['none', 'electric', 'wood_coal'];
const CONDITIONS = ['asthma', 'heart', 'pregnancy'];

function Num({ id, label, value, onChange, min, max, invalid = false, describedBy }) {
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
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Pick({ id, label, value, onChange, options, prefix, invalid = false }) {
  const t = useT();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'form-errors' : undefined} onChange={(e) => onChange(e.target.value)}>
        {options.map((v) => (
          <option key={v} value={v}>
            {t(`${prefix}.${v}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check({ checked, onChange, children, name, value }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Household form. State lives in the parent so the live city and the plan stay in sync. */
export default function PlanForm({ values, set, onSubmit, busy, errors, cityName }) {
  const t = useT();
  const lang = useLang();
  const errorRef = useRef(null);
  // A failed submit moves focus to the error summary, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (errors) errorRef.current?.focus();
  }, [errors]);
  const bad = (id) => Boolean(errors?.fields?.includes(id));
  const toggleCondition = (id, on) =>
    set({ conditions: on ? [...values.conditions, id] : values.conditions.filter((c) => c !== id) });

  return (
    <form className="plan-form" onSubmit={onSubmit} noValidate>
      <p className="plan-form__for">
        {t('plan.forPre')}
        <strong>{cityName || t('plan.yourCity')}</strong>
        {t('plan.forPost')}
      </p>

      <div className="plan-form__cols">
        <div className="plan-form__col">
          <fieldset>
            <legend>{t('who.legend')}</legend>
            <div className="row row--three">
              <Num id="adults" label={t('adults')} value={values.adults} onChange={(v) => set({ adults: v })} min={1} max={10} invalid={bad('adults')} describedBy="form-errors" />
              <Num id="children" label={t('children')} value={values.children} onChange={(v) => set({ children: v })} min={0} max={10} invalid={bad('children')} describedBy="form-errors" />
              <Num id="seniors" label={t('seniors')} value={values.seniors} onChange={(v) => set({ seniors: v })} min={0} max={10} invalid={bad('seniors')} describedBy="form-errors" />
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('health.legend')}</legend>
            <div className="checks">
              {CONDITIONS.map((id) => (
                <Check key={id} name="conditions" value={id} checked={values.conditions.includes(id)} onChange={(on) => toggleCondition(id, on)}>
                  {t(`cond.${id}`)}
                </Check>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('commute.legend')}</legend>
            <div className="row">
              <Pick id="commute" label={t('commute.mode')} value={values.commute} onChange={(v) => set({ commute: v })} options={COMMUTES} prefix="commute" invalid={bad('commute')} />
              <Num id="commuteKm" label={t('commute.km')} value={values.commuteKm} onChange={(v) => set({ commuteKm: v })} min={0} max={100} invalid={bad('commuteKm')} describedBy="form-errors" />
            </div>
          </fieldset>
        </div>

        <div className="plan-form__col">
          <fieldset>
            <legend>{t('home.legend')}</legend>
            <div className="row">
              <Pick id="cooking" label={t('cooking.label')} value={values.cooking} onChange={(v) => set({ cooking: v })} options={COOKING} prefix="cooking" invalid={bad('cooking')} />
              <Pick id="heating" label={t('heating.label')} value={values.heating} onChange={(v) => set({ heating: v })} options={HEATING} prefix="heating" invalid={bad('heating')} />
            </div>
            <div className="checks">
              <Check name="hasPurifier" checked={values.hasPurifier} onChange={(on) => set({ hasPurifier: on })}>
                {t('purifier')}
              </Check>
              <Check name="hasN95" checked={values.hasN95} onChange={(on) => set({ hasN95: on })}>
                {t('n95')}
              </Check>
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="notes">
              {t('notes')} <span className="optional">{t('optional')}</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={200}
              value={values.notes}
              onChange={(e) => set({ notes: e.target.value })}
              aria-describedby="notes-hint"
            />
            <p id="notes-hint" className="help">
              {t('notes.hint')}
            </p>
          </div>

          <details>
            <summary>{t('manual.summary')}</summary>
            <Num id="manualPm25" label={t('manual.label')} value={values.manualPm25} onChange={(v) => set({ manualPm25: v })} min={0} max={1000} invalid={bad('manualPm25')} describedBy="form-errors" />
          </details>
        </div>
      </div>

      {errors ? (
        <div id="form-errors" className="error" tabIndex={-1} ref={errorRef}>
          <p lang={lang === 'hi' && !errorMessage(lang, errors).translated ? 'en' : undefined}>{errorMessage(lang, errors).text}</p>
          {errors.details?.length ? (
            <ul lang={lang === 'hi' ? 'en' : undefined}>
              {errors.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="plan-form__foot">
        <button type="submit" className="btn btn--primary" aria-disabled={busy} data-busy={busy}>
          {busy ? t('busy') : t('submit')}
        </button>
        <div className="gets" role="group" aria-label={t('gets.title')}>
          <p className="gets__title">{t('gets.title')}</p>
          <ul>
            <li>{t('gets.1')}</li>
            <li>{t('gets.2')}</li>
            <li>{t('gets.3')}</li>
          </ul>
        </div>
      </div>
    </form>
  );
}

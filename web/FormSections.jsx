import { COMMUTES, CONDITIONS, COOKING, HEATING, NOTES_MAX } from '../src/limits.js';
import { Check, NumField, PickField } from './FormFields.jsx';
import { useT } from './i18n.js';

export function HouseholdSection({ form }) {
  const t = useT();
  return (
    <fieldset>
      <legend>{t('who.legend')}</legend>
      <div className="row row--three">
        <NumField id="adults" label={t('adults')} form={form} />
        <NumField id="children" label={t('children')} form={form} />
        <NumField id="seniors" label={t('seniors')} form={form} />
      </div>
    </fieldset>
  );
}

export function HealthSection({ form }) {
  const t = useT();
  const { values, set } = form;
  const toggle = (id, on) =>
    set({ conditions: on ? [...values.conditions, id] : values.conditions.filter((c) => c !== id) });
  return (
    <fieldset>
      <legend>{t('health.legend')}</legend>
      <div className="checks">
        {CONDITIONS.map((id) => (
          <Check
            key={id}
            name="conditions"
            value={id}
            checked={values.conditions.includes(id)}
            onChange={(on) => toggle(id, on)}
          >
            {t(`cond.${id}`)}
          </Check>
        ))}
      </div>
    </fieldset>
  );
}

export function CommuteSection({ form }) {
  const t = useT();
  return (
    <fieldset>
      <legend>{t('commute.legend')}</legend>
      <div className="row">
        <PickField id="commute" label={t('commute.mode')} options={COMMUTES} prefix="commute" form={form} />
        <NumField id="commuteKm" label={t('commute.km')} form={form} />
      </div>
    </fieldset>
  );
}

export function HomeSection({ form }) {
  const t = useT();
  const { values, set } = form;
  return (
    <fieldset>
      <legend>{t('home.legend')}</legend>
      <div className="row">
        <PickField id="cooking" label={t('cooking.label')} options={COOKING} prefix="cooking" form={form} />
        <PickField id="heating" label={t('heating.label')} options={HEATING} prefix="heating" form={form} />
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
  );
}

export function NotesField({ form }) {
  const t = useT();
  return (
    <div className="field">
      <label htmlFor="notes">
        {t('notes')} <span className="optional">{t('optional')}</span>
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={3}
        maxLength={NOTES_MAX}
        value={form.values.notes}
        onChange={(e) => form.set({ notes: e.target.value })}
        aria-describedby="notes-hint"
      />
      <p id="notes-hint" className="help">
        {t('notes.hint')}
      </p>
    </div>
  );
}

export function ManualReading({ form }) {
  const t = useT();
  return (
    <details>
      <summary>{t('manual.summary')}</summary>
      <NumField id="manualPm25" label={t('manual.label')} form={form} />
    </details>
  );
}

import { useEffect, useRef } from 'react';
import {
  CommuteSection,
  HealthSection,
  HomeSection,
  HouseholdSection,
  ManualReading,
  NotesField,
} from './FormSections.jsx';
import { useLang, useT } from './i18n.js';
import { errorMessage } from './strings.js';

/** The summary that appears after a failed submit. Focus moves here so keyboard and screen-reader users land on it. */
function ErrorSummary({ errors }) {
  const lang = useLang();
  const ref = useRef(/** @type {HTMLDivElement|null} */ (null));
  useEffect(() => {
    if (errors) ref.current?.focus();
  }, [errors]);
  const message = errorMessage(lang, errors);
  return (
    <div id="form-errors" className="error" tabIndex={-1} ref={ref}>
      <p lang={lang === 'hi' && !message.translated ? 'en' : undefined}>{message.text}</p>
      {errors.details?.length ? (
        <ul lang={lang === 'hi' ? 'en' : undefined}>
          {errors.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FormFoot({ busy }) {
  const t = useT();
  return (
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
  );
}

/** Household form. State lives in the parent so the live city and the plan stay in sync. */
export default function PlanForm({ values, set, onSubmit, busy, errors, cityName }) {
  const t = useT();
  const form = { values, set, bad: (id) => Boolean(errors?.fields?.includes(id)) };

  return (
    <form className="plan-form" onSubmit={onSubmit} noValidate>
      <p className="plan-form__for">
        {t('plan.forPre')}
        <strong>{cityName || t('plan.yourCity')}</strong>
        {t('plan.forPost')}
      </p>

      <div className="plan-form__cols">
        <div className="plan-form__col">
          <HouseholdSection form={form} />
          <HealthSection form={form} />
          <CommuteSection form={form} />
        </div>
        <div className="plan-form__col">
          <HomeSection form={form} />
          <NotesField form={form} />
          <ManualReading form={form} />
        </div>
      </div>

      {errors ? <ErrorSummary errors={errors} /> : null}
      <FormFoot busy={busy} />
    </form>
  );
}

import { LIMITS } from '../src/limits.js';
import { useT } from './i18n.js';

const ERRORS_ID = 'form-errors';

/** @param {{show:boolean}} props */
function FieldError({ show }) {
  const t = useT();
  return show ? <p className="field__error">{t('field.check')}</p> : null;
}

/**
 * A whole-number input whose range comes from the shared limits.
 * @param {{id:import('./types.js').NumFieldId, label:string, form:import('./types.js').FormApi}} props
 */
export function NumField({ id, label, form }) {
  const [min, max] = LIMITS[id];
  const invalid = form.bad(id);
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
        value={form.values[id]}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? ERRORS_ID : undefined}
        onChange={(e) => form.set({ [id]: e.target.value })}
      />
      <FieldError show={invalid} />
    </div>
  );
}

/**
 * A select whose option labels are the strings `${prefix}.${option}`.
 * @param {{id:import('./types.js').PickFieldId, label:string, options:readonly string[], prefix:string,
 *   form:import('./types.js').FormApi}} props
 */
export function PickField({ id, label, options, prefix, form }) {
  const t = useT();
  const invalid = form.bad(id);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={id}
        value={form.values[id]}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? ERRORS_ID : undefined}
        onChange={(e) => form.set({ [id]: e.target.value })}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {t(`${prefix}.${v}`)}
          </option>
        ))}
      </select>
      <FieldError show={invalid} />
    </div>
  );
}

/**
 * @param {{checked:boolean, onChange:(on:boolean) => void, children?:any, name:string, value?:string}} props
 */
export function Check({ checked, onChange, children, name, value }) {
  return (
    <label className="check">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

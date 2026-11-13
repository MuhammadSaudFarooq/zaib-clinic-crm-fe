import { useField } from 'formik';
import { AlertCircle } from 'lucide-react';
import { cx } from '@/utils/format';

/**
 * Formik-aware form fields. Each reads its state via `useField(name)` and
 * shows the Yup validation message once the field has been touched.
 */

export function FieldShell({ label, required, hint, error, htmlFor, children, className, extra }) {
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          <span>
            {label}
            {required && <span className="req">*</span>}
          </span>
          {extra}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          <AlertCircle size={12} /> {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

function useFieldError(name) {
  const [field, meta, helpers] = useField(name);
  const error = meta.touched && meta.error && typeof meta.error === 'string' ? meta.error : null;
  return { field, meta, helpers, error };
}

export function TextField({ name, label, required, hint, className, icon: Icon, prefix, extra, ...props }) {
  const { field, error } = useFieldError(name);
  const id = props.id || `f-${name}`;
  const input = (
    <input id={id} className={cx('input', error && 'has-error')} {...field} value={field.value ?? ''} {...props} />
  );
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} htmlFor={id} className={className} extra={extra}>
      {Icon ? (
        <div className="input-group">
          <Icon size={16} />
          {input}
        </div>
      ) : prefix ? (
        <div className="input-prefix">
          <span>{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export function SelectField({ name, label, required, hint, className, options = [], placeholder, ...props }) {
  const { field, error } = useFieldError(name);
  const id = props.id || `f-${name}`;
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} htmlFor={id} className={className}>
      <select id={id} className={cx('select', error && 'has-error')} {...field} value={field.value ?? ''} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ name, label, required, hint, className, rows = 3, ...props }) {
  const { field, error } = useFieldError(name);
  const id = props.id || `f-${name}`;
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} htmlFor={id} className={className}>
      <textarea id={id} rows={rows} className={cx('textarea', error && 'has-error')} {...field} value={field.value ?? ''} {...props} />
    </FieldShell>
  );
}

export function CheckboxField({ name, label, className }) {
  const [field] = useField({ name, type: 'checkbox' });
  return (
    <label className={cx('check', className)}>
      <input type="checkbox" {...field} />
      <span>{label}</span>
    </label>
  );
}

export function SwitchField({ name, label, hint, disabled }) {
  const [field, , helpers] = useField({ name, type: 'checkbox' });
  return (
    <div className="field">
      <label className="switch" style={disabled ? { opacity: 0.55 } : undefined}>
        <input type="checkbox" checked={!!field.checked} disabled={disabled} onChange={(e) => helpers.setValue(e.target.checked)} />
        <span className="switch__track" />
        <span className="switch__label">{label}</span>
      </label>
      {hint && <span className="field__hint" style={{ paddingLeft: 48 }}>{hint}</span>}
    </div>
  );
}

/** Inline (table-cell) input bound to Formik, used inside FieldArray rows. */
export function CellInput({ name, className, ...props }) {
  const { field, error } = useFieldError(name);
  return (
    <input
      className={cx('input input--sm', error && 'has-error', className)}
      title={error || undefined}
      {...field}
      value={field.value ?? ''}
      {...props}
    />
  );
}

export function CellSelect({ name, options, placeholder, className, ...props }) {
  const { field, error } = useFieldError(name);
  return (
    <select className={cx('select select--sm', error && 'has-error', className)} title={error || undefined} {...field} value={field.value ?? ''} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

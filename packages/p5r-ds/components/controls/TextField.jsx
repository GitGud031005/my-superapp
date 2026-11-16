import React, { useId } from 'react';

export function TextField({ label, value, onChange, multiline = false, hint, error, id, ...rest }) {
  const auto = useId();
  const fieldId = id || auto;
  const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-err`].filter(Boolean).join(' ') || undefined;
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div className={`p5r-field${error ? ' p5r-field--error' : ''}`}>
      <label className="p5r-field__label" htmlFor={fieldId}>{label}</label>
      <Control
        id={fieldId}
        className="p5r-field__control"
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...(multiline ? { rows: 3 } : { type: 'text' })}
        {...rest}
      />
      {hint && <div id={`${fieldId}-hint`} className="p5r-field__hint">{hint}</div>}
      {error && <div id={`${fieldId}-err`} className="p5r-field__error">Error: {error}</div>}
    </div>
  );
}

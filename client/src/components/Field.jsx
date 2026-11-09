import { useId } from 'react';

/**
 * Labelled form field with an accessible inline error message.
 */
export default function Field({ label, hint, error, as = 'input', children, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const Tag = as;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      <Tag id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props}>
        {children}
      </Tag>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

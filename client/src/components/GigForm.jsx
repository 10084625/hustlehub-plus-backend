import { useState } from 'react';
import Field from './Field';
import Alert from './Alert';
import { CATEGORIES } from '../utils/format';
import { validateGig } from '../utils/validation';

const EMPTY = { title: '', description: '', category: '', price: '', deliveryDays: '' };

/**
 * Create or edit a gig. Only the documented fields are ever sent; the API
 * rejects anything else.
 */
export default function GigForm({ initial, submitLabel = 'Publish gig', onSubmit, onCancel }) {
  const [values, setValues] = useState(() =>
    initial
      ? { title: initial.title, description: initial.description, category: initial.category, price: String(initial.price), deliveryDays: String(initial.deliveryDays) }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validateGig(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        price: Number(values.price),
        deliveryDays: Number(values.deliveryDays),
      });
      if (!initial) setValues(EMPTY);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-label={initial ? 'Edit gig' : 'Create a gig'}>
      <Alert>{serverError}</Alert>
      <Field label="Title" value={values.title} onChange={set('title')} error={errors.title} maxLength={100} />
      <Field
        as="textarea"
        label="What the client gets"
        rows={4}
        value={values.description}
        onChange={set('description')}
        error={errors.description}
        maxLength={2000}
      />
      <div className="form-row">
        <Field as="select" label="Category" value={values.category} onChange={set('category')} error={errors.category}>
          <option value="">Choose one</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Field>
        <Field label="Price (R)" inputMode="decimal" value={values.price} onChange={set('price')} error={errors.price} />
        <Field label="Delivery (days)" inputMode="numeric" value={values.deliveryDays} onChange={set('deliveryDays')} error={errors.deliveryDays} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

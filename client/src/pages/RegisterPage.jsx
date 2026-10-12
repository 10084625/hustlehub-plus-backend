import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import Alert from '../components/Alert';
import { validateRegister } from '../utils/validation';
import { homeFor } from '../components/ProtectedRoute';

export default function RegisterPage() {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'client' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const created = await register({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      });
      navigate(homeFor(created.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <h1>Create your account</h1>
        <Alert>{serverError}</Alert>
        <form className="form" onSubmit={submit} noValidate aria-label="Create account">
          <fieldset className="role-pick">
            <legend>I want to</legend>
            {[
              { value: 'client', title: 'Hire someone', text: 'Browse gigs and book work.' },
              { value: 'freelancer', title: 'Offer my skills', text: 'List gigs and earn from bookings.' },
            ].map((r) => (
              <label key={r.value} className={`role-option${values.role === r.value ? ' is-picked' : ''}`}>
                <input type="radio" name="role" value={r.value} checked={values.role === r.value} onChange={set('role')} />
                <span className="role-option-title">{r.title}</span>
                <span className="role-option-text">{r.text}</span>
              </label>
            ))}
          </fieldset>
          <Field label="Username" autoComplete="username" value={values.username} onChange={set('username')} error={errors.username} hint="Letters, numbers and underscores." />
          <Field label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={set('password')}
            error={errors.password}
            hint="At least 8 characters with upper and lower case, a number and a symbol."
          />
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
          />
          <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import Alert from '../components/Alert';
import { validateLogin } from '../utils/validation';
import { homeFor } from '../components/ProtectedRoute';

export default function LoginPage() {
  const { login, isAuthenticated, user, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const signedIn = await login({ email: values.email.trim(), password: values.password });
      // Only follow a "from" path that is an internal route (prevents open redirects).
      const from = location.state?.from;
      const safeFrom = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
      navigate(safeFrom || homeFor(signedIn.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setValues((v) => ({ ...v, password: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <h1>Sign in</h1>
        <p className="lede">Book work or manage your gigs.</p>
        <Alert kind="info">{notice}</Alert>
        <Alert>{serverError}</Alert>
        <form className="form" onSubmit={submit} noValidate aria-label="Sign in">
          <Field label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={set('password')}
            error={errors.password}
          />
          <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

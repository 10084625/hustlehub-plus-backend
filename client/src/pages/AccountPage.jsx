import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { Empty, Loading } from '../components/States';
import { formatDateTime } from '../utils/format';

const EVENT_TEXT = {
  'auth.register.success': 'Account created',
  'auth.login.success': 'Signed in',
  'auth.login.failed': 'Failed sign-in attempt',
  'auth.lockout.triggered': 'Account locked after repeated failed sign-ins',
  'auth.logout': 'Signed out',
  'auth.logout_all': 'Signed out on every device',
  'admin.user.status_changed': 'Account status changed by an administrator',
};

/**
 * Part 3: account security page for every role.
 *  - recent account activity, so a user can spot a sign-in they do not recognise
 *  - "Sign out on every device", which cancels every token for this account
 */
export default function AccountPage() {
  const { user, signOutEverywhere } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .activity()
      .then((d) => setActivity(d.activity))
      .catch((err) => {
        setError(err.message);
        setActivity([]);
      });
  }, []);

  // After "sign out everywhere" the session is gone for a moment before the
  // redirect to the login page happens. Render nothing in that gap.
  if (!user) return null;

  const endAll = async () => {
    if (!window.confirm('Sign out of HustleHub+ on every device, including this one?')) return;
    setBusy(true);
    try {
      await signOutEverywhere();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

return (
    <>
      <div className="page-head">
        <h1>Account security</h1>
      </div>
      <Alert>{error}</Alert>

      <div className="account-grid">
        <section className="panel" aria-labelledby="sessions-heading">
          <h2 id="sessions-heading">Your sessions</h2>
          <p>
            Signed in as <strong>{user.username}</strong> <span className="role-badge cap">{user.role}</span>
          </p>
          <p className="fine-print">
            If you used a shared computer or see activity you do not recognise, sign out everywhere. Every device will need to sign
            in again.
          </p>
          <button type="button" className="btn btn-danger" onClick={endAll} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out on every device'}
          </button>
        </section>

        <section className="panel" aria-labelledby="activity-heading">
          <h2 id="activity-heading">Recent activity</h2>
          {!activity ? (
            <Loading label="Loading activity" />
          ) : activity.length === 0 ? (
            <Empty title="No activity recorded yet." />
          ) : (
            <ul className="activity">
              {activity.map((a) => (
                <li key={a.id} className={a.event.includes('failed') || a.event.includes('lockout') ? 'is-warning' : ''}>
                  <span className="activity-what">{EVENT_TEXT[a.event] ?? a.event}</span>
                  <span className="activity-meta">
                    {formatDateTime(a.at)}
                    {a.ip ? `, from ${a.ip}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

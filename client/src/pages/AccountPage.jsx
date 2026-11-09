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
}
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import { Loading } from '../components/States';
import { formatDate, formatRand } from '../utils/format';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, u, b] = await Promise.all([api.adminStats(), api.adminUsers(), api.allBookings()]);
      setStats(s);
      setUsers(u.users);
      setBookings(b.bookings);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (u, isActive) => {
    setError('');
    try {
      await api.setUserStatus(u.id, isActive);
      setMessage(`${u.username} ${isActive ? 'reactivated' : 'suspended'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!stats && !error) return <Loading label="Loading admin data" />;
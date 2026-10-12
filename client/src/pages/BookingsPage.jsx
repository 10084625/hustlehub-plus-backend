import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { Empty, Loading } from '../components/States';
import { formatDate, formatRand } from '../utils/format';

export default function BookingsPage() {
  const { user } = useAuth();
  const isFreelancer = user.role === 'freelancer';
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api
      .myBookings()
      .then((d) => setBookings(d.bookings))
      .catch((err) => {
        setError(err.message);
        setBookings([]);
      });
  }, []);

  useEffect(load, [load]);

  const complete = async (id) => {
    setError('');
    setMessage('');
    try {
      await api.completeBooking(id);
      setMessage('Booking marked as completed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  
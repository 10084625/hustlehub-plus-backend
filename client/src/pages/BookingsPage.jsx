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

  return (
    <>
      <div className="page-head">
        <h1>{isFreelancer ? 'Bookings received' : 'My bookings'}</h1>
      </div>
      <Alert>{error}</Alert>
      <Alert kind="success">{message}</Alert>
      {!bookings ? (
        <Loading label="Loading bookings" />
      ) : bookings.length === 0 ? (
        <Empty title={isFreelancer ? 'No bookings yet.' : 'You have not booked anything yet.'}>
          {isFreelancer ? <Link to="/dashboard">Add or improve a gig</Link> : <Link to="/gigs">Browse gigs</Link>}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">{isFreelancer ? 'Client' : 'Freelancer'}</th>
                <th scope="col">Booked</th>
                <th scope="col">Notes</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Amount
                </th>
                {isFreelancer && <th scope="col"><span className="visually-hidden">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.gigTitle}</td>
                  <td>{(isFreelancer ? b.client : b.freelancer)?.username}</td>
                  <td>{formatDate(b.createdAt)}</td>
                  <td className="notes-cell">{b.notes || '-'}</td>
                  <td>
                    <span className={`status status-${b.status}`}>{b.status === 'completed' ? 'Completed' : 'Confirmed'}</span>
                  </td>
                  <td className="num mono-num">{formatRand(b.amount)}</td>
                  {isFreelancer && (
                    <td>
                      {b.status === 'confirmed' && (
                        <button type="button" className="btn btn-small" onClick={() => complete(b.id)}>
                          Mark completed
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

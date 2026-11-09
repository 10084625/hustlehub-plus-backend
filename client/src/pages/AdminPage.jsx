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

  return (
    <>
      <div className="page-head">
        <h1>Platform admin</h1>
      </div>
      <Alert>{error}</Alert>
      <Alert kind="success">{message}</Alert>
      {stats && (
        <dl className="stat-row">
          <div><dt>Users</dt><dd className="mono-num">{stats.users}</dd></div>
          <div><dt>Gigs</dt><dd className="mono-num">{stats.gigs}</dd></div>
          <div><dt>Bookings</dt><dd className="mono-num">{stats.bookings}</dd></div>
          <div><dt>Booking value</dt><dd className="mono-num">{formatRand(stats.totalVolume)}</dd></div>
          <div><dt>Platform fees</dt><dd className="mono-num">{formatRand(stats.platformRevenue)}</dd></div>
        </dl>
      )}

      {users && (
        <section className="panel" aria-labelledby="users-heading">
          <h2 id="users-heading">Accounts</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td className="cap">{u.role}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <span className={`status ${u.isActive ? 'status-completed' : 'status-suspended'}`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button type="button" className={`btn btn-small${u.isActive ? ' btn-danger' : ''}`} onClick={() => setStatus(u, !u.isActive)}>
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {bookings && (
        <section className="panel" aria-labelledby="bookings-heading">
          <h2 id="bookings-heading">Recent bookings</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Gig</th>
                  <th scope="col">Client</th>
                  <th scope="col">Freelancer</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.gigTitle}</td>
                    <td>{b.client?.username}</td>
                    <td>{b.freelancer?.username}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td className="num mono-num">{formatRand(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

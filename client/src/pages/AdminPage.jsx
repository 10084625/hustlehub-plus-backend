import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import { Loading } from '../components/States';
import { formatDate, formatRand } from '../utils/format';

const LEVEL_FILTERS = [
  { value: '', label: 'All events' },
  { value: 'warn', label: 'Warnings' },
  { value: 'error', label: 'Errors' },
];


/**
 * Part 3: security monitoring for admins. Shows the audit trail (newest
 * first, filterable) and runs the tamper-evident ledger check.
 */
function SecurityPanel({ security }) {
  const [level, setLevel] = useState('');
  const [logs, setLogs] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setLogs(null);
    api
      .auditLogs(level ? { level, limit: 50 } : { limit: 50 })
      .then((d) => setLogs(d.logs))
      .catch((err) => setError(err.message));
  }, [level]);

  const check = async () => {
    setChecking(true);
    setError('');
    try {
      setLedger(await api.verifyLedger());
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };


  return (
    <section className="panel" aria-labelledby="security-heading">
      <div className="panel-head">
        <h2 id="security-heading">Security monitoring</h2>
        <button type="button" className="btn btn-small" onClick={check} disabled={checking}>
          {checking ? 'Checking…' : 'Check ledger integrity'}
        </button>
      </div>
      <Alert>{error}</Alert>
      {security && (
        <p className="fine-print">
          Last 24 hours: {security.failedLogins24h} failed sign-in{security.failedLogins24h === 1 ? '' : 's'},{' '}
          {security.lockouts24h} account lockout{security.lockouts24h === 1 ? '' : 's'}.
        </p>
      )}
      {ledger && (
        <div className={`alert ${ledger.intact ? 'alert-success' : 'alert-error'}`} role="status">
          {ledger.intact
            ? `Ledger intact: ${ledger.valid} signed transaction${ledger.valid === 1 ? '' : 's'} verified`
            : `${ledger.tampered.length} transaction${ledger.tampered.length === 1 ? ' has' : 's have'} been changed outside the app: ${ledger.tampered.map((t) => t.reference).join(', ')}`}
          {ledger.unsigned > 0 ? ` (${ledger.unsigned} older unsigned record${ledger.unsigned === 1 ? '' : 's'})` : ''}.
        </div>
      )}

      <div className="filter-row" role="group" aria-label="Filter audit log">
        {LEVEL_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-small${level === f.value ? ' btn-primary' : ''}`}
            aria-pressed={level === f.value}
            onClick={() => setLevel(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!logs ? (
        <Loading label="Loading audit log" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Audit log</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Level</th>
                <th scope="col">Event</th>
                <th scope="col">User</th>
                <th scope="col">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.createdAt)}</td>
                  <td>
                    <span className={`level level-${l.level}`}>{l.level}</span>
                  </td>
                  <td className="mono">{l.event}</td>
                  <td>{l.user?.username ?? ''}</td>
                  <td className="mono">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


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

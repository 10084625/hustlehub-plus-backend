import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import GigForm from '../components/GigForm';
import PriceTag from '../components/PriceTag';
import Alert from '../components/Alert';
import { Empty, Loading } from '../components/States';
import TaxPanel from '../components/TaxPanel';
import { categoryLabel, formatMonth, formatRand } from '../utils/format';

function IncomePanel({ income }) {
  const max = Math.max(1, ...income.byMonth.map((m) => m.netIncome));
  return (
    <section className="panel income" aria-labelledby="income-heading">
      <h2 id="income-heading">All-time income</h2>
      <p className="income-net">
        <span className="mono-num">{formatRand(income.netIncome)}</span>
        <span className="income-net-label">earned after platform fees</span>
      </p>
      <dl className="income-facts">
        <div>
          <dt>Paid by clients</dt>
          <dd className="mono-num">{formatRand(income.grossIncome)}</dd>
        </div>
        <div>
          <dt>Platform fees (10%)</dt>
          <dd className="mono-num">{formatRand(income.platformFees)}</dd>
        </div>
        <div>
          <dt>Bookings</dt>
          <dd className="mono-num">{income.transactionCount}</dd>
        </div>
      </dl>
      {income.byMonth.length > 0 && (
        <ul className="month-bars" aria-label="Income by month">
          {income.byMonth.map((m) => (
            <li key={m.month}>
              <span className="month-label">{formatMonth(m.month)}</span>
              <span className="month-track">
                <span className="month-fill" style={{ width: `${(m.netIncome / max) * 100}%` }} />
              </span>
              <span className="mono-num">{formatRand(m.netIncome)}</span>
            </li>
          ))}
        </ul>
      )}
      {income.integrity?.excluded > 0 && (
        <p className="fine-print" role="status">
          {income.integrity.excluded} record{income.integrity.excluded === 1 ? '' : 's'} failed an integrity check and {income.integrity.excluded === 1 ? 'was' : 'were'} left out.
        </p>
      )}
    </section>
  );
}

export default function FreelancerDashboard() {
  const [gigs, setGigs] = useState(null);
  const [income, setIncome] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [g, i] = await Promise.all([api.myGigs(), api.incomeSummary()]);
      setGigs(g.gigs);
      setIncome(i);
    } catch (err) {
      setError(err.message);
      setGigs((v) => v ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text) => {
    setError('');
    setMessage(text);
  };

  const create = async (data) => {
    await api.createGig(data);
    setShowCreate(false);
    flash('Gig published.');
    load();
  };

  const update = async (data) => {
    await api.updateGig(editing.id, data);
    setEditing(null);
    flash('Gig updated.');
    load();
  };

  const toggle = async (gig) => {
    try {
      await api.updateGig(gig.id, { isActive: !gig.isActive });
      flash(gig.isActive ? 'Gig paused. Clients can no longer see it.' : 'Gig is live again.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (gig) => {
    if (!window.confirm(`Delete "${gig.title}"? Existing bookings are kept.`)) return;
    try {
      await api.deleteGig(gig.id);
      flash('Gig deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Your dashboard</h1>
      </div>
      <Alert>{error}</Alert>
      <Alert kind="success">{message}</Alert>

      <TaxPanel refreshKey={income} />

      <div className="dash">
        {income ? <IncomePanel income={income} /> : <Loading label="Loading income" />}

        <section className="panel" aria-labelledby="gigs-heading">
          <div className="panel-head">
            <h2 id="gigs-heading">Your gigs</h2>
            {!showCreate && !editing && (
              <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
                New gig
              </button>
            )}
          </div>

          {showCreate && <GigForm onSubmit={create} onCancel={() => setShowCreate(false)} />}
          {editing && <GigForm initial={editing} submitLabel="Save changes" onSubmit={update} onCancel={() => setEditing(null)} />}

          {!gigs ? (
            <Loading label="Loading gigs" />
          ) : gigs.length === 0 && !showCreate ? (
            <Empty title="You have no gigs yet.">
              <p>Publish one so clients can book you.</p>
            </Empty>
          ) : (
            <ul className="my-gigs">
              {gigs.map((g) => (
                <li key={g.id} className={g.isActive ? '' : 'is-paused'}>
                  <div className="my-gig-main">
                    <Link to={`/gigs/${g.id}`}>{g.title}</Link>
                    <span className="my-gig-meta">
                      {categoryLabel(g.category)}, {g.deliveryDays} day delivery{g.isActive ? '' : ', paused'}
                    </span>
                  </div>
                  <PriceTag amount={g.price} size="sm" />
                  <div className="my-gig-actions">
                    <button type="button" className="btn btn-small" onClick={() => { setShowCreate(false); setEditing(g); }}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => toggle(g)}>
                      {g.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => remove(g)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

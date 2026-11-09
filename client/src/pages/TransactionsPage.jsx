import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { Empty, Loading } from '../components/States';
import { formatDate, formatRand } from '../utils/format';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isFreelancer = user.role === 'freelancer';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .myTransactions()
      .then((d) => setRows(d.transactions))
      .catch((err) => {
        setError(err.message);
        setRows([]);
      });
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>{isFreelancer ? 'Earnings' : 'Payments'}</h1>
        <p className="lede">Every booking creates a payment record. Payments are simulated.</p>
      </div>
      <Alert>{error}</Alert>
      {!rows ? (
        <Loading label="Loading payments" />
      ) : rows.length === 0 ? (
        <Empty title="No payment records yet." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Date</th>
                <th scope="col">Gig</th>
                <th scope="col">{isFreelancer ? 'Client' : 'Freelancer'}</th>
                <th scope="col" className="num">Amount</th>
                {isFreelancer && <th scope="col" className="num">Platform fee</th>}
                {isFreelancer && <th scope="col" className="num">You earned</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="mono-num">{t.reference}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>{t.booking?.gigTitle}</td>
                  <td>{(isFreelancer ? t.client : t.freelancer)?.username}</td>
                  <td className="num mono-num">{formatRand(t.amount)}</td>
                  {isFreelancer && <td className="num mono-num">{formatRand(t.platformFee)}</td>}
                  {isFreelancer && <td className="num mono-num strong">{formatRand(t.freelancerEarnings)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

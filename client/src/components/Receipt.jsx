import { formatDate, formatRand } from '../utils/format';

/** Perforated receipt shown after a booking is confirmed. */
export default function Receipt({ booking, transaction }) {
  return (
    <section className="receipt" aria-label="Booking receipt">
      <p className="receipt-status">Booking confirmed</p>
      <h2 className="receipt-title">{booking.gigTitle}</h2>
      <dl className="receipt-lines">
        <div>
          <dt>Reference</dt>
          <dd className="mono-num">{transaction.reference}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(transaction.createdAt)}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>Simulated, no card charged</dd>
        </div>
        <div className="receipt-total">
          <dt>Total paid</dt>
          <dd className="mono-num">{formatRand(transaction.amount)}</dd>
        </div>
      </dl>
    </section>
  );
}

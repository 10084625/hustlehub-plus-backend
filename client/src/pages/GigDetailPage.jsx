import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PriceTag from '../components/PriceTag';
import Alert from '../components/Alert';
import Field from '../components/Field';
import Receipt from '../components/Receipt';
import { Loading } from '../components/States';
import { categoryLabel } from '../utils/format';
import { validateNotes } from '../utils/validation';

export default function GigDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [gig, setGig] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [bookError, setBookError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Ignore anything that is not a 24-character hex id before calling the API.
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      setLoadError('That gig link is not valid.');
      return;
    }
    api.getGig(id).then((d) => setGig(d.gig)).catch((err) => setLoadError(err.message));
  }, [id]);

  const book = async (e) => {
    e.preventDefault();
    setBookError('');
    const problem = validateNotes(notes);
    setNotesError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const body = { gigId: gig.id };
      if (notes.trim()) body.notes = notes.trim();
      setResult(await api.createBooking(body));
    } catch (err) {
      setBookError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <>
        <Alert>{loadError}</Alert>
        <Link to="/gigs">Back to gigs</Link>
      </>
    );

    if (!gig) return <Loading label="Loading gig" />;

  return (
    <div className="detail">
      <article className="detail-main">
        <Link to="/gigs" className="back-link">
          All gigs
        </Link>
        <span className="chip">{categoryLabel(gig.category)}</span>
        <h1>{gig.title}</h1>
        <p className="detail-by">
          Offered by {gig.freelancer?.username}. Delivered in {gig.deliveryDays} day{gig.deliveryDays === 1 ? '' : 's'}.
        </p>
        <p className="detail-desc">{gig.description}</p>
      </article>

      <aside className="detail-side">
        <PriceTag amount={gig.price} size="lg" />
        {result ? (
          <>
            <Receipt booking={result.booking} transaction={result.transaction} />
            <Link to="/bookings" className="btn btn-primary btn-wide">
              View my bookings
            </Link>
          </>
        ) : user.role === 'client' ? (
          <form className="form" onSubmit={book} noValidate aria-label="Book this gig">
            <Alert>{bookError}</Alert>
            <Field
              as="textarea"
              rows={3}
              label="Notes for the freelancer (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              error={notesError}
              maxLength={500}
            />
            <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
              {busy ? 'Booking…' : 'Book this gig'}
            </button>
            <p className="fine-print">Payment is simulated. No card is charged.</p>
          </form>
        ) : (
          <p className="fine-print">Only client accounts can book gigs.</p>
        )}
      </aside>
    </div>
  );
}


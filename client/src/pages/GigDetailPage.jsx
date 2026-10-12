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


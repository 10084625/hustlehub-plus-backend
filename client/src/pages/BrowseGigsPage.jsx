import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import GigCard from '../components/GigCard';
import Alert from '../components/Alert';
import { Empty, Loading } from '../components/States';
import { CATEGORIES } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function BrowseGigsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [applied, setApplied] = useState({ search: '', category: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.listGigs({ ...applied, page, limit: 9 }));
    } catch (err) {
      setError(err.message);
      setData({ gigs: [], pagination: { page: 1, pages: 1, total: 0 } });
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({ search: filters.search.trim().slice(0, 60), category: filters.category });
  };
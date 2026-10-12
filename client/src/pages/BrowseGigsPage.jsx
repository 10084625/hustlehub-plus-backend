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

  return (
    <>
      <div className="page-head">
        <h1>{user.role === 'client' ? 'Find someone for the job' : 'Gigs on HustleHub+'}</h1>
        <form className="filters" onSubmit={submit} role="search" aria-label="Filter gigs">
          <label className="visually-hidden" htmlFor="gig-search">
            Search gigs
          </label>
          <input
            id="gig-search"
            type="search"
            placeholder="Search by title, e.g. logo"
            maxLength={60}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <label className="visually-hidden" htmlFor="gig-category">
            Category
          </label>
          <select id="gig-category" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>
      <Alert>{error}</Alert>
      {!data ? (
        <Loading label="Loading gigs" />
      ) : data.gigs.length === 0 ? (
        <Empty title="No gigs match that search.">
          <p>Try a different word or clear the category.</p>
        </Empty>
      ) : (
        <>
          <div className="gig-grid">
            {data.gigs.map((g) => (
              <GigCard key={g.id} gig={g} />
            ))}
          </div>
          {data.pagination.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button type="button" className="btn btn-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button type="button" className="btn btn-quiet" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

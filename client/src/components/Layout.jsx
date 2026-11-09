import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';

const LINKS = {
  client: [
    { to: '/gigs', label: 'Browse gigs' },
    { to: '/bookings', label: 'My bookings' },
    { to: '/transactions', label: 'Payments' },
  ],
  freelancer: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/gigs', label: 'Browse gigs' },
    { to: '/bookings', label: 'Bookings received' },
    { to: '/transactions', label: 'Earnings' },
  ],
  admin: [
    { to: '/admin', label: 'Admin' },
    { to: '/gigs', label: 'All gigs' },
  ],
};
const ACCOUNT_LINK = { to: '/account', label: 'Account' };

const ROLE_NAME = { client: 'Client', freelancer: 'Freelancer', admin: 'Admin' };

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <ParticleBackground />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="HustleHub+ home">
          <span className="brand-tag" aria-hidden="true" />
          HustleHub<span className="brand-plus">+</span>
        </NavLink>
        {user && (
          <nav aria-label="Main">
            <ul className="nav-links">
              {[...(LINKS[user.role] ?? []), ACCOUNT_LINK].map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to}>{l.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {user && (
          <div className="whoami">
            <span>
              {user.username} <span className="role-badge">{ROLE_NAME[user.role]}</span>
            </span>
            <button type="button" className="btn btn-quiet" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </div>
  );
}

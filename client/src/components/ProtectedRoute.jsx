import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Keeps signed-out users and users with the wrong role away from pages.
 * This is only about what the interface shows. The API enforces the same
 * rules on every request, so bypassing this component in the browser would
 * not give access to any data.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

// A Map lookup instead of obj[role]: a role value such as "__proto__" or
// "constructor" can never reach Object.prototype (ESLint security finding fix).
const HOME = new Map([
  ['freelancer', '/dashboard'],
  ['admin', '/admin'],
]);
export const homeFor = (role) => HOME.get(role) ?? '/gigs';

import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { homeFor } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowseGigsPage from './pages/BrowseGigsPage';
import GigDetailPage from './pages/GigDetailPage';
import BookingsPage from './pages/BookingsPage';
import TransactionsPage from './pages/TransactionsPage';
import FreelancerDashboard from './pages/FreelancerDashboard';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

function Home() {
  const { isAuthenticated, user } = useAuth();
  return <Navigate to={isAuthenticated ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="gigs" element={<BrowseGigsPage />} />
          <Route path="gigs/:id" element={<GigDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['client', 'freelancer']} />}>
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['freelancer']} />}>
          <Route path="dashboard" element={<FreelancerDashboard />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

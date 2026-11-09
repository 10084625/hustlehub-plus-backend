import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';
import { fakeToken, signInAs } from './helpers';

const renderAt = (route, roles) =>
  render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute roles={roles} />}>
              <Route path="/secret" element={<p>secret page</p>} />
            </Route>
            <Route path="/login" element={<p>login page</p>} />
            <Route path="/gigs" element={<p>gigs page</p>} />
            <Route path="/dashboard" element={<p>dashboard page</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('ProtectedRoute and role-based navigation', () => {
  test('signed-out visitors are sent to login', () => {
    renderAt('/secret');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('an expired session counts as signed out', () => {
    sessionStorage.setItem('hh_session', JSON.stringify({ user: { id: 'u', username: 'x', role: 'client' }, token: fakeToken('client', -1) }));
    renderAt('/secret');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('a client cannot open an admin-only page', () => {
    signInAs('client');
    renderAt('/secret', ['admin']);
    expect(screen.queryByText('secret page')).toBeNull();
    expect(screen.getByText('gigs page')).toBeInTheDocument();
  });

  test('the right role gets in', () => {
    signInAs('admin');
    renderAt('/secret', ['admin']);
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });

  test('navigation shows freelancer links only to freelancers', () => {
    signInAs('freelancer', 'nomvula');
    renderAt('/secret', ['freelancer']);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(screen.getByText('nomvula')).toBeInTheDocument();
  });

  test('signing out clears the stored session', async () => {
    signInAs('client');
    renderAt('/secret', ['client']);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(sessionStorage.getItem('hh_session')).toBeNull();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
});

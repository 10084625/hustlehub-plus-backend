import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';

/** Builds an unsigned JWT-shaped string with an exp claim (for UI tests only). */
export const fakeToken = (role = 'client', minutes = 60) => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role, exp: Math.floor(Date.now() / 1000) + minutes * 60 })}.sig`;
};

export const signInAs = (role, username = `${role}_user`) => {
  sessionStorage.setItem('hh_session', JSON.stringify({ user: { id: 'u1', username, role }, token: fakeToken(role) }));
};

/** Mocks global fetch. `routes` maps "METHOD /path" to [status, body]. */
export const mockFetch = (routes) => {
  const fn = vi.fn(async (url, init = {}) => {
    const key = `${init.method || 'GET'} ${url.replace(/^\/api/, '').split('?')[0]}`;
    const [status, body] = routes[key] ?? [404, { success: false, message: 'not mocked' }];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
};

export const renderApp = (ui, { route = '/', path = '*' } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/gigs" element={<p>gigs page</p>} />
          <Route path="/dashboard" element={<p>dashboard page</p>} />
          <Route path="/admin" element={<p>admin page</p>} />
          <Route path="/bookings" element={<p>bookings page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

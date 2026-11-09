import { describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Layout from '../components/Layout';
import AccountPage from '../pages/AccountPage';
import AdminPage from '../pages/AdminPage';
import { mockFetch, renderApp, signInAs } from './helpers';

const call = (fetchMock, method, path) =>
  fetchMock.mock.calls.find(([url, init = {}]) => url === `/api${path}` && (init.method || 'GET') === method);

describe('Part 3: server-side sign-out', () => {
  test('Sign out revokes the token on the API, clears the session and returns to login', async () => {
    signInAs('client');
    const fetchMock = mockFetch({ 'POST /auth/logout': [200, { success: true, data: {} }] });
    renderApp(<Layout />, { route: '/somewhere', path: '*' });

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    const [, init] = call(fetchMock, 'POST', '/auth/logout');
    expect(init.headers.Authorization).toMatch(/^Bearer /);
    expect(sessionStorage.getItem('hh_session')).toBeNull();
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });


  test('the session is still cleared if the API cannot be reached', async () => {
    signInAs('client');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    renderApp(<Layout />, { route: '/somewhere', path: '*' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(sessionStorage.getItem('hh_session')).toBeNull());
  });

  test('every role sees an Account link', () => {
    signInAs('admin');
    mockFetch({});
    renderApp(<Layout />, { route: '/somewhere', path: '*' });
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
  });
});

describe('Part 3: account security page', () => {
  const activity = [
    { id: '1', event: 'auth.login.failed', ip: '10.0.0.9', at: '2026-11-04T08:00:00.000Z', reason: 'wrong_password' },
    { id: '2', event: 'auth.login.success', ip: '10.0.0.5', at: '2026-11-04T07:00:00.000Z' },
  ];

  test('lists recent activity in plain words and highlights failed sign-ins', async () => {
    signInAs('freelancer', 'kyle');
    mockFetch({ 'GET /auth/activity': [200, { success: true, data: { activity } }] });
    renderApp(<AccountPage />, { route: '/account', path: '/account' });

    const failed = await screen.findByText('Failed sign-in attempt');
    expect(failed.closest('li')).toHaveClass('is-warning');
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText(/from 10\.0\.0\.9/)).toBeInTheDocument();
  });

  test('"Sign out on every device" calls logout-all after confirming', async () => {
    signInAs('client');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = mockFetch({
      'GET /auth/activity': [200, { success: true, data: { activity: [] } }],
      'POST /auth/logout-all': [200, { success: true, data: {} }],
    });
    renderApp(<AccountPage />, { route: '/account', path: '/account' });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out on every device' }));
    expect(call(fetchMock, 'POST', '/auth/logout-all')).toBeDefined();
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  test('nothing happens if the user cancels the confirmation', async () => {
    signInAs('client');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = mockFetch({ 'GET /auth/activity': [200, { success: true, data: { activity: [] } }] });
    renderApp(<AccountPage />, { route: '/account', path: '/account' });
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out on every device' }));
    expect(call(fetchMock, 'POST', '/auth/logout-all')).toBeUndefined();
  });
});

describe('Part 3: admin security monitoring', () => {
  const routes = (ledger) => ({
    'GET /admin/stats': [200, { success: true, data: { users: 3, gigs: 2, bookings: 1, transactions: 1, totalVolume: 900, platformRevenue: 90, security: { failedLogins24h: 4, lockouts24h: 1 } } }],
    'GET /admin/users': [200, { success: true, data: { users: [] } }],
    'GET /bookings': [200, { success: true, data: { bookings: [] } }],
    'GET /admin/audit-logs': [200, { success: true, data: { logs: [{ id: 'a1', level: 'warn', event: 'auth.lockout.triggered', ip: '10.0.0.9', createdAt: '2026-11-04T08:00:00.000Z', user: { username: 'kyle' } }] } }],
    'GET /admin/ledger/verify': [200, { success: true, data: ledger }],
  });

  test('shows the audit log and the last-24-hour security counts', async () => {
    signInAs('admin');
    mockFetch(routes({}));
    renderApp(<AdminPage />, { route: '/admin', path: '/admin' });
    expect(await screen.findByText('auth.lockout.triggered')).toBeInTheDocument();
    expect(screen.getByText(/4 failed sign-ins, 1 account lockout\./)).toBeInTheDocument();
  });

  test('filtering by level asks the API for that level only', async () => {
    signInAs('admin');
    const fetchMock = mockFetch(routes({}));
    renderApp(<AdminPage />, { route: '/admin', path: '/admin' });
    await userEvent.click(await screen.findByRole('button', { name: 'Errors' }));
    expect(fetchMock.mock.calls.map(([u]) => u)).toContain('/api/admin/audit-logs?level=error&limit=50');
    expect(screen.getByRole('button', { name: 'Errors' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('ledger check reports tampered transactions by reference', async () => {
    signInAs('admin');
    mockFetch(routes({ checked: 3, valid: 2, unsigned: 0, tampered: [{ id: 't1', reference: 'HH-BAD-1', amount: 9000 }], intact: false }));
    renderApp(<AdminPage />, { route: '/admin', path: '/admin' });
    await userEvent.click(await screen.findByRole('button', { name: 'Check ledger integrity' }));
    expect(await screen.findByText(/1 transaction has been changed outside the app: HH-BAD-1/)).toBeInTheDocument();
  });

  test('ledger check confirms an intact ledger', async () => {
    signInAs('admin');
    mockFetch(routes({ checked: 2, valid: 2, unsigned: 0, tampered: [], intact: true }));
    renderApp(<AdminPage />, { route: '/admin', path: '/admin' });
    await userEvent.click(await screen.findByRole('button', { name: 'Check ledger integrity' }));
    expect(await screen.findByText(/Ledger intact: 2 signed transactions verified/)).toBeInTheDocument();
  });
});

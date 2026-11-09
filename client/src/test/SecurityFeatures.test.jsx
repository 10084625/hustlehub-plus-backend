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

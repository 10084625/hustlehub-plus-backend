import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../pages/LoginPage';
import { fakeToken, mockFetch, renderApp } from './helpers';

describe('LoginPage', () => {
  test('renders the sign-in form', () => {
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('shows validation errors and does not call the API when fields are empty', async () => {
    const fetchMock = mockFetch({});
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects a malformed email before sending anything', async () => {
    const fetchMock = mockFetch({});
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('shows the API message on failed login and clears the password', async () => {
    mockFetch({ 'POST /auth/login': [401, { success: false, message: 'Invalid email or password.' }] });
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong!Pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  test('never shows raw server errors to the user', async () => {
    mockFetch({ 'POST /auth/login': [500, { success: false, message: 'MongoServerError at /app/src/x.js:12' }] });
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'StrongP@ss1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong on our side');
    expect(alert).not.toHaveTextContent('MongoServerError');
  });

  test('a freelancer is sent to the dashboard after signing in', async () => {
    mockFetch({
      'POST /auth/login': [200, { success: true, data: { user: { id: 'u1', username: 'nomvula', role: 'freelancer' }, token: fakeToken('freelancer') } }],
    });
    renderApp(<LoginPage />, { route: '/signin', path: '/signin' });
    await userEvent.type(screen.getByLabelText('Email'), 'nomvula@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'StrongP@ss1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('hh_session')).user.role).toBe('freelancer');
  });
});

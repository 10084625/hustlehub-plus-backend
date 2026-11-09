import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../pages/RegisterPage';
import { fakeToken, mockFetch, renderApp } from './helpers';

const fill = async ({ username = 'lerato_m', email = 'lerato@example.com', password = 'StrongP@ss1', confirm = password } = {}) => {
  if (username) await userEvent.type(screen.getByLabelText('Username'), username);
  if (email) await userEvent.type(screen.getByLabelText('Email'), email);
  if (password) await userEvent.type(screen.getByLabelText('Password'), password);
  if (confirm) await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
};

describe('RegisterPage', () => {
  test('offers only client and freelancer roles (never admin)', () => {
    renderApp(<RegisterPage />, { route: '/r', path: '/r' });
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.value)).toEqual(['client', 'freelancer']);
    expect(screen.getByRole('radio', { name: /Hire someone/ })).toBeChecked();
  });

  test('flags a weak password and mismatched confirmation', async () => {
    const fetchMock = mockFetch({});
    renderApp(<RegisterPage />, { route: '/r', path: '/r' });
    await fill({ password: 'password', confirm: 'different' });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText(/Include an uppercase letter/)).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects a username with HTML or symbols', async () => {
    renderApp(<RegisterPage />, { route: '/r', path: '/r' });
    await fill({ username: '<script>' });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Use only letters, numbers and underscores.')).toBeInTheDocument();
  });

  test('sends exactly the documented fields with the chosen role', async () => {
    const fetchMock = mockFetch({
      'POST /auth/register': [201, { success: true, data: { user: { id: 'u1', username: 'lerato_m', role: 'freelancer' }, token: fakeToken('freelancer') } }],
    });
    renderApp(<RegisterPage />, { route: '/r', path: '/r' });
    await userEvent.click(screen.getByRole('radio', { name: /Offer my skills/ }));
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(['email', 'password', 'role', 'username']);
    expect(body.role).toBe('freelancer');
  });

  test('shows a duplicate-account message from the API', async () => {
    mockFetch({ 'POST /auth/register': [409, { success: false, message: 'An account with this email already exists.' }] });
    renderApp(<RegisterPage />, { route: '/r', path: '/r' });
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });
});

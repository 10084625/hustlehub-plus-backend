import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GigDetailPage from '../pages/GigDetailPage';
import { mockFetch, renderApp, signInAs } from './helpers';

const GIG_ID = '6ac735549e27884281dd7d45';
const gig = { id: GIG_ID, title: 'Fix bugs in your React app', description: 'I find it and fix it.', category: 'development', price: 950, deliveryDays: 2, isActive: true, freelancer: { username: 'kyle' } };

describe('Booking a gig', () => {
  test('a client books a gig and sees the receipt with the transaction reference', async () => {
    signInAs('client');
    const fetchMock = mockFetch({
      [`GET /gigs/${GIG_ID}`]: [200, { success: true, data: { gig } }],
      'POST /bookings': [201, {
        success: true,
        data: {
          booking: { id: 'b1', gigTitle: gig.title, amount: 950 },
          transaction: { reference: 'HH-ABC123-0F0F0F', amount: 950, createdAt: '2026-10-08T08:00:00.000Z' },
        },
      }],
    });
    renderApp(<GigDetailPage />, { route: `/gigs/${GIG_ID}`, path: '/gigs/:id' });

    expect(await screen.findByRole('heading', { name: gig.title })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Notes for the freelancer/), 'Bug is on the login page.');
    await userEvent.click(screen.getByRole('button', { name: 'Book this gig' }));

    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument();
    expect(screen.getByText('HH-ABC123-0F0F0F')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls.find(([url, i]) => url === '/api/bookings' && i.method === 'POST');
    // The client only sends the gig id and notes. The price is never sent.
    expect(JSON.parse(init.body)).toEqual({ gigId: GIG_ID, notes: 'Bug is on the login page.' });
    expect(init.headers.Authorization).toMatch(/^Bearer /);
  });

  test('a freelancer sees the gig but cannot book it', async () => {
    signInAs('freelancer');
    mockFetch({ [`GET /gigs/${GIG_ID}`]: [200, { success: true, data: { gig } }] });
    renderApp(<GigDetailPage />, { route: `/gigs/${GIG_ID}`, path: '/gigs/:id' });
    expect(await screen.findByText('Only client accounts can book gigs.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book this gig' })).toBeNull();
  });

  test('a rate-limited booking shows the friendly 429 message', async () => {
    signInAs('client');
    mockFetch({
      [`GET /gigs/${GIG_ID}`]: [200, { success: true, data: { gig } }],
      'POST /bookings': [429, { success: false, message: 'Too many bookings in a short time. Please wait before booking again.' }],
    });
    renderApp(<GigDetailPage />, { route: `/gigs/${GIG_ID}`, path: '/gigs/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Book this gig' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many bookings');
  });

  test('an invalid gig id in the URL never reaches the API', async () => {
    signInAs('client');
    const fetchMock = mockFetch({});
    renderApp(<GigDetailPage />, { route: '/gigs/../../admin', path: '/gigs/*' });
    expect(await screen.findByText('That gig link is not valid.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * Small wrapper around fetch for talking to the HustleHub+ API.
 *
 * - Always calls the same-origin /api path (proxied to the HTTPS API).
 * - Attaches the JWT as a Bearer token when one is set.
 * - Turns every failure into an ApiError with a safe, user-facing message.
 *   Raw server or network error details are never shown in the UI.
 * - On 401 it notifies the app so the session is cleared and the user is
 *   sent back to the login page.
 */
const BASE = '/api';

let authToken = null;
let onUnauthorised = () => {};

export const setAuthToken = (token) => {
  authToken = token;
};
export const setUnauthorisedHandler = (fn) => {
  onUnauthorised = fn;
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// A Map keyed by status code (static analysis fix: no obj[value] lookups).
const FRIENDLY = new Map([
  [0, 'We could not reach the server. Check your connection and try again.'],
  [423, 'This account is temporarily locked. Please try again later.'],
  [429, 'You are doing that too often. Please wait a few minutes and try again.'],
  [500, 'Something went wrong on our side. Please try again shortly.'],
]);

export async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(FRIENDLY.get(0), 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorised();
    // Messages from our API are written to be safe for users. Server errors
    // always fall back to a generic message.
    const message = res.status >= 500 ? FRIENDLY[500] : payload?.message || FRIENDLY[res.status] || 'Request failed.';
    throw new ApiError(message, res.status);
  }
  return payload?.data ?? {};
}

const q = (params) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  profile: () => request('/auth/profile'),

  listGigs: (params = {}) => request(`/gigs${q(params)}`),
  myGigs: () => request('/gigs/mine'),
  getGig: (id) => request(`/gigs/${encodeURIComponent(id)}`),
  createGig: (data) => request('/gigs', { method: 'POST', body: data }),
  updateGig: (id, data) => request(`/gigs/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
  deleteGig: (id) => request(`/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createBooking: (data) => request('/bookings', { method: 'POST', body: data }),
  myBookings: () => request('/bookings/mine'),
  allBookings: () => request('/bookings'),
  completeBooking: (id) => request(`/bookings/${encodeURIComponent(id)}/complete`, { method: 'PATCH' }),

  myTransactions: () => request('/transactions/mine'),
  allTransactions: () => request('/transactions'),
  incomeSummary: () => request('/income/summary'),

  adminUsers: () => request('/admin/users'),
  adminStats: () => request('/admin/stats'),
  setUserStatus: (id, isActive) =>
    request(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { isActive } }),
};

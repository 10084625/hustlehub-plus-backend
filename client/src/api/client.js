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

const FRIENDLY = {
  0: 'We could not reach the server. Check your connection and try again.',
  429: 'You are doing that too often. Please wait a few minutes and try again.',
  500: 'Something went wrong on our side. Please try again shortly.',
};

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
    throw new ApiError(FRIENDLY[0], 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
}
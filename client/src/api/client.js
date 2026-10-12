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
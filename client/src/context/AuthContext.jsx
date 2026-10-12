import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setAuthToken, setUnauthorisedHandler } from '../api/client';
import { decodeTokenExpiry } from '../utils/token';

/**
 * Session handling.
 *
 * The JWT is kept in sessionStorage (not localStorage): it is cleared when the
 * tab closes and is not shared with other tabs. The strict CSP means no
 * third-party or inline script can run on the page to read it. The session
 * also ends automatically the moment the token expires or the API answers
 * 401 (for example, the account was suspended).
 *
 * The role stored here only decides what the UI shows. Every permission is
 * enforced again by the API, so editing it in the browser grants nothing.
 */
const STORAGE_KEY = 'hh_session';
const AuthContext = createContext(null);

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const exp = decodeTokenExpiry(s.token);
    if (!exp || exp <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
};
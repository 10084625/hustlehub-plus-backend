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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const s = readSession();
    setAuthToken(s?.token ?? null);
    return s;
  });
  const [notice, setNotice] = useState('');
  const timer = useRef(null);

  const logout = useCallback((message = '') => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setSession(null);
    setNotice(typeof message === 'string' ? message : '');
  }, []);

  const startSession = useCallback(({ user, token }) => {
    const s = { user: { id: user.id, username: user.username, role: user.role }, token };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setAuthToken(token);
    setNotice('');
    setSession(s);
    return s.user;
  }, []);

  // Auto-logout exactly when the token expires.
  useEffect(() => {
    clearTimeout(timer.current);
    if (!session) return undefined;
    const ms = (decodeTokenExpiry(session.token) ?? 0) - Date.now();
    timer.current = setTimeout(() => logout('Your session expired. Please sign in again.'), Math.max(0, ms));
    return () => clearTimeout(timer.current);
  }, [session, logout]);

  useEffect(() => {
    setUnauthorisedHandler(() => logout('Please sign in again to continue.'));
  }, [logout]);

  const login = useCallback(async (credentials) => startSession(await api.login(credentials)), [startSession]);
  const register = useCallback(async (details) => startSession(await api.register(details)), [startSession]);
  const clearNotice = useCallback(() => setNotice(''), []);

  const value = useMemo(
    () => ({ user: session?.user ?? null, isAuthenticated: Boolean(session), login, register, logout, notice, clearNotice }),
    [session, login, register, logout, notice, clearNotice]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

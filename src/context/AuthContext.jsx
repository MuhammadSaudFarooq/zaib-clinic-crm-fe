import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useData } from './DataContext';
import config from '@/config';

/**
 * Frontend-only (mock) authentication.
 * Credentials are checked against the staff list in the local data store.
 * "Remember me" keeps the session in localStorage, otherwise sessionStorage.
 */

const SESSION_KEY = `${config.storagePrefix}:session`;
const AuthContext = createContext(null);

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const { state } = useData();
  const [session, setSession] = useState(readSession);

  const user = useMemo(() => {
    if (!session) return null;
    const u = state.staff.find((s) => s.id === session.userId);
    return u && u.status === 'active' ? u : null;
  }, [session, state.staff]);

  const role = user ? state.roles[user.role] : null;
  const permissions = useMemo(() => new Set(role?.permissions || []), [role]);

  const login = useCallback(
    async (email, password, remember) => {
      await new Promise((r) => setTimeout(r, config.loginDelayMs)); // simulate network latency
      const u = state.staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
      if (!u || u.password !== password) {
        return { ok: false, error: 'Invalid email or password. Please try again.' };
      }
      if (u.status !== 'active') {
        return { ok: false, error: 'This account has been deactivated. Please contact the administrator.' };
      }
      const s = { userId: u.id, at: new Date().toISOString() };
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
      setSession(s);
      return { ok: true, user: u };
    },
    [state.staff],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const can = useCallback((perm) => {
    if (!perm) return true;
    if (Array.isArray(perm)) return perm.some((p) => permissions.has(p));
    return permissions.has(perm);
  }, [permissions]);

  const value = useMemo(
    () => ({ user, role, isAdmin: user?.role === 'admin', permissions, can, login, logout }),
    [user, role, permissions, can, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

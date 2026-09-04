import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthApi } from '@/api/endpoints';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  /** A password usada no login mais recente — só em memória (nunca gravada), para pré-preencher
   * o ecrã de troca de password obrigatória sem obrigar a reescrevê-la. */
  lastLoginPassword: string | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setMustChangePassword: (value: boolean) => void;
  clearLastLoginPassword: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [lastLoginPassword, setLastLoginPassword] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('afunes_user');
    const token = localStorage.getItem('afunes_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      setMustChangePassword(localStorage.getItem('afunes_must_change_password') === 'true');
    }
    setLoading(false);
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await AuthApi.login(identifier, password);
    localStorage.setItem('afunes_token', res.accessToken);
    localStorage.setItem('afunes_user', JSON.stringify(res.user));
    localStorage.setItem('afunes_must_change_password', String(res.mustChangePassword));
    setUser(res.user);
    setMustChangePassword(res.mustChangePassword);
    setLastLoginPassword(res.mustChangePassword ? password : null);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('afunes_token');
    localStorage.removeItem('afunes_user');
    localStorage.removeItem('afunes_must_change_password');
    setUser(null);
    setLastLoginPassword(null);
  };

  const updateMustChangePassword = (value: boolean) => {
    localStorage.setItem('afunes_must_change_password', String(value));
    setMustChangePassword(value);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      mustChangePassword,
      lastLoginPassword,
      login,
      logout,
      setMustChangePassword: updateMustChangePassword,
      clearLastLoginPassword: () => setLastLoginPassword(null),
    }),
    [user, loading, mustChangePassword, lastLoginPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
}

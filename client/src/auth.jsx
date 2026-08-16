import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The cookie is httpOnly, so the only way to know who we are is to ask.
  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      isDriver: user?.role === 'driver',
      async login(credentials) {
        const data = await api.login(credentials);
        setUser(data.user);
        return data.user;
      },
      async register(details) {
        const data = await api.register(details);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        // Even if the server can't be reached, sign out locally - never
        // leave someone stuck "signed in" on a shared or borrowed device.
        try {
          await api.logout();
        } finally {
          setUser(null);
        }
      },
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

import { createContext, useContext, useEffect, useState } from 'react';
import client, { AUTH_EXPIRED_EVENT, AUTH_KEYS } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const username = localStorage.getItem('username');
    return token ? { token, email, username } : null;
  });

  async function login(email, password) {
    const res = await client.post('/auth/login', { email, password });
    const { token, email: em, username } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('email', em);
    localStorage.setItem('username', username);
    setUser({ token, email: em, username });
  }

  async function register(email, password, username) {
    await client.post('/auth/register', { email, password, username });
  }

  function logout() {
    AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    setUser(null);
  }

  // API 401 döndürünce (client.js) oturumu kapat
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

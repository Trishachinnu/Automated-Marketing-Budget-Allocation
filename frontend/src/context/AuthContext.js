import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isAuthenticated, setIsAuth]  = useState(false);

  const loadUser = useCallback(async () => {
    const token  = localStorage.getItem('authToken');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        setIsAuth(true);
        const res = await authAPI.getProfile();
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuth(false);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (identifier, password) => {
    const res = await authAPI.login({ identifier, password });
    const { token, user: u } = res.data;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setIsAuth(true);
    return res.data;
  };

  const signup = async (formData) => {
    const res = await authAPI.signup(formData);
    const { token, user: u } = res.data;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setIsAuth(true);
    return res.data;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
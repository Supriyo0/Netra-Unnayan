import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2500);

    const initAuth = async () => {
      const token = localStorage.getItem('nu_token');
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me.php');
        if (mounted && res.success && res.data) {
          setUser(res.data);
          localStorage.setItem('nu_user', JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        if (mounted) logout();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login.php', {
      identifier,
      password
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('nu_token', res.data.token);
      localStorage.setItem('nu_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (fullName, email, phone, password) => {
    const res = await api.post('/auth/register.php', {
      full_name: fullName,
      email,
      phone,
      password
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('nu_token', res.data.token);
      localStorage.setItem('nu_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('nu_token');
    localStorage.removeItem('nu_user');
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('nu_user', JSON.stringify(next));
      return next;
    });
  };

  const isAdmin = user?.type === 'admin';
  const isSuperAdmin = isAdmin && user?.role_slug === 'super_admin';
  const isStaff = isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      isAdmin,
      isSuperAdmin,
      isStaff
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

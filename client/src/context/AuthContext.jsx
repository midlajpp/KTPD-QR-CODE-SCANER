import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('ktpd_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ktpd_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('ktpd_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setAdmin(response.data.admin);
          localStorage.setItem('ktpd_admin', JSON.stringify(response.data.admin));
        }
      } catch (err) {
        localStorage.removeItem('ktpd_token');
        localStorage.removeItem('ktpd_admin');
        setAdmin(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (usernameOrEmail, password) => {
    const response = await api.post('/auth/login', { usernameOrEmail, password });
    if (response.data.success) {
      const { token: receivedToken, admin: receivedAdmin } = response.data;
      localStorage.setItem('ktpd_token', receivedToken);
      localStorage.setItem('ktpd_admin', JSON.stringify(receivedAdmin));
      setToken(receivedToken);
      setAdmin(receivedAdmin);
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('ktpd_token');
      localStorage.removeItem('ktpd_admin');
      setToken(null);
      setAdmin(null);
      window.location.href = '/login';
    }
  };

  const normalizedRole = (admin?.role || '').toLowerCase().replace(/_/g, '');
  const isSuperAdmin = normalizedRole === 'superadmin';
  const isAdmin = isSuperAdmin || normalizedRole === 'admin';
  const isStaff = normalizedRole === 'staff';

  const hasRole = (allowedRoles = []) => {
    if (!admin?.role) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/_/g, ''));
    return normalizedRoles.includes(normalizedRole);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        loading,
        isSuperAdmin,
        isAdmin,
        isStaff,
        hasRole,
        canManageAccounts: isSuperAdmin,
        canManageDesign: isSuperAdmin,
        canManageFields: isAdmin,
        canExport: isAdmin,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


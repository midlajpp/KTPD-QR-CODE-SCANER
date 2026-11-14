import axios from 'axios';

// Normalize API Base URL from environment or default to local proxy
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

const resolveBaseUrl = () => {
  if (!rawApiUrl) {
    return '/api';
  }
  const trimmed = rawApiUrl.replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  return trimmed;
};

export const API_BASE_URL = resolveBaseUrl();

/**
 * Resolves full URL for assets uploaded to the backend server (e.g. logos, background images).
 * Prepends the backend origin if the asset is an uploaded file (/uploads/...) and frontend is on a different host.
 */
export const getAssetUrl = (assetPath) => {
  if (!assetPath) return '';
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('data:')) {
    return assetPath;
  }
  if (assetPath.startsWith('/uploads/')) {
    if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
      try {
        const origin = new URL(API_BASE_URL).origin;
        return `${origin}${assetPath}`;
      } catch {
        return assetPath;
      }
    }
  }
  return assetPath;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ktpd_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      // Do not redirect if scanning public QR profile or verification
      if (!currentPath.startsWith('/m/') && !currentPath.startsWith('/verify/') && !currentPath.startsWith('/v/')) {
        localStorage.removeItem('ktpd_token');
        localStorage.removeItem('ktpd_admin');
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersListPage from './pages/MembersListPage';
import ImportPage from './pages/ImportPage';
import BulkExportPage from './pages/BulkExportPage';
import ManageFieldsPage from './pages/ManageFieldsPage';
import QRProfileDesignPage from './pages/QRProfileDesignPage';
import AccountManagementPage from './pages/AccountManagementPage';
import PublicProfilePage from './pages/PublicProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Guard with Role-Based Access Control
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, admin } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Checking authentication status..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && (!admin?.role || !roles.includes(admin.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public only (redirects to dashboard if already logged in)
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Member Profile (Permanent QR Scan Target) */}
              <Route path="/m/:token" element={<PublicProfilePage />} />
              <Route path="/verify/:token" element={<PublicProfilePage />} />
              <Route path="/v/:token" element={<PublicProfilePage />} />

              {/* Admin Login */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="members" element={<MembersListPage />} />
                <Route
                  path="import"
                  element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <ImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bulk-import"
                  element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <ImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="export"
                  element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <BulkExportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bulk-export"
                  element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <BulkExportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings/fields"
                  element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <ManageFieldsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile-design"
                  element={
                    <ProtectedRoute roles={['superadmin']}>
                      <QRProfileDesignPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="accounts"
                  element={
                    <ProtectedRoute roles={['superadmin']}>
                      <AccountManagementPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Upload,
  Download,
  Sliders,
  Palette,
  UserCheck,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { logout, admin } = useAuth();

  const allNavItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'staff'] },
    { to: '/members', label: 'Members Directory', icon: Users, roles: ['superadmin', 'admin', 'staff'] },
    { to: '/import', label: 'Bulk Import', icon: Upload, roles: ['superadmin', 'admin'] },
    { to: '/export', label: 'Bulk Export', icon: Download, roles: ['superadmin', 'admin'] },
    { to: '/settings/fields', label: 'Manage Fields', icon: Sliders, roles: ['superadmin', 'admin'] },
    { to: '/profile-design', label: 'QR Profile Design', icon: Palette, roles: ['superadmin'] },
    { to: '/accounts', label: 'Account Management', icon: UserCheck, roles: ['superadmin'] }
  ];

  const currentRole = (admin?.role || 'staff').toLowerCase().replace(/_/g, '');
  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.map((r) => r.toLowerCase().replace(/_/g, '')).includes(currentRole)
  );

  return (
    <>
      {isMobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/ktpd-logo.svg" alt="KTPD Logo" className="sidebar-logo" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="sidebar-brand-title">KTPD</h1>
            <p className="sidebar-brand-subtitle">Membership System</p>
          </div>
          {isMobileOpen && (
            <button
              className="btn-icon mobile-menu-btn"
              onClick={onCloseMobile}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {admin?.fullName || admin?.username || 'Admin'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor:
                    currentRole === 'superadmin' ? '#EEF2FF' : currentRole === 'admin' ? '#DCFCE7' : '#F1F5F9',
                  color:
                    currentRole === 'superadmin' ? '#4F46E5' : currentRole === 'admin' ? '#15803D' : '#475569'
                }}
              >
                {currentRole === 'superadmin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

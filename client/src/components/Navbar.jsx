import React from 'react';
import { Menu, Sun, Moon, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onOpenMobile, onOpenAddMember }) => {
  const { theme, toggleTheme } = useTheme();
  const { admin } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn-icon mobile-menu-btn"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <span
          className="topbar-subtitle"
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            fontWeight: 500
          }}
        >
          KTPD Drivers Association &bull; UAE Chapter
        </span>
      </div>

      <div className="topbar-right">
        {onOpenAddMember && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenAddMember}
            style={{ display: 'inline-flex' }}
          >
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        )}

        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingLeft: '0.5rem',
            borderLeft: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem'
            }}
          >
            {admin?.username?.slice(0, 1).toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


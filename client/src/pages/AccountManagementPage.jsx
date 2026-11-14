import React, { useState, useEffect, useCallback } from 'react';
import { accountService } from '../services/accountService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UserCheck,
  Shield,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'badge-purple',
    bg: '#EEF2FF',
    color: '#4F46E5',
    desc: 'Full application access, account management, and design settings.'
  },
  admin: {
    label: 'Admin',
    badgeClass: 'badge-blue',
    bg: '#ECFDF5',
    color: '#059669',
    desc: 'Manage members, QR codes, custom fields, and data exports.'
  },
  staff: {
    label: 'Staff',
    badgeClass: 'badge-subtle',
    bg: '#F1F5F9',
    color: '#475569',
    desc: 'View members and dashboard statistics only.'
  }
};

const AccountManagementPage = () => {
  const { admin: currentAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    superadmins: 0,
    admins: 0,
    staff: 0,
    active: 0,
    inactive: 0
  });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Selected Account for Action
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    status: 'active'
  });
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: 'admin',
    status: 'active'
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountService.getAccounts({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: 20
      });
      if (res.success) {
        setAccounts(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, showError]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle Create Account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createForm.password !== createForm.confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (createForm.password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await accountService.createAccount(createForm);
      if (res.success) {
        showSuccess(res.message || 'Account created.');
        setCreateModalOpen(false);
        setCreateForm({
          fullName: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'admin',
          status: 'active'
        });
        fetchAccounts();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (account) => {
    setSelectedAccount(account);
    setEditForm({
      fullName: account.fullName || '',
      email: account.email || '',
      role: account.role || 'admin',
      status: account.status || 'active'
    });
    setEditModalOpen(true);
  };

  // Handle Edit Account
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const res = await accountService.updateAccount(selectedAccount._id, editForm);
      if (res.success) {
        showSuccess(res.message || 'Account updated.');
        setEditModalOpen(false);
        setSelectedAccount(null);
        fetchAccounts();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Password Modal
  const openPasswordModal = (account) => {
    setSelectedAccount(account);
    setPasswordForm({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPassword(false);
    setPasswordModalOpen(true);
  };

  // Handle Password Reset
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await accountService.resetPassword(
        selectedAccount._id,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      if (res.success) {
        showSuccess(res.message || 'Password reset.');
        setPasswordModalOpen(false);
        setSelectedAccount(null);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Toggle Status Dialog
  const openStatusDialog = (account) => {
    setSelectedAccount(account);
    setStatusDialogOpen(true);
  };

  // Handle Status Toggle Confirm
  const handleStatusToggleConfirm = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      const newStatus = selectedAccount.status === 'active' ? 'inactive' : 'active';
      const res = await accountService.toggleStatus(selectedAccount._id, newStatus);
      if (res.success) {
        showSuccess(res.message || `Account ${newStatus}.`);
        setStatusDialogOpen(false);
        setSelectedAccount(null);
        fetchAccounts();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Status update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Dialog
  const openDeleteDialog = (account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      const res = await accountService.deleteAccount(selectedAccount._id);
      if (res.success) {
        showSuccess(res.message || 'Account deleted.');
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
        fetchAccounts();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Deletion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={26} color="var(--primary)" />
            <span>Account Management</span>
          </h1>
          <p className="page-subtitle">
            Manage administrative accounts and role permissions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={fetchAccounts} title="Refresh">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={16} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-label">Total Accounts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
            <Shield size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.superadmins || 0}</span>
            <span className="stat-label">Super Admins</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.admins || 0}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.staff || 0}</span>
            <span className="stat-label">Staff Members</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ width: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {(search || roleFilter || statusFilter) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner text="Loading accounts..." />
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <UserCheck size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No accounts found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {search || roleFilter || statusFilter
                ? 'Try adjusting your search criteria or clearing active filters.'
                : 'Click "Create Account" to add the first administrator or staff member.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const roleInfo = ROLE_CONFIG[acc.role] || ROLE_CONFIG.admin;
                  const isActive = acc.status === 'active';
                  const isSelf = currentAdmin?.username === acc.username;

                  return (
                    <tr key={acc._id}>
                      {/* Name & Username */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: roleInfo.bg,
                              color: roleInfo.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              flexShrink: 0
                            }}
                          >
                            {(acc.fullName || acc.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                              {acc.fullName || acc.username}
                              {isSelf && (
                                <span
                                  style={{
                                    marginLeft: '0.4rem',
                                    fontSize: '0.6875rem',
                                    color: 'var(--primary)',
                                    fontWeight: 700
                                  }}
                                >
                                  (You)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              @{acc.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {acc.email}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: roleInfo.bg,
                            color: roleInfo.color
                          }}
                        >
                          {acc.role === 'superadmin' && <Shield size={12} />}
                          <span>{roleInfo.label}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                            color: isActive ? '#15803D' : '#991B1B'
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#16A34A' : '#DC2626'
                            }}
                          />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Last Login */}
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {acc.lastLogin
                            ? new Date(acc.lastLogin).toLocaleDateString() +
                              ' ' +
                              new Date(acc.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Never'}
                        </span>
                      </td>

                      {/* Created */}
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(acc.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          {/* Edit Button */}
                          <button
                            className="btn-icon"
                            title="Edit Account Details"
                            onClick={() => openEditModal(acc)}
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Reset Password Button */}
                          <button
                            className="btn-icon"
                            title="Reset Account Password"
                            onClick={() => openPasswordModal(acc)}
                          >
                            <KeyRound size={15} />
                          </button>

                          {/* Toggle Status Button */}
                          <button
                            className="btn-icon"
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => openStatusDialog(acc)}
                          >
                            {isActive ? (
                              <XCircle size={15} color="var(--warning-text)" />
                            ) : (
                              <CheckCircle size={15} color="#16A34A" />
                            )}
                          </button>

                          {/* Delete Button (disabled for self) */}
                          <button
                            className="btn-icon"
                            title={isSelf ? 'Cannot delete your own account' : 'Delete Account'}
                            onClick={() => openDeleteDialog(acc)}
                            disabled={isSelf}
                            style={{ color: isSelf ? 'var(--text-muted)' : 'var(--danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= CREATE ACCOUNT MODAL ================= */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Authorized Account"
        subtitle="Provision a new administrative or staff account with dedicated credentials."
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateSubmit}
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Full Name */}
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Abdul Rahman"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            />
          </div>

          {/* Username & Email Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Username <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. arahman"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">
                Email Address <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. arahman@ktpd.org"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
          </div>

          {/* Password & Confirm Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min 6 characters"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-icon"
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">
                Confirm Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter password"
                required
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="form-label">
              Account Role <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {Object.entries(ROLE_CONFIG).map(([rKey, rVal]) => {
                const isSelected = createForm.role === rKey;
                return (
                  <div
                    key={rKey}
                    onClick={() => setCreateForm({ ...createForm, role: rKey })}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#EFF6FF' : 'var(--bg-surface)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: rVal.color }}>
                      {rVal.label}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                      {rVal.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Initial Status */}
          <div>
            <label className="form-label">Account Status</label>
            <select
              className="form-select"
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
            >
              <option value="active">Active (Permit immediate login)</option>
              <option value="inactive">Inactive (Prevent login)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT ACCOUNT MODAL ================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Account: @${selectedAccount?.username || ''}`}
        subtitle="Update full name, email address, role permissions, or status."
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setEditModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleEditSubmit}
              disabled={submitting}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Account Role</label>
            <select
              className="form-select"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              <option value="superadmin">Super Admin (Full Access)</option>
              <option value="admin">Admin (Manage Members & Fields)</option>
              <option value="staff">Staff (View Only)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Account Status</label>
            <select
              className="form-select"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ================= RESET PASSWORD MODAL ================= */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title={`Reset Password: @${selectedAccount?.username || ''}`}
        subtitle="Specify a new password for this administrative user."
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setPasswordModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePasswordSubmit}
              disabled={submitting}
            >
              {submitting ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </>
        }
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Minimum 6 characters"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter new password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ================= TOGGLE STATUS CONFIRM DIALOG ================= */}
      <ConfirmDialog
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleStatusToggleConfirm}
        title={
          selectedAccount?.status === 'active'
            ? `Deactivate @${selectedAccount?.username}?`
            : `Activate @${selectedAccount?.username}?`
        }
        message={
          selectedAccount?.status === 'active'
            ? 'Deactivate this account? User will not be able to log in.'
            : 'Activate this account? User will regain login access.'
        }
        confirmText={selectedAccount?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={selectedAccount?.status === 'active'}
        loading={submitting}
      />

      {/* ================= DELETE CONFIRM DIALOG ================= */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Account"
        message={`Delete account @${selectedAccount?.username}? This action cannot be undone.`}
        confirmText="Delete Account"
        danger={true}
        loading={submitting}
      />
    </div>
  );
};

export default AccountManagementPage;


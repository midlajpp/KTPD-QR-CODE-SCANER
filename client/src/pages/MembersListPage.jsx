import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate, useLocation } from 'react-router-dom';
import { memberService } from '../services/memberService';
import { StatusBadge, BloodBadge } from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import MemberDetailModal from '../components/MemberDetailModal';
import MemberFormModal from '../components/MemberFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import ExportModal from '../components/ExportModal';
import { useToast } from '../context/ToastContext';
import { getDisplayMemberId } from '../utils/memberUtils';
import {
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Edit,
  Eye,
  CheckSquare,
  Square,
  QrCode,
  Layers,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MembersListPage = () => {
  const { refreshTrigger, openAddModal } = useOutletContext();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters & Search (Default to newest first so newly created or imported members are immediately visible)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals state
  const [detailMember, setDetailMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset filters and ensure newest-first sort when arriving directly from import
  useEffect(() => {
    if (location.state?.fromImport) {
      setSearch('');
      setStatusFilter('');
      setBloodGroupFilter('');
      setSortBy('createdAt');
      setSortOrder('desc');
      // Clear navigation state so subsequent user actions aren't continually overridden
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchMembers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await memberService.getMembers({
        page,
        limit: pagination.limit,
        search,
        status: statusFilter,
        bloodGroup: bloodGroupFilter,
        sortBy,
        sortOrder
      });
      if (res.success) {
        setMembers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      showError('Failed to fetch members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
    setSelectedIds(new Set());
  }, [search, statusFilter, bloodGroupFilter, sortBy, sortOrder, refreshTrigger]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMembers(newPage);
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.memberId)));
    }
  };

  const handleSelectRow = (memberId) => {
    const updated = new Set(selectedIds);
    if (updated.has(memberId)) {
      updated.delete(memberId);
    } else {
      updated.add(memberId);
    }
    setSelectedIds(updated);
  };

  // Download & Export handlers
  const handleDownloadSingleQr = async (member) => {
    try {
      await memberService.downloadQrCode(member._id || member.memberId, member.memberId);
      showSuccess(`QR code downloaded for ${member.memberId}`);
    } catch (err) {
      showError('Failed to download QR code.');
    }
  };

  const handleGoToBulkExport = () => {
    if (selectedIds.size > 0) {
      navigate(`/export?ids=${Array.from(selectedIds).join(',')}`);
    } else {
      navigate('/export');
    }
  };

  const handleExportCsv = async () => {
    try {
      showSuccess('Downloading KTPD-Members.csv...');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (selectedIds.size > 0) params.ids = Array.from(selectedIds).join(',');
      await memberService.downloadMembersCsv(params);
      showSuccess('KTPD-Members.csv downloaded successfully!');
    } catch (err) {
      showError('Failed to download CSV.');
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    setDeleteLoading(true);
    try {
      const res = await memberService.deleteMember(deletingMember._id || deletingMember.memberId);
      showSuccess(res.message || 'Member permanently deleted.');
      setDeletingMember(null);
      fetchMembers(pagination.page);
    } catch (err) {
      showError('Failed to delete member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk Delete handler
  const handleExecuteBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      const idsArray = Array.from(selectedIds);
      const res = await memberService.bulkDeleteMembers(idsArray);
      if (res.success) {
        showSuccess(res.message || `${res.deletedCount} member(s) deleted.`);
        setSelectedIds(new Set());
        setShowBulkDeleteModal(false);
        fetchMembers(pagination.page);
      } else {
        showError(res.message || 'Deletion failed.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Bulk deletion failed.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Directory</h1>
          <p className="page-subtitle">
            Manage driver records, permanent QR codes, and exports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            disabled={selectedIds.size === 0}
            className={`btn ${selectedIds.size > 0 ? 'btn-danger' : 'btn-outline'}`}
            title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected member(s)` : 'Select members to delete'}
          >
            <Trash2 size={16} />
            <span>{selectedIds.size > 0 ? `Bulk Delete (${selectedIds.size})` : 'Bulk Delete'}</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-secondary"
            title="Export Members + QR Codes, CSV, or QR ZIP"
          >
            <Download size={16} />
            <span>{selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export'}</span>
          </button>
          <button
            onClick={handleGoToBulkExport}
            className="btn btn-outline"
            title="Open Dedicated Bulk Export Workspace"
          >
            <Layers size={16} />
            <span>Advanced Export</span>
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search name, ID, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: 140 }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Blood Group Filter */}
        <div style={{ minWidth: 140 }}>
          <select
            className="form-select"
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
          >
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>

        {/* Sort selector */}
        <div style={{ minWidth: 150 }}>
          <select
            className="form-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
          >
            <option value="memberId-asc">Sort ID (Asc)</option>
            <option value="memberId-desc">Sort ID (Desc)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </select>
        </div>

        <button
          className="btn-icon"
          onClick={() => fetchMembers(pagination.page)}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Interactive Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="card"
          style={{
            padding: '0.875rem 1.25rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.04)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                width: 28,
                height: 28,
                borderRadius: '50%',
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}
            >
              {selectedIds.size}
            </span>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                {selectedIds.size} {selectedIds.size === 1 ? 'member' : 'members'} selected
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedIds(new Set())}
              title="Clear selection"
            >
              <X size={14} />
              <span>Clear</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleGoToBulkExport}
              title="Bulk Export"
            >
              <Download size={14} />
              <span>Export ({selectedIds.size})</span>
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowBulkDeleteModal(true)}
              title="Bulk Delete"
            >
              <Trash2 size={14} />
              <span>Delete ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading members..." />
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No members found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Try adjusting your search or click "Add Member".
            </p>
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={selectedIds.size === members.length && members.length > 0}
                        onChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th>ID No</th>
                    <th>Name</th>
                    <th>Emirates ID</th>
                    <th>Mobile</th>
                    <th>Transport Company</th>
                    <th>Blood</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isSelected = selectedIds.has(member.memberId);
                    return (
                      <tr
                        key={member._id}
                        style={{
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent'
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(member.memberId)}
                            aria-label={`Select ${member.memberId}`}
                          />
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: getDisplayMemberId(member) === 'No ID Assigned' ? 'var(--text-muted)' : 'var(--primary)',
                              fontSize: '0.875rem'
                            }}
                          >
                            {getDisplayMemberId(member)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{member.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                          {member.emiratesId}
                        </td>
                        <td>
                          <a href={`tel:${member.mobileNo}`} style={{ color: 'inherit' }}>
                            {member.mobileNo}
                          </a>
                        </td>
                        <td>{member.transportCompany}</td>
                        <td>
                          <BloodBadge bloodGroup={member.bloodGroup} />
                        </td>
                        <td>
                          <StatusBadge status={member.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem'
                            }}
                          >
                            <button
                              className="btn-icon"
                              onClick={() => setDetailMember(member)}
                              title="View Member & QR"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => setEditMember(member)}
                              title="Edit Member"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleDownloadSingleQr(member)}
                              title="Download QR PNG"
                            >
                              <QrCode size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => setDeletingMember(member)}
                              title="Permanently Delete Member"
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

            {/* Pagination footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} records
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    padding: '0 0.5rem'
                  }}
                >
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {detailMember && (
        <MemberDetailModal
          isOpen={!!detailMember}
          onClose={() => setDetailMember(null)}
          member={detailMember}
          onEdit={(m) => {
            setDetailMember(null);
            setEditMember(m);
          }}
          onStatusChanged={() => fetchMembers(pagination.page)}
        />
      )}

      {editMember && (
        <MemberFormModal
          isOpen={!!editMember}
          onClose={() => setEditMember(null)}
          member={editMember}
          onSaved={() => {
            setEditMember(null);
            fetchMembers(pagination.page);
          }}
        />
      )}

      {deletingMember && (
        <ConfirmDialog
          isOpen={!!deletingMember}
          onClose={() => setDeletingMember(null)}
          onConfirm={handleDeleteConfirm}
          title="Permanently Delete Member"
          message={`Are you sure you want to permanently delete member ${getDisplayMemberId(deletingMember)} (${deletingMember.name})? This will permanently remove their record from MongoDB. This action cannot be undone.`}
          confirmText="Delete Member"
          danger={true}
          loading={deleteLoading}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <Modal
          isOpen={showBulkDeleteModal}
          onClose={() => !bulkDeleteLoading && setShowBulkDeleteModal(false)}
          title="Confirm Permanent Bulk Deletion"
          subtitle={`Permanently deleting ${selectedIds.size} member record${selectedIds.size > 1 ? 's' : ''}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleExecuteBulkDelete}
                disabled={bulkDeleteLoading || selectedIds.size === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Trash2 size={16} />
                <span>
                  {bulkDeleteLoading
                    ? 'Deleting...'
                    : `Permanently Delete (${selectedIds.size})`}
                </span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Warning Callout Box */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  padding: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--danger)', fontSize: '0.9375rem', fontWeight: 600 }}>
                  Warning: Permanent Database Deletion
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Permanently delete <strong>{selectedIds.size}</strong> member record{selectedIds.size > 1 ? 's' : ''} from MongoDB? These records will be completely removed and their public QR profiles will no longer resolve. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* List of members being deleted */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Selected Member IDs ({selectedIds.size})
                </span>
              </div>
              <div
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-main)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.375rem'
                }}
              >
                {Array.from(selectedIds).map((id) => (
                  <span
                    key={id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Advanced Bulk Export Modal with 3 distinct options */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          selectedCount={selectedIds.size}
          totalCount={pagination.total}
          selectedIds={selectedIds}
          activeFilters={{ search, status: statusFilter }}
        />
      )}
    </div>
  );
};

export default MembersListPage;


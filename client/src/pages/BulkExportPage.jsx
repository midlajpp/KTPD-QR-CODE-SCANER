import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { memberService } from '../services/memberService';
import { StatusBadge, BloodBadge } from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { getDisplayMemberId } from '../utils/memberUtils';
import {
  Download,
  QrCode,
  FileSpreadsheet,
  FolderArchive,
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader,
  Users
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BulkExportPage = () => {
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');

  // Download loading states
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingQrZip, setDownloadingQrZip] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const { showSuccess, showError } = useToast();

  // Fetch all members for bulk selection
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await memberService.getMembers({ limit: 1000, sortBy: 'memberId', sortOrder: 'asc' });
      if (res.success && res.data) {
        setMembers(res.data);

        // Pre-select IDs passed in query parameters (e.g. ?ids=KTPD-0001,KTPD-0002)
        const paramIds = searchParams.get('ids');
        if (paramIds) {
          const idList = paramIds.split(',').map((id) => id.trim().toUpperCase());
          setSelectedIds(new Set(idList));
        } else {
          // Default: select all members
          setSelectedIds(new Set(res.data.map((m) => m.memberId)));
        }
      }
    } catch (err) {
      showError('Failed to load member records for export.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Filtered members list based on active filters
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (statusFilter && member.status !== statusFilter) return false;
      if (bloodGroupFilter && member.bloodGroup !== bloodGroupFilter) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchName = (member.name || '').toLowerCase().includes(query);
        const matchId = (member.memberId || '').toLowerCase().includes(query);
        const matchMobile = (member.mobileNo || '').toLowerCase().includes(query);
        const matchEmirates = (member.emiratesId || '').toLowerCase().includes(query);
        const matchCompany = (member.transportCompany || '').toLowerCase().includes(query);
        if (!matchName && !matchId && !matchMobile && !matchEmirates && !matchCompany) {
          return false;
        }
      }
      return true;
    });
  }, [members, search, statusFilter, bloodGroupFilter]);

  // Selection helpers
  const handleSelectAllFiltered = () => {
    const updated = new Set(selectedIds);
    filteredMembers.forEach((m) => updated.add(m.memberId));
    setSelectedIds(updated);
  };

  const handleSelectAllInSystem = () => {
    setSelectedIds(new Set(members.map((m) => m.memberId)));
  };

  const handleSelectActiveOnly = () => {
    const activeIds = members.filter((m) => m.status === 'Active').map((m) => m.memberId);
    setSelectedIds(new Set(activeIds));
  };

  const handleSelectInactiveOnly = () => {
    const inactiveIds = members.filter((m) => m.status === 'Inactive').map((m) => m.memberId);
    setSelectedIds(new Set(inactiveIds));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleToggleRow = (memberId) => {
    const updated = new Set(selectedIds);
    if (updated.has(memberId)) {
      updated.delete(memberId);
    } else {
      updated.add(memberId);
    }
    setSelectedIds(updated);
  };

  const isAllFilteredSelected =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.has(m.memberId));

  // Determine export parameters based on selection
  const getExportParams = () => {
    // If all members in system are selected, we can omit ids to export entire database cleanly
    if (selectedIds.size === members.length && members.length > 0) {
      return {};
    }
    return { ids: Array.from(selectedIds).join(',') };
  };

  // 1. Download CSV Button Handler
  const handleDownloadCsv = async () => {
    if (selectedIds.size === 0) {
      showError('Select at least 1 member.');
      return;
    }
    setDownloadingCsv(true);
    try {
      await memberService.downloadMembersCsv(getExportParams());
      showSuccess('CSV downloaded.');
    } catch (err) {
      showError('Export failed.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  // 2. Download QR PNG Files ZIP Handler
  const handleDownloadQrZip = async () => {
    if (selectedIds.size === 0) {
      showError('Select at least 1 member.');
      return;
    }
    setDownloadingQrZip(true);
    try {
      await memberService.downloadQrZip(getExportParams());
      showSuccess('QR codes downloaded.');
    } catch (err) {
      showError('Download failed.');
    } finally {
      setDownloadingQrZip(false);
    }
  };

  // 3. Download All (CSV + QR ZIP) Handler
  const handleDownloadAll = async () => {
    if (selectedIds.size === 0) {
      showError('Select at least 1 member.');
      return;
    }
    setDownloadingAll(true);
    try {
      await memberService.downloadCompleteExportZip(getExportParams());
      showSuccess('Archive downloaded.');
    } catch (err) {
      showError('Download failed.');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Export</h1>
          <p className="page-subtitle">
            Export member records to CSV and download high-resolution QR codes.
          </p>
        </div>
      </div>

      {/* Export Action Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1: Download CSV */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Member CSV
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  KTPD-Members.csv
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Includes all active fields, custom fields, and QR code image references.
            </p>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || selectedIds.size === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem' }}
          >
            {downloadingCsv ? <Loader size={18} className="spinner" /> : <Download size={18} />}
            <span>{downloadingCsv ? 'Generating...' : `Download CSV (${selectedIds.size})`}</span>
          </button>
        </div>

        {/* Card 2: Download QR PNG ZIP */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <QrCode size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  QR Codes ZIP
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  KTPD-QR-Codes.zip
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              High-resolution 300 DPI PNG images named by Member ID.
            </p>
          </div>

          <button
            onClick={handleDownloadQrZip}
            disabled={downloadingQrZip || selectedIds.size === 0}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem' }}
          >
            {downloadingQrZip ? <Loader size={18} className="spinner" /> : <Download size={18} />}
            <span>{downloadingQrZip ? 'Packaging...' : `Download QR ZIP (${selectedIds.size})`}</span>
          </button>
        </div>

        {/* Card 3: Download All (CSV + QR ZIP) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1.5px solid var(--primary-light)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FolderArchive size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Complete Package
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  KTPD-Export.zip
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Combined archive with CSV records, QR images folder, and documentation.
            </p>
          </div>

          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll || selectedIds.size === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem', backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}
          >
            {downloadingAll ? <Loader size={18} className="spinner" /> : <Download size={18} />}
            <span>{downloadingAll ? 'Packaging...' : `Download All (${selectedIds.size})`}</span>
          </button>
        </div>
      </div>

      {/* Selection Control Panel */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Left: Selection Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: selectedIds.size > 0 ? 'var(--primary-light)' : 'var(--bg-subtle)',
                color: selectedIds.size > 0 ? 'var(--primary)' : 'var(--text-muted)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <Users size={16} />
              <span>
                {selectedIds.size} of {members.length} members selected for export
              </span>
            </div>

            {selectedIds.size === 0 && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={14} /> Select at least one member to enable downloads.
              </span>
            )}
          </div>

          {/* Right: Quick Selection Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleSelectAllInSystem} title="Select all registered members">
              Select All Members ({members.length})
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSelectActiveOnly} title="Select all active status members">
              Select Active Members
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSelectInactiveOnly} title="Select all inactive status members">
              Select Inactive Members
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleClearSelection} disabled={selectedIds.size === 0}>
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Members Table */}
      <div className="card">
        {/* Search & Filters Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search members by name, ID, phone, Emirates ID..."
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
          <div style={{ minWidth: 150 }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Blood Group Filter */}
          <div style={{ minWidth: 150 }}>
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

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAllFiltered}
            title="Select all members currently visible in table"
          >
            <CheckSquare size={15} />
            <span>Select Filtered ({filteredMembers.length})</span>
          </button>
        </div>

        {/* Member Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner text="Loading member directory..." />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 500 }}>No members found matching the specified filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={isAllFilteredSelected}
                      onChange={() => {
                        if (isAllFilteredSelected) {
                          // Unselect filtered
                          const updated = new Set(selectedIds);
                          filteredMembers.forEach((m) => updated.delete(m.memberId));
                          setSelectedIds(updated);
                        } else {
                          handleSelectAllFiltered();
                        }
                      }}
                      aria-label="Select all visible members"
                    />
                  </th>
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Emirates ID</th>
                  <th>Mobile Number</th>
                  <th>Transport Company</th>
                  <th>Blood Group</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const isChecked = selectedIds.has(member.memberId);
                  return (
                    <tr
                      key={member.memberId}
                      onClick={() => handleToggleRow(member.memberId)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.03)' : 'transparent'
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(member.memberId)}
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
                        {member.emiratesId || 'N/A'}
                      </td>
                      <td>{member.mobileNo || 'N/A'}</td>
                      <td>{member.transportCompany || 'N/A'}</td>
                      <td>
                        <BloodBadge bloodGroup={member.bloodGroup} />
                      </td>
                      <td>
                        <StatusBadge status={member.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div
          style={{
            padding: '0.875rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}
        >
          <span>
            Showing {filteredMembers.length} of {members.length} total members
          </span>
          <span>
            <strong>{selectedIds.size}</strong> members currently selected for bulk download
          </span>
        </div>
      </div>
    </div>
  );
};

export default BulkExportPage;


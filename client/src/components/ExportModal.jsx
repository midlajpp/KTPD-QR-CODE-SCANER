import React, { useState } from 'react';
import Modal from './Modal';
import { memberService } from '../services/memberService';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  FileSpreadsheet,
  FolderArchive,
  QrCode,
  CheckCircle2,
  Info,
  Loader,
  Users,
  CheckSquare,
  AlertCircle
} from 'lucide-react';

const ExportModal = ({
  isOpen,
  onClose,
  selectedCount = 0,
  totalCount = 0,
  selectedIds = new Set(),
  activeFilters = {}
}) => {
  const [exportScope, setExportScope] = useState(selectedCount > 0 ? 'selected' : 'all');
  const [downloadingType, setDownloadingType] = useState(null); // 'pdf' | 'zip' | 'csv' | 'qr'
  const { showSuccess, showError } = useToast();

  if (!isOpen) return null;

  const hasSelection = selectedCount > 0;
  const targetCount = exportScope === 'selected' && hasSelection ? selectedCount : totalCount;

  // Build API query parameters based on scope
  const getParams = () => {
    const params = {};
    if (exportScope === 'selected' && hasSelection) {
      params.ids = Array.from(selectedIds).join(',');
    } else {
      // If active search/status filters were applied on directory
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeFilters.search) params.search = activeFilters.search;
    }
    return params;
  };

  // 1. Download A4 PDF (Members + QR Codes)
  const handleDownloadPdf = async () => {
    setDownloadingType('pdf');
    try {
      await memberService.downloadMembersPdf(getParams());
      showSuccess(`A4 PDF document for ${targetCount} member(s) downloaded successfully.`);
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate A4 PDF document.');
    } finally {
      setDownloadingType(null);
    }
  };

  // 2. Download Complete ZIP (Members + QR Codes)
  const handleDownloadCompleteZip = async () => {
    setDownloadingType('zip');
    try {
      await memberService.downloadCompleteExportZip(getParams());
      showSuccess(`Complete export package for ${targetCount} member(s) downloaded successfully.`);
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to package complete export ZIP.');
    } finally {
      setDownloadingType(null);
    }
  };

  // 3. Download Members Data Only (CSV)
  const handleDownloadDataCsv = async () => {
    setDownloadingType('csv');
    try {
      await memberService.downloadMembersDataCsv(getParams());
      showSuccess(`CSV data file for ${targetCount} member(s) downloaded successfully.`);
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to export CSV data.');
    } finally {
      setDownloadingType(null);
    }
  };

  // 4. Download QR Codes Only (ZIP)
  const handleDownloadQrOnlyZip = async () => {
    setDownloadingType('qr');
    try {
      await memberService.downloadQrZip(getParams());
      showSuccess(`Printable QR PNG ZIP for ${targetCount} member(s) downloaded successfully.`);
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to package QR codes ZIP.');
    } finally {
      setDownloadingType(null);
    }
  };

  const isBusy = downloadingType !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isBusy && onClose()}
      size="lg"
      title="Advanced Bulk Export"
      subtitle="Export member records, printable A4 sheets, spreadsheets, and QR codes"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            {isBusy ? 'Exporting in progress...' : 'Close'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Scope Selection Box */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Export Scope & Selection
            </span>
            <span className="badge badge-subtle" style={{ fontSize: '0.75rem' }}>
              Targeting: <strong>{targetCount} member{targetCount !== 1 ? 's' : ''}</strong>
            </span>
          </div>

          {hasSelection ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${exportScope === 'selected' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setExportScope('selected')}
                disabled={isBusy}
                style={{ flex: '1 1 180px' }}
              >
                <CheckSquare size={15} />
                <span>Selected Members ({selectedCount})</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${exportScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setExportScope('all')}
                disabled={isBusy}
                style={{ flex: '1 1 180px' }}
              >
                <Users size={15} />
                <span>All Members ({totalCount})</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                padding: '0.75rem 0.875rem',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                No members are currently checked in the directory table. Choose to export all <strong>{totalCount}</strong> active members in the system, or close this window to check specific member rows first.
              </div>
            </div>
          )}
        </div>

        {/* Loading Progress Notification if Active */}
        {isBusy && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.875rem 1.125rem',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary)'
            }}
          >
            <Loader size={20} className="spinner" />
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {downloadingType === 'pdf' && 'Generating high-resolution A4 printable PDF with member records and QR codes...'}
              {downloadingType === 'zip' && 'Packaging complete ZIP archive with Members.csv, Member-Details/, and QR-Codes/...'}
              {downloadingType === 'csv' && 'Exporting pure member data CSV file (excluding QR images)...'}
              {downloadingType === 'qr' && 'Packaging printable QR PNG images (300 DPI) into ZIP archive...'}
            </div>
          </div>
        )}

        {/* Three Distinct Export Option Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* OPTION 1: Export Members + QR Codes */}
          <div
            className="card"
            style={{
              padding: '1.25rem',
              border: '1.5px solid var(--border)',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(29, 78, 216, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    1. Export Members + QR Codes
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Complete member records coupled with verified QR codes
                  </span>
                </div>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                A4 PDF & ZIP
              </span>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Includes all member information, contact details, dynamic custom fields, and each member's verified QR code image (encoding their permanent profile URL).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadPdf}
                disabled={isBusy}
                style={{ justifyContent: 'center' }}
              >
                {downloadingType === 'pdf' ? <Loader size={16} className="spinner" /> : <FileText size={16} />}
                <span>Download A4 PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadCompleteZip}
                disabled={isBusy}
                style={{ justifyContent: 'center' }}
              >
                {downloadingType === 'zip' ? <Loader size={16} className="spinner" /> : <FolderArchive size={16} />}
                <span>Download ZIP Package</span>
              </button>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              ZIP contains: <code>Members.csv</code>, <code>Member-Details/</code> folder, and <code>QR-Codes/</code> folder (named <code>{'{ID}'}.png</code>).
            </div>
          </div>

          {/* OPTION 2: Export Members Data Only (CSV) */}
          <div
            className="card"
            style={{
              padding: '1.25rem',
              border: '1.5px solid var(--border)',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    2. Export Members Data Only (CSV)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Spreadsheet export without QR images
                  </span>
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                Data Only
              </span>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Includes official KTPD Membership IDs, standard contact fields, and all dynamic custom attributes. Preserves leading zeros (e.g. <code>00125</code>) and alphanumeric IDs. Excludes QR code images.
            </p>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadDataCsv}
              disabled={isBusy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {downloadingType === 'csv' ? <Loader size={16} className="spinner" /> : <FileSpreadsheet size={16} />}
              <span>Download CSV (KTPD-Members-Data.csv)</span>
            </button>
          </div>

          {/* OPTION 3: Export QR Codes Only (ZIP) */}
          <div
            className="card"
            style={{
              padding: '1.25rem',
              border: '1.5px solid var(--border)',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: '#8B5CF6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <QrCode size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    3. Export QR Codes Only (ZIP)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Individual high-resolution printable PNG files
                  </span>
                </div>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                QR PNGs Only
              </span>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Generates individual 300 DPI PNG images named strictly by Member ID (e.g. <code>A001.png</code>, <code>D343.png</code>). Encodes permanent profile URLs. Excludes personal member information.
            </p>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadQrOnlyZip}
              disabled={isBusy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {downloadingType === 'qr' ? <Loader size={16} className="spinner" /> : <QrCode size={16} />}
              <span>Download QR ZIP (KTPD-QR-Codes.zip)</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;

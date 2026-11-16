import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberService } from '../services/memberService';
import { useToast } from '../context/ToastContext';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'alphanumeric', label: 'ID No (Alphanumeric)' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'textarea', label: 'Textarea (Paragraph)' },
  { value: 'number', label: 'Number' }
];

const ImportPage = () => {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update' | 'cancel'
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Template download
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await memberService.downloadTemplateCsv();
      showSuccess('Template downloaded successfully.');
    } catch (err) {
      showError('Failed to download CSV template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // File selection & smart preview analysis
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      showError('Please upload a valid .csv file.');
      return;
    }
    setFile(selectedFile);
    setImportResult(null);
    runSmartPreview(selectedFile);
  };

  const runSmartPreview = async (csvFile) => {
    setAnalyzing(true);
    setPreviewData(null);
    setColumnConfigs([]);
    setAvailableFields([]);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await memberService.previewImportCsv(formData);
      if (res.success) {
        setPreviewData(res);
        setAvailableFields(res.availableFields || []);
        setColumnConfigs(
          res.columns.map((col) => ({
            header: col.header,
            isExisting: col.isExisting,
            isMemberId: Boolean(col.isMemberId),
            fieldKey: col.fieldKey,
            customFieldKey: col.customFieldKey || col.fieldKey,
            fieldLabel: col.fieldLabel || col.header,
            fieldType: col.isMemberId ? 'alphanumeric' : (col.fieldType || col.suggestedType || 'text'),
            isSystemField: col.isSystemField || false,
            included: true
          }))
        );
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to analyze CSV file.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Column config mutators
  const handleToggleColumn = (index) => {
    setColumnConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, included: !c.included } : c))
    );
  };

  const handleLabelChange = (index, newLabel) => {
    setColumnConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, fieldLabel: newLabel } : c))
    );
  };

  const handleTypeChange = (index, newType) => {
    setColumnConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, fieldType: newType } : c))
    );
  };

  const handleFieldMappingChange = (index, targetKey) => {
    if (targetKey === '__NEW__') {
      setColumnConfigs((prev) =>
        prev.map((c, i) =>
          i === index
            ? {
                ...c,
                isExisting: false,
                isSystemField: false,
                fieldKey: c.header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50),
                fieldLabel: c.header.trim(),
                fieldType: 'text'
              }
            : c
        )
      );
    } else {
      const matchedField = availableFields.find((f) => f.fieldKey === targetKey);
      if (matchedField) {
        setColumnConfigs((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  isExisting: true,
                  isSystemField: Boolean(matchedField.isSystemField),
                  fieldKey: matchedField.fieldKey,
                  fieldLabel: matchedField.fieldLabel,
                  fieldType: matchedField.fieldType || 'text'
                }
              : c
          )
        );
      }
    }
  };

  // Execute Smart Import
  const handleStartImport = () => {
    if (duplicateStrategy === 'update') {
      setShowUpdateConfirm(true);
    } else {
      executeImport();
    }
  };

  const executeImport = async () => {
    setShowUpdateConfirm(false);
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(columnConfigs));
      formData.append('duplicateStrategy', duplicateStrategy);

      const res = await memberService.importCsv(formData);
      if (res.success) {
        setImportResult(res);
        showSuccess(res.message || 'Import completed successfully!');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to complete smart import.');
    } finally {
      setImporting(false);
    }
  };

  // Download error CSV
  const handleDownloadErrorReport = () => {
    if (!previewData || !previewData.invalidRows) return;
    const errorReportRows = previewData.invalidRows.map((item) => ({
      Row: item.rowNumber,
      Errors: item.errors.join('; '),
      ...item.data
    }));

    const csvContent = Papa.unparse(errorReportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ktpd_import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData(null);
    setColumnConfigs([]);
    setAvailableFields([]);
    setImportResult(null);
  };

  const newFieldsCount = columnConfigs.filter((c) => !c.isExisting && c.included).length;
  const existingFieldsCount = columnConfigs.filter((c) => c.isExisting && c.included).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title">Bulk Import</h1>
            <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={13} /> Auto-Detect
            </span>
          </div>
          <p className="page-subtitle">
            Upload CSV to auto-detect columns, import members, and generate permanent QR codes.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="btn btn-secondary"
        >
          <Download size={16} />
          <span>{downloadingTemplate ? 'Downloading...' : 'Download Template'}</span>
        </button>
      </div>

      {/* Import Result Screen */}
      {importResult && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Import Complete
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: 540, margin: '0 auto 1.75rem' }}>
            {importResult.message}
          </p>

          {/* Metrics summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              maxWidth: 680,
              margin: '0 auto 2rem'
            }}
          >
            <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
                {importResult.summary.importedCount}
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Created
              </p>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                {importResult.summary.updatedCount}
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Updated
              </p>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8B5CF6' }}>
                {importResult.summary.fieldsCreatedCount}
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                New Fields
              </p>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {importResult.summary.skippedCount}
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Skipped
              </p>
            </div>
          </div>

          {/* New fields list (if any created) */}
          {importResult.summary.newFieldsCreated && importResult.summary.newFieldsCreated.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                maxWidth: 680,
                margin: '0 auto 2rem',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sparkles size={16} color="#8B5CF6" />
                <strong style={{ fontSize: '0.875rem', color: '#6D28D9' }}>
                  Automatically Created Dynamic Custom Fields:
                </strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {importResult.summary.newFieldsCreated.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {f.fieldLabel} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({f.fieldType})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={resetImport}>
              <RotateCcw size={16} />
              <span>Import Another</span>
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/members')}>
              <span>View Members</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Upload Zone (hidden when import is done) */}
      {!importResult && (
        <div
          className="card"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border)',
            backgroundColor: isDragOver ? 'var(--primary-light)' : 'var(--bg-surface)',
            cursor: 'pointer',
            marginBottom: '2rem',
            transition: 'all 0.2s ease'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          />

          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <Upload size={32} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {file ? file.name : 'Choose a CSV file or drag and drop here'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: 560, margin: '0.5rem auto 0' }}>
            Supports any CSV structure with automatic column detection and permanent QR generation.
          </p>

          {file && (
            <div style={{ marginTop: '1rem' }}>
              <span className="badge badge-blue">
                <FileSpreadsheet size={14} />
                {(file.size / 1024).toFixed(1)} KB &bull; Click or drop another to replace
              </span>
            </div>
          )}
        </div>
      )}

      {/* Analyzing spinner */}
      {analyzing && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <RefreshCw
            size={28}
            color="var(--primary)"
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}
          />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Analyzing CSV & Detecting Field Schemas...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Comparing column headers against MongoDB field registry and checking for duplicates.
          </p>
        </div>
      )}

      {/* Step 2: Smart Preview & Field Configuration */}
      {previewData && !importResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Summary Metric Strip */}
          <div
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {previewData.summary.totalRows}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>Total Rows</span>
              </div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {previewData.totalColumns}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>Columns</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.875rem' }}>
                  {existingFieldsCount} Matched Existing Fields
                </span>
              </div>
              {newFieldsCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.875rem' }}>
                    <Sparkles size={12} /> {newFieldsCount} New Fields to Auto-Create
                  </span>
                </div>
              )}
              {previewData.summary.duplicateRowCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.875rem' }}>
                    {previewData.summary.duplicateRowCount} Duplicates Detected
                  </span>
                </div>
              )}
              {previewData.summary.invalidRowCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="badge badge-danger" style={{ fontSize: '0.875rem' }}>
                    {previewData.summary.invalidRowCount} Invalid Rows
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {previewData.summary.invalidRowCount > 0 && (
                <button
                  className="btn btn-danger-outline btn-sm"
                  onClick={handleDownloadErrorReport}
                >
                  <Download size={14} />
                  <span>Download Error CSV</span>
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={resetImport}
              >
                <span>Change File</span>
              </button>
            </div>
          </div>

          {/* Automatic Field Creation & Column Mapping Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={18} color="var(--primary)" />
                  <h3 className="card-title">Column Detection & Field Mapping</h3>
                </div>
                <p className="card-subtitle">
                  Verify how each CSV column will be mapped into MongoDB. You can customize field labels, modify inferred data types, or exclude unwanted columns.
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>Include</th>
                    <th>CSV Header</th>
                    <th>Database Field Status</th>
                    <th>Field Label (In MongoDB)</th>
                    <th>Field Type</th>
                    <th>Stored Key</th>
                  </tr>
                </thead>
                <tbody>
                  {columnConfigs.map((col, idx) => (
                    <tr
                      key={idx}
                      style={{
                        opacity: col.included ? 1 : 0.45,
                        backgroundColor: !col.isExisting && col.included ? 'rgba(139, 92, 246, 0.03)' : 'transparent'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={col.included}
                          onChange={() => handleToggleColumn(idx)}
                          aria-label={`Include ${col.header}`}
                        />
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{col.header}</strong>
                      </td>
                      <td>
                        {col.isMemberId ? (
                          <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            <ShieldCheck size={12} /> Official Member ID
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <select
                              className="form-select"
                              value={col.isExisting ? col.fieldKey : '__NEW__'}
                              onChange={(e) => handleFieldMappingChange(idx, e.target.value)}
                              disabled={!col.included}
                              style={{ minWidth: 200, padding: '0.35rem 0.5rem', fontSize: '0.8125rem' }}
                            >
                              <optgroup label="Action / New Field">
                                <option value="__NEW__">+ Create as New Custom Field</option>
                              </optgroup>
                              {availableFields && availableFields.length > 0 && (
                                <optgroup label="Map to Existing Database Field">
                                  {availableFields.map((f) => (
                                    <option key={f.fieldKey} value={f.fieldKey}>
                                      {f.fieldLabel || f.fieldKey} ({f.fieldKey})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            {col.isExisting ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                                <Check size={11} /> Reusing Existing Field
                              </span>
                            ) : (
                              <span className="badge badge-purple" style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                                <Sparkles size={11} /> New Field to Create
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          value={col.fieldLabel}
                          onChange={(e) => handleLabelChange(idx, e.target.value)}
                          disabled={!col.included}
                          style={{ minWidth: 160, padding: '0.35rem 0.65rem', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={col.fieldType}
                          onChange={(e) => handleTypeChange(idx, e.target.value)}
                          disabled={!col.included || col.isSystemField}
                          style={{ minWidth: 160, padding: '0.35rem 0.65rem', fontSize: '0.875rem' }}
                        >
                          {FIELD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {col.fieldKey}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Duplicate Handling Strategy Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Duplicate Record Handling Policy
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Choose how the system handles members whose Membership ID or Emirates ID already exists in the database.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: duplicateStrategy === 'skip' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: duplicateStrategy === 'skip' ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="dupStrategy"
                  value="skip"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>
                    Skip Duplicates (Recommended)
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Leave existing records untouched and register only new members.
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: duplicateStrategy === 'update' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: duplicateStrategy === 'update' ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="dupStrategy"
                  value="update"
                  checked={duplicateStrategy === 'update'}
                  onChange={() => setDuplicateStrategy('update')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>
                    Update Existing Records
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update details and merge custom fields. <em>Permanent QR tokens are preserved.</em>
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: duplicateStrategy === 'cancel' ? '2px solid var(--danger)' : '1px solid var(--border)',
                  backgroundColor: duplicateStrategy === 'cancel' ? 'var(--danger-light)' : 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="dupStrategy"
                  value="cancel"
                  checked={duplicateStrategy === 'cancel'}
                  onChange={() => setDuplicateStrategy('cancel')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>
                    Cancel on Duplicate
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Aborts the entire batch if any duplicate ID is found.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Validation Errors Table (if any) */}
          {previewData.invalidRows && previewData.invalidRows.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ backgroundColor: 'var(--danger-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--danger)" />
                  <h3 className="card-title" style={{ color: 'var(--danger-text)' }}>
                    Validation Warnings ({previewData.invalidRows.length} rows)
                  </h3>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Row #</th>
                      <th>Error Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.invalidRows.slice(0, 20).map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>#{item.rowNumber}</strong>
                        </td>
                        <td style={{ color: 'var(--danger)', fontWeight: 500 }}>
                          {item.errors.join(' • ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Parsed Records Preview */}
          {previewData.previewRows && previewData.previewRows.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Preview Sample Records</h3>
                  <p className="card-subtitle">
                    Showing first {previewData.previewRows.length} rows as parsed from your uploaded CSV.
                  </p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      {columnConfigs
                        .filter((c) => c.included)
                        .map((c, i) => (
                          <th key={i}>{c.fieldLabel}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.previewRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{rIdx + 1}</td>
                        {columnConfigs
                          .filter((c) => c.included)
                          .map((c, cIdx) => (
                            <td key={cIdx} style={{ fontSize: '0.875rem' }}>
                              {row[c.header] || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bottom Execution Bar */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              border: '1.5px solid var(--primary-light)'
            }}
          >
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Ready to Import {previewData.summary.validRowsCount} Members
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {newFieldsCount > 0 ? `${newFieldsCount} new custom field(s) will be created in MongoDB. ` : ''}
                Permanent QR codes will be generated for all new members.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={resetImport} disabled={importing}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartImport}
                disabled={importing || previewData.summary.validRowsCount === 0}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                {importing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Processing Import...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Confirm & Execute Import</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal when updating existing members */}
      {showUpdateConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Confirm Member Updates
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Duplicate policy set to "Update Existing Records"
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Matching records in MongoDB will be updated with the values from your CSV.
              <br />
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '0.5rem' }}>
                Existing permanent QR tokens and URLs will NOT be regenerated or altered.
              </strong>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowUpdateConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={executeImport}>
                Yes, Update Existing Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;

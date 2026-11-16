import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { StatusBadge, BloodBadge } from './Badge';
import { memberService } from '../services/memberService';
import { fieldService } from '../services/fieldService';
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Edit,
  ShieldCheck,
  Phone,
  AlertCircle,
  Layers,
  Loader
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getDisplayMemberId } from '../utils/memberUtils';

const MemberDetailModal = ({ isOpen, onClose, member, onEdit, onStatusChanged }) => {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [fieldDefs, setFieldDefs] = useState({});
  const [qrBlobUrl, setQrBlobUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (isOpen && member) {
      setLoadingQr(true);
      memberService
        .getQrImageBlob(member._id || member.memberId)
        .then((url) => {
          if (active) {
            objectUrl = url;
            setQrBlobUrl(url);
          }
        })
        .catch(() => {
          if (active) {
            setQrBlobUrl(memberService.getQrImageUrl(member._id || member.memberId));
          }
        })
        .finally(() => {
          if (active) setLoadingQr(false);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, member]);

  useEffect(() => {
    if (isOpen) {
      fieldService
        .getFields()
        .then((res) => {
          if (res.success) {
            const map = {};
            res.data.forEach((f) => {
              map[f.fieldKey] = f;
            });
            setFieldDefs(map);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!member) return null;

  const qrImageUrl = memberService.getQrImageUrl(member._id || member.memberId);
  const qrDownloadUrl = memberService.getQrImageUrl(member._id || member.memberId, true);
  const profileUrl = member.profileUrl || `${window.location.origin}/m/${member.qrToken}`;

  const handleDownloadQr = async (e) => {
    e.preventDefault();
    setDownloadingQr(true);
    try {
      const displayId = getDisplayMemberId(member);
      const filenameId = displayId && displayId !== 'No ID Assigned' ? displayId : (member.memberId || 'member');
      await memberService.downloadQrCode(member._id || member.memberId, filenameId);
      showSuccess(`QR code downloaded for ${filenameId}`);
    } catch (err) {
      showError('Failed to download QR code.');
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showSuccess('Profile URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      showError('Failed to copy to clipboard.');
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
      await memberService.toggleStatus(member._id || member.memberId, newStatus);
      showSuccess(`Status changed to ${newStatus}`);
      onStatusChanged && onStatusChanged();
    } catch (err) {
      showError('Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  const displayId = getDisplayMemberId(member);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`${displayId} — ${member.name}`}
      subtitle="Membership profile and QR details"
      footer={
        <>
          <button
            className={`btn ${member.status === 'Active' ? 'btn-danger-outline' : 'btn-outline'} btn-sm`}
            onClick={handleToggleStatus}
            disabled={toggling}
          >
            Set {member.status === 'Active' ? 'Inactive' : 'Active'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onClose();
              onEdit(member);
            }}
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="member-detail-grid">
        {/* Left: Details */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap'
            }}
          >
            <StatusBadge status={member.status} />
            <BloodBadge bloodGroup={member.bloodGroup} />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: displayId === 'No ID Assigned' ? 'var(--text-muted)' : 'var(--primary)',
                backgroundColor: displayId === 'No ID Assigned' ? 'var(--bg-subtle)' : 'var(--primary-light)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {displayId}
            </span>
          </div>

          <div className="detail-field-grid">
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Emirates ID
              </p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {member.emiratesId}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Mobile Number
              </p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                <a href={`tel:${member.mobileNo}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={14} />
                  {member.mobileNo}
                </a>
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Transport Company
              </p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {member.transportCompany}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Emergency Contact
              </p>
              <p style={{ fontWeight: 600, color: 'var(--danger)', marginTop: '0.15rem' }}>
                {member.emergencyContact}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Living Area (UAE)
              </p>
              <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {member.livingArea || 'N/A'}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                UAE / India Details
              </p>
              <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {member.uae || member.india ? `${member.uae || ''} / ${member.india || ''}` : 'N/A'}
              </p>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Permanent Address in India
              </p>
              <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {member.addressInIndia || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Dynamic Custom Fields Section */}
          {member.customFields && Object.keys(member.customFields).length > 0 && (
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
                <Layers size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Custom Attributes
                </span>
              </div>

              <div className="detail-field-grid">
                {Object.entries(member.customFields).map(([key, val]) => {
                  if (val === undefined || val === null || val === '') return null;
                  const def = fieldDefs[key];
                  const label = def?.fieldLabel || key;

                  // Nested Group / Object
                  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    const entries = Object.entries(val).filter(([_, v]) => v !== undefined && v !== null && v !== '');
                    if (entries.length === 0) return null;

                    return (
                      <div
                        key={key}
                        style={{
                          gridColumn: 'span 2',
                          padding: '0.75rem',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                          {label}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                          {entries.map(([subKey, subVal]) => {
                            const subDef = (def?.children || []).find((c) => c.fieldKey === subKey);
                            const subLabel = subDef?.fieldLabel || subKey;
                            const isSubArr = Array.isArray(subVal);

                            return (
                              <div key={subKey}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>
                                  {subLabel}
                                </span>
                                {isSubArr ? (
                                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '2px' }}>
                                    {subVal.map((item, idx) => (
                                      <span key={idx} className="badge badge-subtle" style={{ fontSize: '0.6875rem' }}>
                                        {String(item)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem', fontFamily: subDef?.fieldType === 'alphanumeric' ? 'monospace' : 'inherit' }}>
                                    {String(subVal)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Array (e.g. Checkbox Question)
                  if (Array.isArray(val)) {
                    if (val.length === 0) return null;
                    return (
                      <div key={key} style={{ gridColumn: 'span 2' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          {label}
                        </p>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {val.map((item, idx) => (
                            <span key={idx} className="badge" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: '0.75rem' }}>
                              {String(item)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  const isBool = typeof val === 'boolean' || def?.fieldType === 'boolean';
                  const displayVal = isBool ? (val ? 'Yes' : 'No') : String(val);

                  return (
                    <div key={key}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {label}
                      </p>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', fontFamily: def?.fieldType === 'alphanumeric' ? 'monospace' : 'inherit' }}>
                        {def?.fieldType === 'url' ? (
                          <a href={displayVal.startsWith('http') ? displayVal : `https://${displayVal}`} target="_blank" rel="noopener noreferrer">
                            {displayVal}
                          </a>
                        ) : (
                          displayVal
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Privacy summary */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}
          >
            <strong>Public Privacy Settings:</strong>{' '}
            {member.privacySettings?.hideEmiratesId ? 'Emirates ID masked' : 'Emirates ID public'},{' '}
            {member.privacySettings?.hideAddressInIndia ? 'Address hidden' : 'Address visible'},{' '}
            {member.privacySettings?.hideEmergencyContact ? 'Emergency masked' : 'Emergency visible'}.
          </div>
        </div>

        {/* Right: Permanent QR Code Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              padding: '8px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '0.875rem',
              minWidth: 160,
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {loadingQr ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Loader size={24} className="spinner" />
                <span>Loading QR...</span>
              </div>
            ) : (
              <img
                src={qrBlobUrl || qrImageUrl}
                alt={`QR Code for ${member.memberId}`}
                style={{ width: 160, height: 160, display: 'block' }}
              />
            )}
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '0.875rem'
            }}
          >
            Permanent QR Code (300 DPI)
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <button
              onClick={handleDownloadQr}
              disabled={downloadingQr}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              {downloadingQr ? <Loader size={15} className="spinner" /> : <Download size={15} />}
              <span>{downloadingQr ? 'Downloading...' : 'Download QR'}</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={handleCopyUrl} style={{ width: '100%' }}>
              {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <a
              href={`/m/${member.qrToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ width: '100%' }}
            >
              <ExternalLink size={15} />
              <span>View Profile</span>
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MemberDetailModal;


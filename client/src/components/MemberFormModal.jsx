import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import DynamicFieldInput from './DynamicFieldInput';
import { memberService } from '../services/memberService';
import { fieldService } from '../services/fieldService';
import { useToast } from '../context/ToastContext';
import { Layers } from 'lucide-react';
import { getDisplayMemberId } from '../utils/memberUtils';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const initialFormData = {
  ktpdNo: '',
  name: '',
  emiratesId: '',
  mobileNo: '',
  transportCompany: '',
  emergencyContact: '',
  uae: '',
  india: '',
  addressInIndia: '',
  livingArea: '',
  bloodGroup: 'B+',
  status: 'Active',
  customFields: {},
  privacySettings: {
    hideEmiratesId: true,
    hideAddressInIndia: true,
    hideEmergencyContact: false
  }
};

const MemberFormModal = ({ isOpen, onClose, member = null, onSaved }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [activeFieldKeys, setActiveFieldKeys] = useState(new Set([
    'name', 'emiratesId', 'mobileNo', 'transportCompany', 'emergencyContact',
    'bloodGroup', 'livingArea', 'uae', 'india', 'addressInIndia'
  ]));
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const isEditMode = Boolean(member && (member._id || member.memberId));

  // Fetch active custom fields and system fields whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fieldService
        .getFields({ activeOnly: true })
        .then((res) => {
          if (res.success) {
            const keySet = new Set(res.data.map((f) => f.fieldKey));
            setActiveFieldKeys(keySet);
            const customOnly = res.data.filter((f) => !f.isSystemField);
            setCustomFieldDefs(customOnly);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (member) {
      const displayId = getDisplayMemberId(member);
      const resolvedKtpdNo = displayId === 'No ID Assigned' ? '' : displayId;
      setFormData({
        ktpdNo: resolvedKtpdNo,
        name: member.name || '',
        emiratesId: member.emiratesId || '',
        mobileNo: member.mobileNo || '',
        transportCompany: member.transportCompany || '',
        emergencyContact: member.emergencyContact || '',
        uae: member.uae || '',
        india: member.india || '',
        addressInIndia: member.addressInIndia || '',
        livingArea: member.livingArea || '',
        bloodGroup: member.bloodGroup || 'B+',
        status: member.status || 'Active',
        customFields: {
          ...(member.customFields || {}),
          ...(resolvedKtpdNo ? { ktpdNo: resolvedKtpdNo } : {})
        },
        privacySettings: {
          hideEmiratesId: member.privacySettings?.hideEmiratesId ?? true,
          hideAddressInIndia: member.privacySettings?.hideAddressInIndia ?? true,
          hideEmergencyContact: member.privacySettings?.hideEmergencyContact ?? false
        }
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [member, isOpen]);

  const handleKtpdNoChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      ktpdNo: val,
      customFields: {
        ...prev.customFields,
        ktpdNo: val
      }
    }));
    if (errors.ktpdNo || errors.memberId || errors.custom_ktpdNo) {
      setErrors((prev) => ({ ...prev, ktpdNo: null, memberId: null, custom_ktpdNo: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleCustomFieldChange = (key, value) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        customFields: {
          ...prev.customFields,
          [key]: value
        }
      };
      if (key === 'ktpdNo' || key === 'ktpd_no' || /^ktpd.*(no|id)/i.test(key)) {
        updated.ktpdNo = value;
      }
      return updated;
    });
    if (errors[`custom_${key}`]) {
      setErrors((prev) => ({ ...prev, [`custom_${key}`]: null }));
    }
    if ((key === 'ktpdNo' || key === 'ktpd_no') && (errors.ktpdNo || errors.memberId)) {
      setErrors((prev) => ({ ...prev, ktpdNo: null, memberId: null }));
    }
  };

  const handlePrivacyChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [name]: checked
      }
    }));
  };

  const validate = () => {
    const newErrors = {};

    // KTPD NO (Membership ID) format validation
    if (formData.ktpdNo && formData.ktpdNo.trim()) {
      if (!/^[a-zA-Z0-9\-_/]+$/.test(formData.ktpdNo.trim())) {
        newErrors.ktpdNo = 'Member ID must contain only letters, numbers, hyphens (-), slashes (/), or underscores (_)';
      }
    }

    // Full name is the primary identifier
    if (activeFieldKeys.has('name') && !formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    // Phone numbers: validate format only when a value is provided (optional fields must not fail when empty)
    if (formData.mobileNo && formData.mobileNo.trim()) {
      if (!/^[\d\+\-\(\)\s]{5,30}$/.test(formData.mobileNo.trim())) {
        newErrors.mobileNo = 'Invalid phone number format';
      }
    }

    // Validate dynamic custom fields (empty optional fields are completely valid)
    customFieldDefs.forEach((f) => {
      const val = formData.customFields[f.fieldKey];

      if (f.fieldType === 'alphanumeric' && val !== undefined && val !== null && String(val).trim() !== '') {
        if (!/^[a-zA-Z0-9\-_/]+$/.test(String(val).trim())) {
          newErrors[`custom_${f.fieldKey}`] = `${f.fieldLabel || 'ID No'} must contain only letters, numbers, hyphens (-), slashes (/), or underscores (_)`;
        }
      }

      if (f.children && f.children.length > 0) {
        f.children.forEach((child) => {
          if (child.fieldType === 'alphanumeric') {
            const parentObj = typeof val === 'object' && val !== null ? val : {};
            const childVal = parentObj[child.fieldKey] !== undefined ? parentObj[child.fieldKey] : formData.customFields[child.fieldKey];
            if (childVal !== undefined && childVal !== null && String(childVal).trim() !== '') {
              if (!/^[a-zA-Z0-9\-_/]+$/.test(String(childVal).trim())) {
                newErrors[`custom_${child.fieldKey}`] = `${child.fieldLabel || 'ID No'} must contain only letters, numbers, hyphens (-), slashes (/), or underscores (_)`;
              }
            }
          }
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        ktpdNo: formData.ktpdNo ? formData.ktpdNo.trim() : '',
        customFields: {
          ...formData.customFields,
          ...(formData.ktpdNo ? { ktpdNo: formData.ktpdNo.trim() } : {})
        }
      };

      if (isEditMode) {
        const idToUpdate = member._id || member.memberId;
        const res = await memberService.updateMember(idToUpdate, payload);
        showSuccess(res.message || 'Member updated.');
      } else {
        const res = await memberService.createMember(payload);
        showSuccess(res.message || 'Member created.');
      }
      onSaved && onSaved();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        const backendErrors = {};
        const messages = [];
        resp.errors.forEach((e) => {
          const fieldKey = typeof e === 'object' ? e.field : null;
          const msg = typeof e === 'object' ? e.message : String(e);
          if (fieldKey) {
            backendErrors[fieldKey] = msg;
            backendErrors[`custom_${fieldKey}`] = msg;
          }
          messages.push(msg);
        });
        setErrors((prev) => ({ ...prev, ...backendErrors }));
        showError(messages.join(' | ') || resp.message || 'Validation failed');
      } else {
        const errorMsg = resp?.message || err.message || 'Failed to save member.';
        showError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditMode ? `Edit Member: ${getDisplayMemberId(member)}` : 'Add Member'}
      subtitle={
        isEditMode
          ? 'Update member details. Permanent QR code remains active.'
          : 'Register a member and generate a permanent QR code.'
      }
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Member'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {isEditMode && (
          <div
            style={{
              padding: '0.625rem 0.875rem',
              backgroundColor: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--primary-border)',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'var(--primary)'
            }}
          >
            <strong>Note:</strong> ID changes update across all records. QR code remains active.
          </div>
        )}

        {/* Section 1: Core Standard Details */}
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.875rem' }}>
          Personal Details
        </h4>

        {/* Authoritative KTPD NO (Membership ID) */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>KTPD NO (Membership ID)</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>Alphanumeric (e.g. D343, KTPD001, KT-001)</span>
          </label>
          <input
            type="text"
            name="ktpdNo"
            className="form-input"
            placeholder="e.g. D343 or KTPD/2026/001"
            value={formData.ktpdNo || ''}
            onChange={handleKtpdNoChange}
            style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9375rem' }}
          />
          {(errors.ktpdNo || errors.memberId || errors.custom_ktpdNo) && (
            <p className="form-error">{errors.ktpdNo || errors.memberId || errors.custom_ktpdNo}</p>
          )}
        </div>

        <div className="form-row">
          {activeFieldKeys.has('name') && (
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>
          )}

          {activeFieldKeys.has('emiratesId') && (
            <div className="form-group">
              <label className="form-label">
                Emirates ID <span className="required">*</span>
              </label>
              <input
                type="text"
                name="emiratesId"
                className="form-input"
                placeholder="e.g. 784-1988-1234567-1"
                value={formData.emiratesId}
                onChange={handleChange}
              />
              {errors.emiratesId && <p className="form-error">{errors.emiratesId}</p>}
            </div>
          )}
        </div>

        <div className="form-row">
          {activeFieldKeys.has('mobileNo') && (
            <div className="form-group">
              <label className="form-label">
                Mobile No (UAE) <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mobileNo"
                className="form-input"
                placeholder="e.g. +971 50 123 4567"
                value={formData.mobileNo}
                onChange={handleChange}
              />
              {errors.mobileNo && <p className="form-error">{errors.mobileNo}</p>}
            </div>
          )}

          {activeFieldKeys.has('transportCompany') && (
            <div className="form-group">
              <label className="form-label">
                Transport Company <span className="required">*</span>
              </label>
              <input
                type="text"
                name="transportCompany"
                className="form-input"
                placeholder="Company name"
                value={formData.transportCompany}
                onChange={handleChange}
              />
              {errors.transportCompany && <p className="form-error">{errors.transportCompany}</p>}
            </div>
          )}
        </div>

        <div className="form-row">
          {activeFieldKeys.has('emergencyContact') && (
            <div className="form-group">
              <label className="form-label">
                Emergency Contact <span className="required">*</span>
              </label>
              <input
                type="text"
                name="emergencyContact"
                className="form-input"
                placeholder="Emergency contact number"
                value={formData.emergencyContact}
                onChange={handleChange}
              />
              {errors.emergencyContact && <p className="form-error">{errors.emergencyContact}</p>}
            </div>
          )}

          {activeFieldKeys.has('bloodGroup') && (
            <div className="form-group">
              <label className="form-label">
                Blood Group <span className="required">*</span>
              </label>
              <select
                name="bloodGroup"
                className="form-select"
                value={formData.bloodGroup}
                onChange={handleChange}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
              {errors.bloodGroup && <p className="form-error">{errors.bloodGroup}</p>}
            </div>
          )}
        </div>

        <div className="form-row">
          {activeFieldKeys.has('livingArea') && (
            <div className="form-group">
              <label className="form-label">Living Area (UAE)</label>
              <input
                type="text"
                name="livingArea"
                className="form-input"
                placeholder="e.g. Deira / Al Quoz / Rolla"
                value={formData.livingArea}
                onChange={handleChange}
              />
            </div>
          )}

          {activeFieldKeys.has('uae') && (
            <div className="form-group">
              <label className="form-label">UAE Contact/City</label>
              <input
                type="text"
                name="uae"
                className="form-input"
                placeholder="e.g. Dubai"
                value={formData.uae}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          {activeFieldKeys.has('india') && (
            <div className="form-group">
              <label className="form-label">India Hometown / District</label>
              <input
                type="text"
                name="india"
                className="form-input"
                placeholder="e.g. Malappuram, Kerala"
                value={formData.india}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {activeFieldKeys.has('addressInIndia') && (
          <div className="form-group">
            <label className="form-label">Address in India</label>
            <textarea
              name="addressInIndia"
              className="form-textarea"
              rows="2"
              placeholder="Full permanent residential address in Kerala, India"
              value={formData.addressInIndia}
              onChange={handleChange}
            />
          </div>
        )}

        {/* Section 2: Dynamic Custom Fields Generator */}
        {customFieldDefs.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Layers size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)' }}>
                Additional Custom Fields
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {customFieldDefs.map((field) => (
                <DynamicFieldInput
                  key={field._id || field.fieldKey}
                  field={field}
                  value={formData.customFields[field.fieldKey]}
                  onChange={handleCustomFieldChange}
                  allValues={formData.customFields}
                  error={errors[`custom_${field.fieldKey}`] || errors[field.fieldKey]}
                  errors={errors}
                />
              ))}
            </div>
          </div>
        )}

        {/* Privacy & Field Visibility Controls */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginTop: '1.25rem'
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.75rem'
            }}
          >
            Public QR Scan Privacy Controls
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                name="hideEmiratesId"
                className="form-checkbox"
                checked={formData.privacySettings.hideEmiratesId}
                onChange={handlePrivacyChange}
              />
              <span>Mask Emirates ID on public profile (recommended for privacy)</span>
            </label>

            <label className="form-checkbox-label">
              <input
                type="checkbox"
                name="hideAddressInIndia"
                className="form-checkbox"
                checked={formData.privacySettings.hideAddressInIndia}
                onChange={handlePrivacyChange}
              />
              <span>Hide Full Address in India on public profile</span>
            </label>

            <label className="form-checkbox-label">
              <input
                type="checkbox"
                name="hideEmergencyContact"
                className="form-checkbox"
                checked={formData.privacySettings.hideEmergencyContact}
                onChange={handlePrivacyChange}
              />
              <span>Mask Emergency Contact number</span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default MemberFormModal;

import React from 'react';

/**
 * Reusable Dynamic Form Input Generator
 * Handles Text, Number, Phone, Email, Date, Textarea, Dropdown,
 * Checkbox Questions, Radio Buttons, Yes/No, and Nested Sub-Fields with Conditional Logic.
 */
const DynamicFieldInput = ({
  field,
  value,
  onChange,
  allValues = {},
  parentKey = null,
  error,
  errors = {}
}) => {
  const {
    fieldKey,
    fieldLabel,
    fieldType,
    options = [],
    children = [],
    conditional
  } = field;

  // Check conditional visibility for this field
  if (conditional && conditional.enabled && conditional.dependsOn) {
    const parentContext = parentKey ? allValues[parentKey] || {} : allValues;
    const depVal = parentContext[conditional.dependsOn] !== undefined
      ? parentContext[conditional.dependsOn]
      : allValues[conditional.dependsOn];

    const actualStr = String(depVal !== undefined && depVal !== null ? depVal : '').trim().toLowerCase();
    const expectedStr = String(conditional.value !== undefined ? conditional.value : 'Yes').trim().toLowerCase();

    let isVisible = true;
    if (conditional.operator === 'not_equals') {
      isVisible = actualStr !== expectedStr;
    } else if (conditional.operator === 'includes') {
      if (Array.isArray(depVal)) {
        isVisible = depVal.map((v) => String(v).toLowerCase()).includes(expectedStr);
      } else {
        isVisible = actualStr.includes(expectedStr);
      }
    } else {
      // Equals
      isVisible = actualStr === expectedStr;
    }

    if (!isVisible) {
      return null; // Condition not satisfied, hide field
    }
  }

  // Handle value change for standard single input
  const handleInputChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(fieldKey, val);
  };

  // Handle multi-select checkbox question toggle
  const handleCheckboxOptionToggle = (opt) => {
    const currentArr = Array.isArray(value) ? [...value] : (typeof value === 'string' && value ? [value] : []);
    let updated;
    if (currentArr.includes(opt)) {
      updated = currentArr.filter((item) => item !== opt);
    } else {
      updated = [...currentArr, opt];
    }
    onChange(fieldKey, updated);
  };

  // Handle nested sub-field change inside parent group
  const handleSubFieldChange = (subKey, subVal) => {
    const currentGroup = typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {};
    currentGroup[subKey] = subVal;
    onChange(fieldKey, currentGroup);
  };

  // Render input according to fieldType
  const renderControl = () => {
    switch (fieldType) {
      case 'group':
        // Parent Group with Nested Sub-Fields
        return (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {children.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                No sub-fields configured in this section.
              </p>
            ) : (
              children.map((child) => (
                <DynamicFieldInput
                  key={child.fieldKey}
                  field={child}
                  value={value && typeof value === 'object' ? value[child.fieldKey] : undefined}
                  onChange={handleSubFieldChange}
                  allValues={allValues}
                  parentKey={fieldKey}
                  error={errors?.[`custom_${child.fieldKey}`] || errors?.[child.fieldKey]}
                  errors={errors}
                />
              ))
            )}
          </div>
        );

      case 'checkbox':
        // Checkbox Question (Multiple Choice Options)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            {options.length === 0 ? (
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={Boolean(value)}
                  onChange={handleInputChange}
                />
                <span>{fieldLabel || 'Yes'}</span>
              </label>
            ) : (
              options.map((opt, i) => {
                const isChecked = Array.isArray(value) ? value.includes(opt) : value === opt;
                return (
                  <label key={i} className="form-checkbox-label" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxOptionToggle(opt)}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        );

      case 'radio':
        // Radio Button (Single Choice)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            {options.map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`${parentKey ? parentKey + '_' : ''}${fieldKey}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(fieldKey, opt)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
      case 'select':
        return (
          <select className="form-select" value={value ?? ''} onChange={handleInputChange}>
            <option value="">-- Select {fieldLabel || 'Option'} --</option>
            {options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`${parentKey ? parentKey + '_' : ''}${fieldKey}`}
                value="Yes"
                checked={value === 'Yes' || value === true || value === 'true'}
                onChange={() => onChange(fieldKey, 'Yes')}
              />
              <span style={{ fontSize: '0.875rem' }}>Yes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`${parentKey ? parentKey + '_' : ''}${fieldKey}`}
                value="No"
                checked={value === 'No' || value === false || value === 'false'}
                onChange={() => onChange(fieldKey, 'No')}
              />
              <span style={{ fontSize: '0.875rem' }}>No</span>
            </label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            className="form-input"
            placeholder={`Enter ${fieldLabel || ''}`}
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className="form-input"
            placeholder="e.g. name@example.com"
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            className="form-input"
            placeholder="e.g. +971 50 123 4567"
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="form-input"
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="form-textarea"
            rows="3"
            placeholder={`Enter ${fieldLabel || ''}`}
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            className="form-input"
            placeholder="https://example.com"
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );

      case 'alphanumeric':
        return (
          <div>
            <input
              type="text"
              className="form-input"
              style={{ fontFamily: 'monospace', textTransform: 'none' }}
              placeholder={fieldLabel ? `Enter ${fieldLabel} (e.g. KTPD/2026/001)` : 'e.g. KTPD/2026/001, KT-001, AB12345'}
              value={value ?? ''}
              onChange={handleInputChange}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Accepts A–Z, a–z, 0–9, hyphens (-), forward slashes (/), and underscores (_)
            </span>
          </div>
        );

      default:
        // text
        return (
          <input
            type="text"
            className="form-input"
            placeholder={`Enter ${fieldLabel || ''}`}
            value={value ?? ''}
            onChange={handleInputChange}
          />
        );
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: fieldType === 'group' ? '1.25rem' : '1rem' }}>
      <label className="form-label" style={{ fontWeight: fieldType === 'group' ? 600 : 500 }}>
        {fieldLabel || (fieldType === 'group' ? 'Custom Details' : fieldKey)}
      </label>
      {renderControl()}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default DynamicFieldInput;

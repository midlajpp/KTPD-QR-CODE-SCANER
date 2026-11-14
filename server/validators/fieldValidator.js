import MemberField from '../models/MemberField.js';

/**
 * Validates a single field value against its definition
 */
const validateFieldValue = (fieldDef, rawVal) => {
  const errors = [];
  let cleaned = undefined;

  const isPresent = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

  if (!isPresent) {
    if (rawVal !== undefined) {
      cleaned = fieldDef.fieldType === 'checkbox' ? [] : (fieldDef.fieldType === 'group' ? {} : '');
    }
    return { errors, cleaned };
  }

  const valStr = String(rawVal).trim();
  const label = fieldDef.fieldLabel || fieldDef.fieldKey;
  const key = fieldDef.fieldKey;

  switch (fieldDef.fieldType) {
    case 'alphanumeric':
      if (!/^[a-zA-Z0-9\-_/]+$/.test(valStr)) {
        errors.push({
          field: key,
          message: `${label} must contain only letters, numbers, hyphens (-), forward slashes (/), or underscores (_).`
        });
      } else {
        cleaned = valStr; // Preserve case, special characters (- / _), and leading zeros exactly as entered
      }
      break;

    case 'number':
      if (isNaN(Number(valStr))) {
        errors.push({
          field: key,
          message: `${label} must be a valid number.`
        });
      } else {
        cleaned = Number(valStr);
      }
      break;

    case 'email':
      if (!/^\S+@\S+\.\S+$/.test(valStr)) {
        errors.push({
          field: key,
          message: `${label} must be a valid email address.`
        });
      } else {
        cleaned = valStr.toLowerCase();
      }
      break;

    case 'phone': {
      // Must contain at least 5 digits, allowing names, annotations, and standard symbols (e.g. "Varun - 0559867721", "+971 50 1234567 (Brother)")
      const digitsCount = (valStr.match(/\d/g) || []).length;
      if (digitsCount < 5 || valStr.length > 100) {
        errors.push({
          field: key,
          message: `${label} must contain a valid phone number with at least 5 digits.`
        });
      } else {
        cleaned = valStr;
      }
      break;
    }

    case 'date':
      if (isNaN(Date.parse(valStr))) {
        errors.push({
          field: key,
          message: `${label} must be a valid date format (e.g. YYYY-MM-DD).`
        });
      } else {
        cleaned = valStr;
      }
      break;

    case 'dropdown':
    case 'select':
      if (fieldDef.options && fieldDef.options.length > 0) {
        const cleanOpts = fieldDef.options.map((o) => String(o).trim());
        if (!cleanOpts.includes(valStr)) {
          errors.push({
            field: key,
            message: `${label} must be one of: ${cleanOpts.join(', ')}.`
          });
        } else {
          cleaned = valStr;
        }
      } else {
        cleaned = valStr;
      }
      break;

    case 'radio':
      if (fieldDef.options && fieldDef.options.length > 0) {
        const cleanOpts = fieldDef.options.map((o) => String(o).trim());
        if (!cleanOpts.includes(valStr)) {
          errors.push({
            field: key,
            message: `${label} must be one of: ${cleanOpts.join(', ')}.`
          });
        } else {
          cleaned = valStr;
        }
      } else {
        cleaned = valStr;
      }
      break;

    case 'checkbox':
      if (Array.isArray(rawVal)) {
        const cleanArr = rawVal.map((v) => String(v).trim()).filter(Boolean);
        if (fieldDef.options && fieldDef.options.length > 0) {
          const cleanOpts = fieldDef.options.map((o) => String(o).trim());
          const invalidOpts = cleanArr.filter((opt) => !cleanOpts.includes(opt));
          if (invalidOpts.length > 0) {
            errors.push({
              field: key,
              message: `${label} contains invalid options: ${invalidOpts.join(', ')}.`
            });
          }
        }
        cleaned = cleanArr;
      } else if (typeof rawVal === 'string') {
        const split = rawVal.split(',').map((s) => s.trim()).filter(Boolean);
        cleaned = split;
      } else if (typeof rawVal === 'boolean') {
        cleaned = rawVal ? [fieldDef.fieldLabel || 'Yes'] : [];
      } else {
        cleaned = [];
      }
      break;

    case 'boolean':
      cleaned = valStr === 'true' || valStr === 'yes' || valStr === '1' || rawVal === true;
      break;

    case 'url':
      try {
        const testUrl = valStr.startsWith('http') ? valStr : `https://${valStr}`;
        new URL(testUrl);
        cleaned = valStr;
      } catch (_) {
        errors.push({
          field: key,
          message: `${label} must be a valid URL.`
        });
      }
      break;

    case 'group':
      cleaned = typeof rawVal === 'object' && rawVal !== null ? rawVal : {};
      break;

    default:
      cleaned = valStr;
  }

  return { errors, cleaned };
};

/**
 * Validates dynamic custom field values against active MemberField definitions,
 * supporting nested sub-fields and checkbox question arrays.
 */
export const validateCustomFieldValues = async (customFields = {}, isUpdate = false) => {
  const fields = await MemberField.find({ enabled: true, isArchived: false, isSystemField: false });
  const errors = [];
  const cleanedCustomFields = {};

  for (const field of fields) {
    const rawVal = customFields[field.fieldKey];

    // If field has children (Parent Group or nested sub-fields)
    if (field.children && field.children.length > 0) {
      const childObj = typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal) ? rawVal : {};
      const cleanedChildren = {};

      for (const child of field.children) {
        // Child value can be passed inside parent object or flat
        const rawChildVal = childObj[child.fieldKey] !== undefined ? childObj[child.fieldKey] : customFields[child.fieldKey];
        
        // Check conditional visibility if enabled
        if (child.conditional && child.conditional.enabled && child.conditional.dependsOn) {
          const depVal = childObj[child.conditional.dependsOn] !== undefined
            ? childObj[child.conditional.dependsOn]
            : (customFields[child.conditional.dependsOn] !== undefined ? customFields[child.conditional.dependsOn] : customFields[field.fieldKey]);
          
          const expected = String(child.conditional.value).trim().toLowerCase();
          const actual = String(depVal !== undefined && depVal !== null ? depVal : '').trim().toLowerCase();

          // If condition is not satisfied, skip validation and value
          if (child.conditional.operator === 'equals' && actual !== expected) {
            continue;
          }
          if (child.conditional.operator === 'not_equals' && actual === expected) {
            continue;
          }
        }

        const res = validateFieldValue(child, rawChildVal);
        if (res.errors.length > 0) {
          errors.push(...res.errors);
        }
        if (res.cleaned !== undefined) {
          cleanedChildren[child.fieldKey] = res.cleaned;
        }
      }

      cleanedCustomFields[field.fieldKey] = cleanedChildren;
      continue;
    }

    // Top-level single field validation
    const res = validateFieldValue(field, rawVal);
    if (res.errors.length > 0) {
      errors.push(...res.errors);
    }
    if (res.cleaned !== undefined) {
      cleanedCustomFields[field.fieldKey] = res.cleaned;
    }
  }

  // Preserve any remaining keys in customFields (e.g. flat sub-field keys or archived fields)
  for (const [k, v] of Object.entries(customFields)) {
    if (cleanedCustomFields[k] === undefined && v !== undefined) {
      cleanedCustomFields[k] = v;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanedCustomFields
  };
};

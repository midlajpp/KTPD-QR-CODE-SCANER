import Papa from 'papaparse';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import { validateCustomFieldValues } from '../validators/fieldValidator.js';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Returns a standardized CSV template dynamically generated from all enabled fields.
 */
export const getCsvTemplate = async () => {
  const fields = await MemberField.find({ enabled: true, isArchived: false }).sort({
    displayOrder: 1,
    createdAt: 1
  });

  const sampleRow1 = {};
  const sampleRow2 = {};

  fields.forEach((field) => {
    switch (field.fieldKey) {
      case 'name':
        sampleRow1[field.fieldKey] = 'Example Member 1';
        sampleRow2[field.fieldKey] = 'Example Member 2';
        break;
      case 'emiratesId':
        sampleRow1[field.fieldKey] = '784-1990-1234567-1';
        sampleRow2[field.fieldKey] = '784-1992-7654321-2';
        break;
      case 'mobileNo':
        sampleRow1[field.fieldKey] = '+971 50 000 0001';
        sampleRow2[field.fieldKey] = '+971 50 000 0002';
        break;
      case 'transportCompany':
        sampleRow1[field.fieldKey] = 'Transport Logistics LLC';
        sampleRow2[field.fieldKey] = 'Express Cargo Haulage';
        break;
      case 'emergencyContact':
        sampleRow1[field.fieldKey] = '+971 50 000 0003';
        sampleRow2[field.fieldKey] = '+91 98470 00001';
        break;
      case 'bloodGroup':
        sampleRow1[field.fieldKey] = 'B+';
        sampleRow2[field.fieldKey] = 'O+';
        break;
      case 'livingArea':
        sampleRow1[field.fieldKey] = 'Deira, Dubai';
        sampleRow2[field.fieldKey] = 'Sharjah, UAE';
        break;
      case 'uae':
        sampleRow1[field.fieldKey] = 'Dubai';
        sampleRow2[field.fieldKey] = 'Sharjah';
        break;
      case 'india':
        sampleRow1[field.fieldKey] = 'Kerala, India';
        sampleRow2[field.fieldKey] = 'Kerala, India';
        break;
      case 'addressInIndia':
        sampleRow1[field.fieldKey] = 'House No. 123, Town, Kerala 676101';
        sampleRow2[field.fieldKey] = 'House No. 456, Town, Kerala 673101';
        break;
      default:
        // Dynamic custom field samples
        if (field.fieldType === 'alphanumeric') {
          sampleRow1[field.fieldKey] = 'KTPD/2026/001';
          sampleRow2[field.fieldKey] = 'KT-001';
        } else if (field.fieldType === 'number') {
          sampleRow1[field.fieldKey] = '12345';
          sampleRow2[field.fieldKey] = '67890';
        } else if (field.fieldType === 'date') {
          sampleRow1[field.fieldKey] = '2028-12-31';
          sampleRow2[field.fieldKey] = '2027-06-15';
        } else if (field.fieldType === 'select' || field.fieldType === 'dropdown' || field.fieldType === 'radio') {
          sampleRow1[field.fieldKey] = (field.options && field.options[0]) || '';
          sampleRow2[field.fieldKey] = (field.options && field.options[1]) || (field.options && field.options[0]) || '';
        } else if (field.fieldType === 'checkbox') {
          sampleRow1[field.fieldKey] = field.options && field.options.length > 0 ? field.options.slice(0, 2).join(', ') : 'Option 1';
          sampleRow2[field.fieldKey] = field.options && field.options.length > 0 ? field.options[0] : 'Option 1';
        } else if (field.fieldType === 'boolean') {
          sampleRow1[field.fieldKey] = 'Yes';
          sampleRow2[field.fieldKey] = 'No';
        } else if (field.fieldType === 'email') {
          sampleRow1[field.fieldKey] = 'rashid@example.com';
          sampleRow2[field.fieldKey] = 'kareem@example.com';
        } else {
          sampleRow1[field.fieldKey] = `Sample ${field.fieldLabel}`;
          sampleRow2[field.fieldKey] = `Sample ${field.fieldLabel} 2`;
        }
    }
  });

  sampleRow1['status'] = 'Active';
  sampleRow2['status'] = 'Active';

  return Papa.unparse([sampleRow1, sampleRow2]);
};

/**
 * Parses and strictly validates CSV rows before insertion, supporting dynamic custom fields.
 */
export const parseAndValidateCsv = async (csvContent) => {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV Parsing error: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;
  if (!rows || rows.length === 0) {
    return {
      isValid: false,
      message: 'The uploaded CSV file is empty.',
      totalRows: 0,
      validRows: [],
      invalidRows: []
    };
  }

  // Fetch active custom fields and system fields
  const activeFields = await MemberField.find({ enabled: true, isArchived: false }).lean();
  const customFieldDefs = activeFields.filter((f) => !f.isSystemField);

  // Map header variations to field keys
  const headerToKeyMap = new Map();
  activeFields.forEach((f) => {
    headerToKeyMap.set(f.fieldKey.toLowerCase(), f.fieldKey);
    headerToKeyMap.set(f.fieldLabel.toLowerCase(), f.fieldKey);
    headerToKeyMap.set(f.fieldLabel.replace(/\s+/g, '').toLowerCase(), f.fieldKey);
  });

  // Existing Emirates IDs and Member IDs for duplicate detection
  const existingMembers = await Member.find(
    { isDeleted: false },
    { emiratesId: 1, memberId: 1 }
  ).lean();

  const existingEmiratesSet = new Set(
    existingMembers.map((m) => (m.emiratesId || '').trim().toLowerCase())
  );
  const existingMemberIdSet = new Set(
    existingMembers.map((m) => (m.memberId || '').trim().toUpperCase())
  );

  const seenInFileEmirates = new Set();
  const seenInFileMemberIds = new Set();

  const validRows = [];
  const invalidRows = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;
    const errors = [];

    // Base standard fields
    const cleaned = {
      memberId: (row.memberId || row['KTPD ID No'] || row['Member ID'] || '').trim().toUpperCase(),
      name: (row.name || row['Name'] || row['Full Name'] || '').trim(),
      emiratesId: (row.emiratesId || row['Emirates ID'] || row['EmiratesId'] || '').trim(),
      mobileNo: (row.mobileNo || row['Mobile No'] || row['Mobile'] || '').trim(),
      transportCompany: (row.transportCompany || row['Transport Company'] || '').trim(),
      emergencyContact: (row.emergencyContact || row['Emergency Contact'] || '').trim(),
      uae: (row.uae || row['UAE'] || '').trim(),
      india: (row.india || row['India'] || '').trim(),
      addressInIndia: (row.addressInIndia || row['Address in India'] || '').trim(),
      livingArea: (row.livingArea || row['Living Area'] || '').trim(),
      bloodGroup: (row.bloodGroup || row['Blood Group'] || '').trim().toUpperCase(),
      status: (row.status || row['Status'] || 'Active').trim(),
      customFields: {}
    };

    // Blood group normalization
    if (cleaned.bloodGroup.includes('POS')) cleaned.bloodGroup = cleaned.bloodGroup.replace(/[\s\-_]?(POSITIVE|POS)/i, '+');
    if (cleaned.bloodGroup.includes('NEG')) cleaned.bloodGroup = cleaned.bloodGroup.replace(/[\s\-_]?(NEGATIVE|NEG)/i, '-');

    // Extract dynamic custom field values from row headers
    for (const [rawHeader, val] of Object.entries(row)) {
      const normalizedHeader = rawHeader.trim().toLowerCase();
      const matchedKey = headerToKeyMap.get(normalizedHeader);
      if (matchedKey && customFieldDefs.some((f) => f.fieldKey === matchedKey)) {
        cleaned.customFields[matchedKey] = val !== undefined ? String(val).trim() : '';
      }
    }

    // Required fields check
    if (!cleaned.name) errors.push('Name is required');
    if (!cleaned.emiratesId) errors.push('Emirates ID is required');
    if (!cleaned.mobileNo) errors.push('Mobile Number is required');
    if (!cleaned.transportCompany) errors.push('Transport Company is required');
    if (!cleaned.emergencyContact) errors.push('Emergency Contact is required');
    if (!cleaned.bloodGroup) {
      errors.push('Blood Group is required');
    } else if (!VALID_BLOOD_GROUPS.includes(cleaned.bloodGroup)) {
      errors.push(`Invalid Blood Group: "${cleaned.bloodGroup}". Must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`);
    }

    if (cleaned.status && !['Active', 'Inactive'].includes(cleaned.status)) {
      cleaned.status = 'Active';
    }

    // Duplicate Emirates ID checks
    const emiratesLower = cleaned.emiratesId.toLowerCase();
    if (cleaned.emiratesId) {
      if (seenInFileEmirates.has(emiratesLower)) {
        errors.push(`Duplicate Emirates ID in this file: "${cleaned.emiratesId}"`);
      } else {
        seenInFileEmirates.add(emiratesLower);
      }

      if (existingEmiratesSet.has(emiratesLower)) {
        errors.push(`Emirates ID already registered in database: "${cleaned.emiratesId}"`);
      }
    }

    // Optional memberId duplicate check
    if (cleaned.memberId) {
      if (seenInFileMemberIds.has(cleaned.memberId)) {
        errors.push(`Duplicate Member ID in this file: "${cleaned.memberId}"`);
      } else {
        seenInFileMemberIds.add(cleaned.memberId);
      }

      if (existingMemberIdSet.has(cleaned.memberId)) {
        errors.push(`Member ID already registered in database: "${cleaned.memberId}"`);
      }
    }

    // Validate dynamic custom fields
    const customValidation = await validateCustomFieldValues(cleaned.customFields, false);
    if (!customValidation.isValid) {
      errors.push(...customValidation.errors);
    } else {
      cleaned.customFields = customValidation.cleanedCustomFields;
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        data: cleaned,
        errors
      });
    } else {
      validRows.push({
        rowNumber,
        data: cleaned
      });
    }
  }

  return {
    isValid: invalidRows.length === 0,
    totalRows: rows.length,
    validRowsCount: validRows.length,
    invalidRowsCount: invalidRows.length,
    validRows,
    invalidRows
  };
};

/**
 * Standard dynamic CSV export including all enabled fields, custom fields, and sub-fields.
 * Uses human-readable field labels as CSV headers and UTF-8 encoding.
 * Internal QR tokens and private system data are excluded.
 */
export const exportMembersToCsv = async (members, options = {}) => {
  const includeQrImage = options.includeQrImage !== false;
  const fields = await MemberField.find({ enabled: true, isArchived: false, showInCsv: true }).sort({
    displayOrder: 1,
    createdAt: 1
  });

  const activeKeySet = new Set(fields.map((f) => f.fieldKey));
  const customFields = fields.filter((f) => !f.isSystemField);

  // Field key to friendly label map
  const fieldKeyToLabel = {};
  fields.forEach((f) => {
    fieldKeyToLabel[f.fieldKey] = f.fieldLabel || f.fieldKey;
  });

  const data = members.map((m) => {
    const row = {};

    // 1. Member ID (authoritative identifier)
    const custom = m.customFields || {};
    let displayId = null;

    if (m.memberId && String(m.memberId).trim()) {
      const trimmed = String(m.memberId).trim();
      const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
      const hasCustomOverride = candidateKeys.some(
        (k) => custom[k] && String(custom[k]).trim() && String(custom[k]).trim() !== trimmed
      );
      if (!hasCustomOverride || !/^KTPD-\d{4}$/i.test(trimmed)) {
        displayId = trimmed;
      }
    }

    if (!displayId) {
      const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
      for (const k of candidateKeys) {
        const val = custom[k];
        if (val && String(val).trim()) {
          displayId = String(val).trim();
          break;
        }
      }
      if (!displayId) {
        for (const [k, v] of Object.entries(custom)) {
          if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && String(v).trim()) {
            displayId = String(v).trim();
            break;
          }
        }
      }
    }
    if (!displayId) {
      displayId = m.memberId || custom.ktpdNo || 'No ID Assigned';
    }

    row['Member ID'] = displayId;

    // 2. Standard core fields if enabled or present on member
    if (activeKeySet.has('name') || m.name) {
      row[fieldKeyToLabel['name'] || 'Full Name'] = m.name || '';
    }
    if (activeKeySet.has('emiratesId') || m.emiratesId) {
      row[fieldKeyToLabel['emiratesId'] || 'Emirates ID'] = m.emiratesId || '';
    }
    if (activeKeySet.has('mobileNo') || m.mobileNo) {
      row[fieldKeyToLabel['mobileNo'] || 'Mobile No (UAE)'] = m.mobileNo || '';
    }
    if (activeKeySet.has('transportCompany') || m.transportCompany) {
      row[fieldKeyToLabel['transportCompany'] || 'Transport Company'] = m.transportCompany || '';
    }
    if (activeKeySet.has('emergencyContact') || m.emergencyContact) {
      row[fieldKeyToLabel['emergencyContact'] || 'Emergency Contact'] = m.emergencyContact || '';
    }
    if (activeKeySet.has('uae') || m.uae) {
      row[fieldKeyToLabel['uae'] || 'UAE Contact / City'] = m.uae || '';
    }
    if (activeKeySet.has('india') || m.india) {
      row[fieldKeyToLabel['india'] || 'India Hometown / District'] = m.india || '';
    }
    if (activeKeySet.has('addressInIndia') || m.addressInIndia) {
      row[fieldKeyToLabel['addressInIndia'] || 'Address in India'] = m.addressInIndia || '';
    }
    if (activeKeySet.has('livingArea') || m.livingArea) {
      row[fieldKeyToLabel['livingArea'] || 'Living Area (UAE)'] = m.livingArea || '';
    }
    if (activeKeySet.has('bloodGroup') || m.bloodGroup) {
      row[fieldKeyToLabel['bloodGroup'] || 'Blood Group'] = m.bloodGroup || '';
    }

    // 3. Status
    row['Status'] = m.status || 'Active';

    // 4. Dynamically append custom fields and sub-fields using their labels
    customFields.forEach((cf) => {
      const parentLabel = cf.fieldLabel || cf.fieldKey;

      if (cf.children && cf.children.length > 0) {
        // If parent field itself has a direct value (not an object)
        const directVal = m.customFields?.[cf.fieldKey];
        if (directVal !== undefined && directVal !== null && typeof directVal !== 'object') {
          row[parentLabel] = directVal;
        }

        // Sub-fields
        cf.children.forEach((child) => {
          if (child.enabled === false) return;
          const childLabel = child.fieldLabel || child.fieldKey;
          const childVal = m.customFields?.[cf.fieldKey]?.[child.fieldKey] ?? m.customFields?.[child.fieldKey] ?? '';

          if (Array.isArray(childVal)) {
            row[childLabel] = childVal.join(', ');
          } else if (typeof childVal === 'boolean') {
            row[childLabel] = childVal ? 'Yes' : 'No';
          } else {
            row[childLabel] = childVal;
          }
        });
      } else {
        const val = m.customFields?.[cf.fieldKey] ?? '';
        if (Array.isArray(val)) {
          // Checkbox question answers
          row[parentLabel] = val.join(', ');
        } else if (typeof val === 'boolean') {
          row[parentLabel] = val ? 'Yes' : 'No';
        } else if (typeof val === 'object' && val !== null) {
          row[parentLabel] = JSON.stringify(val);
        } else {
          row[parentLabel] = val;
        }
      }
    });

    // 5. Permanent QR Image filename/reference column (if requested)
    if (includeQrImage) {
      const safeImageName = String(displayId).replace(/[\\/:*?"<>|]/g, '_');
      row['qrImage'] = `${safeImageName}.png`;
    }

    return row;
  });

  const csvString = Papa.unparse(data, {
    quotes: true,
    header: true
  });

  // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheet applications open the file with correct character encoding
  return '\uFEFF' + csvString;
};

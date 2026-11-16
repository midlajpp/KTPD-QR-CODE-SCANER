import Papa from 'papaparse';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import Counter from '../models/Counter.js';
import AuditLog from '../models/AuditLog.js';
import { generateSecureToken } from '../utils/crypto.js';

/**
 * Creates an intentional 400 Bad Request error for import cancellations.
 */
const createCancellationError = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

/**
 * Normalizes a header or key for comparison by stripping punctuation and lowercasing.
 */
export const normalizeString = (str) => {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Strips common optional suffixes to compare root semantic meanings.
 * e.g. "transportcompanyname" -> "transportcompany", "transportcompany" -> "transportcompany"
 * e.g. "mobilenumber" -> "mobile", "mobileno" -> "mobile", "mobile" -> "mobile"
 * e.g. "passportnumber" -> "passport", "passportno" -> "passport", "passport" -> "passport"
 * e.g. "vehiclenumber" -> "vehicle", "vehicleno" -> "vehicle", "vehicle" -> "vehicle"
 */
export const getFieldSemanticRoot = (str) => {
  const clean = String(str || '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  const norm = normalizeString(clean);
  if (!norm || norm.length < 3) return norm;

  const root = norm.replace(/(name|names|number|no|num|details|info|address)$/, '');
  return root.length >= 3 ? root : norm;
};

/**
 * Checks if a CSV column header designates the primary KTPD Membership ID.
 * Excludes unrelated IDs such as Emirates ID, Passport, National ID, or Visa.
 */
export const isMemberIdHeader = (headerName) => {
  const norm = normalizeString(headerName);
  if (!norm) return false;

  // Exclude explicit unrelated document IDs and row numbers/serial counters
  if (
    norm.includes('emirates') ||
    norm.includes('passport') ||
    norm.includes('national') ||
    norm.includes('visa') ||
    norm.includes('license') ||
    norm.includes('licence') ||
    norm.includes('vehicle') ||
    norm.includes('truck') ||
    norm.includes('car') ||
    norm === 'slno' ||
    norm === 'sno' ||
    norm === 'sl' ||
    norm === 'srno' ||
    norm === 'serialno' ||
    norm === 'serialnumber' ||
    norm === 'row' ||
    norm === 'rownum' ||
    norm === 'index'
  ) {
    return false;
  }

  const directMatches = [
    'ktpdno',
    'ktpdid',
    'ktpdidno',
    'ktpdidnumber',
    'ktpdnumber',
    'ktpdcode',
    'ktpd',
    'membershipid',
    'membershipno',
    'membershipnumber',
    'membershipcode',
    'memberid',
    'memberno',
    'membernumber',
    'membercode',
    'idno',
    'idnumber',
    'cardno',
    'cardnumber',
    'cardid',
    'regno',
    'registrationno',
    'registerno',
    'regnumber'
  ];

  if (directMatches.includes(norm)) return true;

  if (
    (norm.startsWith('ktpd') || norm.startsWith('member') || norm.startsWith('membership')) &&
    (norm.includes('no') || norm.includes('id') || norm.includes('num') || norm.includes('code'))
  ) {
    return true;
  }

  // Exact 'id', 'member', or 'membership' if nothing else
  if (norm === 'id' || norm === 'member' || norm === 'membership') return true;

  return false;
};

/**
 * Generates a clean, alphanumeric/underscore fieldKey for MongoDB storage.
 */
export const sanitizeFieldKey = (rawHeader) => {
  let key = String(rawHeader || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!key || /^[0-9]/.test(key)) {
    key = `field_${key || Date.now()}`;
  }

  return key.slice(0, 50);
};

/**
 * Heuristic field type inference based on header keywords and sample values.
 * Strictly avoids inferring 'number' for identifiers, mobile numbers, or passport numbers.
 */
export const inferFieldType = (headerName, sampleValues = []) => {
  const norm = normalizeString(headerName);

  if (isMemberIdHeader(headerName)) {
    return 'alphanumeric';
  }

  // Phone / Contact
  if (
    norm.includes('phone') ||
    norm.includes('mobile') ||
    norm.includes('cell') ||
    norm.includes('tel') ||
    norm.includes('whatsapp') ||
    norm.includes('emergency')
  ) {
    return 'phone';
  }

  // Multi-line text / Textarea (Address, Notes, Remarks, Description)
  if (
    norm.includes('address') ||
    norm.includes('note') ||
    norm.includes('remark') ||
    norm.includes('details') ||
    norm.includes('description') ||
    norm.includes('comment')
  ) {
    return 'textarea';
  }

  // Email
  if (norm.includes('email') || norm.includes('mail')) {
    return 'email';
  }

  // Date
  if (
    norm.includes('date') ||
    norm.includes('dob') ||
    norm.includes('birth') ||
    norm.includes('joined') ||
    norm.includes('expiry') ||
    norm.includes('issued')
  ) {
    return 'date';
  }

  // Blood group
  if (norm.includes('blood') || norm === 'bg') {
    return 'dropdown';
  }

  // Alphanumeric identifier check
  if (
    norm.includes('emirates') ||
    norm.includes('eid') ||
    norm.includes('passport') ||
    norm.includes('license') ||
    norm.includes('licence') ||
    norm.includes('registration') ||
    norm.includes('badge') ||
    norm.includes('code') ||
    norm.includes('ktpd') ||
    norm.includes('number') ||
    norm.includes('num') ||
    norm === 'no' ||
    norm.endsWith('no') ||
    (norm.includes('id') && !norm.includes('india') && !norm.includes('middle') && !norm.includes('guid'))
  ) {
    return 'alphanumeric';
  }

  // Value-based heuristics
  const cleanSamples = sampleValues.filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
  if (cleanSamples.length > 0) {
    const allEmails = cleanSamples.every((v) => /^\S+@\S+\.\S+$/.test(String(v).trim()));
    if (allEmails) return 'email';

    const allDates = cleanSamples.every((v) => !isNaN(Date.parse(String(v).trim())));
    if (allDates && cleanSamples.some((v) => String(v).includes('-') || String(v).includes('/'))) {
      return 'date';
    }

    const hasAlphaNumeric = cleanSamples.some((v) => /[a-zA-Z]/.test(String(v)) && /[0-9]/.test(String(v)));
    if (hasAlphaNumeric) return 'alphanumeric';
  }

  return 'text';
};

/**
 * Calculates Levenshtein distance between two strings for typo tolerance / spelling mistakes.
 */
export const levenshteinDistance = (a, b) => {
  const s1 = String(a || '').toLowerCase();
  const s2 = String(b || '').toLowerCase();
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return track[s2.length][s1.length];
};

/**
 * Matches a CSV header against existing fields in MongoDB while strictly preserving
 * the CSV header's original name, spelling, casing, and spaces as the fieldLabel.
 * Reuses existing custom fields and handles equivalent name variations (e.g. Transport Company,
 * transport_company, transport-company, Transport Company Name).
 */
export const matchHeaderToExistingField = (headerName, allFields = []) => {
  const rawLabel = String(headerName || '').trim();
  const norm = normalizeString(rawLabel);
  const root = getFieldSemanticRoot(rawLabel);

  if (!norm) return null;

  // 1. Check if column represents primary Member ID
  if (isMemberIdHeader(rawLabel)) {
    const existingIdField = allFields.find(
      (f) =>
        f.fieldKey === 'memberId' ||
        f.fieldKey === 'ktpd_id_no' ||
        f.fieldKey === 'ktpdNo' ||
        f.fieldKey === 'ktpd_no' ||
        isMemberIdHeader(f.fieldLabel) ||
        isMemberIdHeader(f.fieldKey)
    );

    return {
      isExisting: Boolean(existingIdField),
      isMemberId: true,
      matchedFieldKey: existingIdField ? existingIdField.fieldKey : 'memberId',
      customFieldKey: existingIdField ? existingIdField.fieldKey : 'ktpd_id_no',
      fieldLabel: existingIdField?.fieldLabel || rawLabel, // PRESERVE EXACT CSV HEADER NAME
      fieldType: 'alphanumeric',
      isSystemField: true,
      options: []
    };
  }

  // 2. Direct exact match against existing field definitions (by fieldLabel or fieldKey)
  for (const field of allFields) {
    const fieldKeyNorm = normalizeString(field.fieldKey);
    const fieldLabelNorm = normalizeString(field.fieldLabel);

    if (
      field.fieldKey.toLowerCase() === rawLabel.toLowerCase() ||
      (field.fieldLabel && field.fieldLabel.trim().toLowerCase() === rawLabel.toLowerCase()) ||
      fieldKeyNorm === norm ||
      fieldLabelNorm === norm
    ) {
      return {
        isExisting: true,
        isMemberId: field.fieldKey === 'memberId',
        matchedFieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel || rawLabel, // PRESERVE EXACT CSV HEADER NAME
        fieldType: field.fieldType || 'text',
        isSystemField: Boolean(field.isSystemField),
        options: field.options || [],
        fieldDoc: field
      };
    }
  }

  // 3. Normalized semantic root match (handles "Transport Company" vs "Transport Company Name" or "transport_company_name")
  if (root && root.length >= 3) {
    for (const field of allFields) {
      const fieldKeyRoot = getFieldSemanticRoot(field.fieldKey);
      const fieldLabelRoot = getFieldSemanticRoot(field.fieldLabel);

      if (fieldLabelRoot === root || fieldKeyRoot === root) {
        return {
          isExisting: true,
          isMemberId: field.fieldKey === 'memberId',
          matchedFieldKey: field.fieldKey,
          fieldLabel: field.fieldLabel || rawLabel, // PRESERVE EXACT CSV HEADER NAME
          fieldType: field.fieldType || 'text',
          isSystemField: Boolean(field.isSystemField),
          options: field.options || [],
          fieldDoc: field
        };
      }
    }
  }

  // 4. Core system properties fallback
  const coreMappings = [
    {
      keys: [
        'name',
        'fullname',
        'membername',
        'drivername',
        'nameofthemember',
        'firstname',
        'lastname',
        'driver',
        'member',
        'personname',
        'applicantname',
        'employeename',
        'membersname',
        'driversname'
      ],
      target: 'name',
      type: 'text'
    },
    {
      keys: ['emiratesid', 'eid', 'emiratesidno', 'emiratescardno', 'emiratesidnumber', 'nationalid', 'eidno'],
      target: 'emiratesId',
      type: 'alphanumeric'
    },
    {
      keys: [
        'mobileno',
        'mobile',
        'phoneno',
        'phone',
        'cellphone',
        'mobilenumber',
        'phonenumber',
        'contactno',
        'contactnumber',
        'contact',
        'whatsapp',
        'tel'
      ],
      target: 'mobileNo',
      type: 'phone'
    },
    {
      keys: [
        'transportcompany',
        'transportcompanyname',
        'company',
        'companyname',
        'transport',
        'transporter',
        'employer',
        'organization',
        'firm'
      ],
      target: 'transportCompany',
      type: 'text'
    },
    {
      keys: ['bloodgroup', 'blood', 'bloodtype', 'bg', 'bloodgrp'],
      target: 'bloodGroup',
      type: 'dropdown',
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    {
      keys: ['status', 'membershipstatus', 'memberstatus', 'state'],
      target: 'status',
      type: 'text',
      options: ['Active', 'Inactive']
    },
    {
      keys: ['emergencycontact', 'emergencyphone', 'emergencyno', 'emergencynumber', 'emergency', 'sos'],
      target: 'emergencyContact',
      type: 'phone'
    },
    {
      keys: ['livingarea', 'livingareauae', 'area', 'city', 'location', 'residence', 'uaeaddress'],
      target: 'livingArea',
      type: 'text'
    },
    {
      keys: ['addressinindia', 'indiaaddress', 'homeaddress', 'permanentaddress', 'nativeaddress'],
      target: 'addressInIndia',
      type: 'textarea'
    }
  ];

  for (const cm of coreMappings) {
    if (cm.keys.includes(norm) || (root && cm.keys.some((k) => getFieldSemanticRoot(k) === root))) {
      // Find if this field exists in allFields
      const existing = allFields.find(
        (f) =>
          f.fieldKey === cm.target ||
          (cm.target === 'transportCompany' && (f.fieldKey === 'transport_company_name' || f.fieldKey === 'transportCompany'))
      );
      const finalKey = existing ? existing.fieldKey : cm.target;
      return {
        isExisting: Boolean(existing),
        isMemberId: false,
        matchedFieldKey: finalKey,
        fieldLabel: existing?.fieldLabel || rawLabel,
        fieldType: existing?.fieldType || cm.type,
        isSystemField: existing?.isSystemField !== undefined ? existing.isSystemField : true,
        options: cm.options || existing?.options || []
      };
    }
  }

  // 5. Fuzzy match against existing fields and core mappings for obvious spelling mistakes
  for (const field of allFields) {
    const fieldKeyNorm = normalizeString(field.fieldKey);
    const fieldLabelNorm = normalizeString(field.fieldLabel);
    if (
      (fieldKeyNorm.length >= 4 && levenshteinDistance(norm, fieldKeyNorm) <= 2) ||
      (fieldLabelNorm.length >= 4 && levenshteinDistance(norm, fieldLabelNorm) <= 2)
    ) {
      return {
        isExisting: true,
        isMemberId: field.fieldKey === 'memberId' || isMemberIdHeader(field.fieldKey),
        matchedFieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel || rawLabel,
        fieldType: field.fieldType || 'text',
        isSystemField: Boolean(field.isSystemField),
        options: field.options || [],
        isFuzzyMatch: true,
        fieldDoc: field
      };
    }
  }

  for (const cm of coreMappings) {
    for (const k of cm.keys) {
      if (k.length >= 4 && levenshteinDistance(norm, k) <= 2) {
        const existing = allFields.find(
          (f) =>
            f.fieldKey === cm.target ||
            (cm.target === 'transportCompany' && (f.fieldKey === 'transport_company_name' || f.fieldKey === 'transportCompany'))
        );
        const finalKey = existing ? existing.fieldKey : cm.target;
        return {
          isExisting: Boolean(existing),
          isMemberId: false,
          matchedFieldKey: finalKey,
          fieldLabel: existing?.fieldLabel || rawLabel,
          fieldType: existing?.fieldType || cm.type,
          isSystemField: existing?.isSystemField !== undefined ? existing.isSystemField : true,
          options: cm.options || existing?.options || [],
          isFuzzyMatch: true
        };
      }
    }
  }

  // No match: return null so caller treats this as a new dynamic custom field
  return null;
};

/**
 * Analyzes CSV content and returns structured preview with detected fields and mapping suggestions.
 */
export const analyzeCsvContent = async (csvContent) => {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV Parsing error: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data || [];
  if (rows.length === 0) {
    return {
      isValid: false,
      message: 'The uploaded CSV file is empty.',
      totalRows: 0,
      totalColumns: 0,
      columns: [],
      previewRows: [],
      duplicateRows: [],
      invalidRows: [],
      summary: { totalRows: 0, validRows: 0, duplicateCount: 0, invalidCount: 0, newFieldCount: 0, existingFieldCount: 0 }
    };
  }

  const rawHeaders = Object.keys(rows[0] || {}).map((h) => h.trim()).filter(Boolean);

  // Fetch all existing fields from MongoDB (both active and archived to prevent duplicate key index clashes)
  const allDbFields = await MemberField.find({}).lean();
  const allExistingKeys = new Set(allDbFields.map((f) => f.fieldKey));

  // Analyze each column in its original CSV sequence
  const columnAnalyses = [];
  const allocatedNewKeys = new Set();

  for (const header of rawHeaders) {
    const sampleValues = rows.slice(0, 20).map((r) => r[header]);
    const matched = matchHeaderToExistingField(header, allDbFields);

    if (matched) {
      columnAnalyses.push({
        header,
        isExisting: Boolean(matched.isExisting),
        isMemberId: Boolean(matched.isMemberId),
        fieldKey: matched.matchedFieldKey,
        customFieldKey: matched.customFieldKey || matched.matchedFieldKey,
        fieldLabel: header.trim(), // PRESERVES EXACT CSV HEADER
        fieldType: matched.fieldType,
        isSystemField: matched.isSystemField,
        suggestedType: matched.fieldType,
        options: matched.options,
        included: true
      });
    } else {
      // Propose unique stable key for new dynamic custom field
      let baseKey = sanitizeFieldKey(header);
      let uniqueKey = baseKey;
      let counter = 1;
      while (allExistingKeys.has(uniqueKey) || allocatedNewKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}_${counter++}`;
      }
      allocatedNewKeys.add(uniqueKey);

      const inferredType = inferFieldType(header, sampleValues);

      columnAnalyses.push({
        header,
        isExisting: false,
        isMemberId: isMemberIdHeader(header),
        fieldKey: uniqueKey,
        customFieldKey: uniqueKey,
        fieldLabel: header.trim(), // PRESERVES EXACT CSV HEADER
        fieldType: inferredType,
        isSystemField: false,
        suggestedType: inferredType,
        options: [],
        included: true
      });
    }
  }

  // Duplicate member checking in MongoDB (includes all records to prevent unique index clashes)
  const existingMembers = await Member.find(
    {},
    { memberId: 1, emiratesId: 1, isDeleted: 1, 'customFields.ktpdNo': 1, 'customFields.ktpd_id_no': 1 }
  ).lean();

  const existingMemberIdMap = new Map();
  const existingEmiratesMap = new Map();

  existingMembers.forEach((m) => {
    if (m.memberId) {
      existingMemberIdMap.set(String(m.memberId).trim().toLowerCase(), m);
    }
    if (m.customFields?.ktpdNo) {
      existingMemberIdMap.set(String(m.customFields.ktpdNo).trim().toLowerCase(), m);
    }
    if (m.customFields?.ktpd_id_no) {
      existingMemberIdMap.set(String(m.customFields.ktpd_id_no).trim().toLowerCase(), m);
    }
    if (m.emiratesId) {
      existingEmiratesMap.set(m.emiratesId.trim().toLowerCase(), m);
    }
  });

  const duplicateRows = [];
  const invalidRows = [];
  const validRows = [];
  const intraFileDuplicates = [];

  const seenInFileIds = new Map(); // lowerId -> { rowNum, rawId }
  const seenInFileEmirates = new Map(); // lowerEmirates -> { rowNum, rawVal }

  // Locate the Member ID column header
  const idCol = columnAnalyses.find((c) => c.isMemberId || c.fieldKey === 'memberId')?.header;
  const nameCol = columnAnalyses.find((c) => c.fieldKey === 'name')?.header;
  const emiratesCol = columnAnalyses.find((c) => c.fieldKey === 'emiratesId')?.header;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;
    const errors = [];

    const nameVal = (nameCol ? row[nameCol] : row['Name'] || row['name'] || '').trim();
    // Preserve string exactly as entered (do not uppercase!)
    const rawIdVal = (idCol ? row[idCol] : '').trim();
    const emiratesVal = (emiratesCol ? row[emiratesCol] : '').trim();

    if (!nameVal && !rawIdVal) {
      errors.push('Row has neither a Member Name nor a Member ID.');
    }

    let isDuplicate = false;
    let duplicateReason = '';

    if (rawIdVal) {
      const lowerId = rawIdVal.toLowerCase();
      if (seenInFileIds.has(lowerId)) {
        const prev = seenInFileIds.get(lowerId);
        errors.push(`Duplicate Membership ID "${rawIdVal}" found on row #${prev.rowNum} and row #${rowNum}. Each member in the CSV must have a unique ID.`);
        intraFileDuplicates.push({
          memberId: rawIdVal,
          firstRowNumber: prev.rowNum,
          currentRowNumber: rowNum,
          message: `Membership ID "${rawIdVal}" appears on row #${prev.rowNum} and row #${rowNum}.`
        });
      } else {
        seenInFileIds.set(lowerId, { rowNum, rawId: rawIdVal });
      }

      if (existingMemberIdMap.has(lowerId)) {
        isDuplicate = true;
        duplicateReason = `Membership ID "${rawIdVal}" already registered in database.`;
      }
    }

    if (emiratesVal) {
      const lowerE = emiratesVal.toLowerCase();
      if (seenInFileEmirates.has(lowerE)) {
        const prevE = seenInFileEmirates.get(lowerE);
        errors.push(`Duplicate Emirates ID "${emiratesVal}" appears on row #${prevE.rowNum} and row #${rowNum}.`);
      } else {
        seenInFileEmirates.set(lowerE, { rowNum, rawVal: emiratesVal });
      }

      if (existingEmiratesMap.has(lowerE)) {
        isDuplicate = true;
        duplicateReason = `Emirates ID "${emiratesVal}" already registered in database.`;
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        data: row,
        errors
      });
    } else {
      if (isDuplicate) {
        duplicateRows.push({
          rowNumber: rowNum,
          memberId: rawIdVal,
          name: nameVal || `Member ${rawIdVal}`,
          reason: duplicateReason,
          data: row
        });
      }
      validRows.push({
        rowNumber: rowNum,
        data: row,
        isDuplicate,
        duplicateReason
      });
    }
  }

  const newFieldCount = columnAnalyses.filter((c) => !c.isExisting).length;
  const existingFieldCount = columnAnalyses.filter((c) => c.isExisting).length;

  return {
    isValid: invalidRows.length === 0,
    totalRows: rows.length,
    totalColumns: rawHeaders.length,
    headers: rawHeaders,
    columns: columnAnalyses,
    newFieldsToCreate: columnAnalyses.filter((c) => !c.isExisting),
    existingFieldsMatched: columnAnalyses.filter((c) => c.isExisting),
    availableFields: [
      {
        fieldKey: 'memberId',
        fieldLabel: 'KTPD Membership ID (Official Member ID)',
        fieldType: 'alphanumeric',
        isSystemField: true
      },
      ...allDbFields
        .filter((f) => !f.isArchived && f.fieldKey !== 'memberId')
        .map((f) => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          isSystemField: f.isSystemField
        }))
    ],
    previewRows: rows.slice(0, 15),
    duplicateRows,
    intraFileDuplicates,
    invalidRows,
    summary: {
      totalRows: rows.length,
      validRowsCount: validRows.length,
      duplicateRowCount: duplicateRows.length,
      invalidRowsCount: invalidRows.length,
      newFieldCount,
      existingFieldCount
    }
  };
};

/**
 * Executes Smart CSV Import:
 * 1. Creates missing custom fields in MongoDB using exact CSV header names.
 * 2. Processes member records using the CSV ID as the official Member ID everywhere.
 * 3. Strictly preserves existing members' permanent qrTokens.
 * 4. Preserves strings exactly as entered (uppercase, lowercase, leading zeros, special characters).
 */
export const executeSmartImport = async ({
  csvContent,
  columnMappings = [],
  duplicateStrategy = 'skip', // 'skip' | 'update' | 'cancel'
  adminUsername = 'system',
  ipAddress = ''
}) => {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim()
  });

  const rows = parsed.data || [];
  if (rows.length === 0) {
    throw new Error('CSV file has no data rows to import.');
  }

  // 1. Fetch ALL existing fields from MongoDB (including archived ones to prevent index clashes)
  const newFieldsCreated = [];
  const allDbFields = await MemberField.find({});
  const dbFieldByKey = new Map();
  const dbFieldByLabel = new Map();
  const dbFieldByNorm = new Map();
  const dbFieldByRoot = new Map();

  allDbFields.forEach((f) => {
    dbFieldByKey.set(f.fieldKey, f);
    if (f.fieldLabel) {
      dbFieldByLabel.set(f.fieldLabel.trim().toLowerCase(), f);
      dbFieldByNorm.set(normalizeString(f.fieldLabel), f);
      const labelRoot = getFieldSemanticRoot(f.fieldLabel);
      if (labelRoot && labelRoot.length >= 3) {
        dbFieldByRoot.set(labelRoot, f);
      }
    }
    dbFieldByNorm.set(normalizeString(f.fieldKey), f);
    const keyRoot = getFieldSemanticRoot(f.fieldKey);
    if (keyRoot && keyRoot.length >= 3) {
      dbFieldByRoot.set(keyRoot, f);
    }
  });

  const validMappings = columnMappings.filter((m) => m.included !== false);

  // Mapping lookup map
  const headerMap = new Map();
  validMappings.forEach((m) => {
    headerMap.set(m.header, m);
  });

  // Pre-fetch all members for duplicate detection (including soft-deleted members)
  const existingMembers = await Member.find({});
  const memberByCustomId = new Map();
  const memberByEmirates = new Map();

  existingMembers.forEach((m) => {
    if (m.memberId) {
      memberByCustomId.set(String(m.memberId).trim().toLowerCase(), m);
    }
    if (m.customFields?.ktpdNo) {
      memberByCustomId.set(String(m.customFields.ktpdNo).trim().toLowerCase(), m);
    }
    if (m.customFields?.ktpd_id_no) {
      memberByCustomId.set(String(m.customFields.ktpd_id_no).trim().toLowerCase(), m);
    }
    if (m.emiratesId) {
      memberByEmirates.set(m.emiratesId.trim().toLowerCase(), m);
    }
  });

  // If duplicateStrategy === 'cancel', pre-scan the whole file BEFORE creating fields or applying changes
  if (duplicateStrategy === 'cancel') {
    const seenScanIds = new Map();
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2;

      let scanId = null;
      for (const [header, val] of Object.entries(row)) {
        const mapping = headerMap.get(header.trim());
        if (!mapping || mapping.included === false) continue;
        if (mapping.isMemberId || mapping.fieldKey === 'memberId' || isMemberIdHeader(mapping.header)) {
          const cleanVal = val !== undefined && val !== null ? String(val).trim() : '';
          if (cleanVal) scanId = cleanVal;
        }
      }

      if (scanId) {
        const lowerId = scanId.toLowerCase();
        // Check intra-file duplicate
        if (seenScanIds.has(lowerId)) {
          const firstRow = seenScanIds.get(lowerId);
          throw createCancellationError(
            `Import cancelled: Duplicate Membership ID "${scanId}" found on row #${firstRow} and row #${rowNum}. No changes were applied.`
          );
        }
        seenScanIds.set(lowerId, rowNum);

        // Check database duplicate
        if (memberByCustomId.has(lowerId)) {
          throw createCancellationError(
            `Import cancelled: Duplicate Membership ID "${scanId}" detected at row #${rowNum} (already exists in database). No changes were applied.`
          );
        }
        const dbDup = await Member.findOne({
          $or: [
            { memberId: scanId },
            { memberId: new RegExp(`^${scanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          ]
        });
        if (dbDup) {
          throw createCancellationError(
            `Import cancelled: Duplicate Membership ID "${scanId}" detected at row #${rowNum} (already exists in database). No changes were applied.`
          );
        }
      }
    }
  }

  for (let order = 0; order < validMappings.length; order++) {
    const mapping = validMappings[order];
    const displayOrder = (order + 1) * 10;

    // Handle Member ID column
    if (mapping.fieldKey === 'memberId' || isMemberIdHeader(mapping.header)) {
      let idField = await MemberField.findOne({
        $or: [{ fieldKey: 'memberId' }, { fieldKey: 'ktpd_id_no' }]
      });

      if (idField) {
        idField.displayOrder = displayOrder;
        if (idField.isArchived || !idField.enabled) {
          idField.isArchived = false;
          idField.enabled = true;
        }
        await idField.save();
      } else {
        idField = await MemberField.create({
          fieldKey: 'memberId',
          fieldLabel: mapping.fieldLabel || mapping.header || 'KTPD NO',
          fieldType: 'alphanumeric',
          isSystemField: true,
          isSystemLocked: false,
          enabled: true,
          showInForm: true,
          showInTable: true,
          showInCsv: true,
          showOnPublicProfile: true,
          options: [],
          displayOrder
        });
        newFieldsCreated.push({
          fieldKey: idField.fieldKey,
          fieldLabel: idField.fieldLabel,
          fieldType: idField.fieldType
        });
      }
      dbFieldByKey.set(idField.fieldKey, idField);
      continue;
    }

    // A. Check whether a matching field already exists in the database
    let existingField = dbFieldByKey.get(mapping.fieldKey);

    if (!existingField && mapping.fieldLabel) {
      existingField =
        dbFieldByLabel.get(mapping.fieldLabel.trim().toLowerCase()) ||
        dbFieldByNorm.get(normalizeString(mapping.fieldLabel));
    }

    if (!existingField && mapping.header) {
      existingField =
        dbFieldByLabel.get(mapping.header.trim().toLowerCase()) ||
        dbFieldByNorm.get(normalizeString(mapping.header));
    }

    if (!existingField) {
      const headerRoot = getFieldSemanticRoot(mapping.fieldLabel || mapping.header);
      if (headerRoot && headerRoot.length >= 3) {
        existingField = dbFieldByRoot.get(headerRoot);
      }
    }

    // Double check directly against MongoDB in case of concurrent updates
    if (!existingField && mapping.fieldKey) {
      existingField = await MemberField.findOne({ fieldKey: mapping.fieldKey });
    }

    // If an existing field definition is found:
    if (existingField) {
      // Re-enable and un-archive if it was archived
      if (existingField.isArchived || !existingField.enabled) {
        existingField.isArchived = false;
        existingField.enabled = true;
      }
      existingField.displayOrder = displayOrder;
      await existingField.save();

      // Reuse the existing field definition
      mapping.fieldKey = existingField.fieldKey;
      mapping.isExisting = true;
      mapping.fieldType = existingField.fieldType || mapping.fieldType || 'text';
      continue; // Strictly DO NOT attempt to create the field again!
    }

    // B. Create genuinely new custom field
    const standardKeys = [
      'name',
      'emiratesId',
      'mobileNo',
      'transportCompany',
      'emergencyContact',
      'bloodGroup',
      'livingArea',
      'uae',
      'india',
      'addressInIndia',
      'status'
    ];

    let finalKey = mapping.fieldKey;
    if (!finalKey || (!standardKeys.includes(finalKey) && (dbFieldByKey.has(finalKey) || (await MemberField.findOne({ fieldKey: finalKey }))))) {
      let baseKey = sanitizeFieldKey(mapping.fieldKey || mapping.fieldLabel || mapping.header);
      let candidateKey = baseKey;
      let counter = 1;

      // Ensure key is genuinely unique in MongoDB
      while (dbFieldByKey.has(candidateKey) || (await MemberField.findOne({ fieldKey: candidateKey }))) {
        const clash = dbFieldByKey.get(candidateKey) || (await MemberField.findOne({ fieldKey: candidateKey }));
        if (
          clash &&
          (normalizeString(clash.fieldLabel) === normalizeString(mapping.fieldLabel || mapping.header) ||
            normalizeString(clash.fieldKey) === normalizeString(mapping.fieldKey || mapping.header) ||
            getFieldSemanticRoot(clash.fieldLabel) === getFieldSemanticRoot(mapping.fieldLabel || mapping.header))
        ) {
          // Re-use matching clash field
          if (clash.isArchived || !clash.enabled) {
            clash.isArchived = false;
            clash.enabled = true;
            await clash.save();
          }
          mapping.fieldKey = clash.fieldKey;
          mapping.isExisting = true;
          mapping.fieldType = clash.fieldType;
          candidateKey = null;
          break;
        }

        // Truly different field: generate safe unique key
        candidateKey = `${baseKey}_${counter++}`;
      }

      if (!candidateKey) {
        continue;
      }

      finalKey = candidateKey;
    }

    mapping.fieldKey = finalKey;
    const isSystem = standardKeys.includes(finalKey);

    try {
      const createdField = await MemberField.create({
        fieldKey: finalKey,
        fieldLabel: mapping.fieldLabel || mapping.header, // PRESERVES EXACT CSV HEADER
        fieldType: mapping.fieldType || inferFieldType(mapping.header || finalKey),
        isSystemField: isSystem,
        isSystemLocked: false,
        enabled: true,
        showInForm: true,
        showInTable: true,
        showInCsv: true,
        showOnPublicProfile: true,
        options: mapping.options || (mapping.fieldType === 'dropdown' && /blood/i.test(finalKey) ? ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] : []),
        displayOrder
      });

      dbFieldByKey.set(createdField.fieldKey, createdField);
      dbFieldByLabel.set(createdField.fieldLabel.trim().toLowerCase(), createdField);
      dbFieldByNorm.set(normalizeString(createdField.fieldLabel), createdField);
      dbFieldByNorm.set(normalizeString(createdField.fieldKey), createdField);

      newFieldsCreated.push({
        fieldKey: createdField.fieldKey,
        fieldLabel: createdField.fieldLabel,
        fieldType: createdField.fieldType
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Concurrently created or existing in index: gracefully reuse
        const matched = await MemberField.findOne({ fieldKey: finalKey });
        if (matched) {
          mapping.fieldKey = matched.fieldKey;
          mapping.isExisting = true;
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }
  }

  // 2. Process Member Records
  const createdMembers = [];
  const updatedMembers = [];
  const skippedMembers = [];

  // Track members processed within this specific import batch for intra-file duplicate handling
  const processedInFileRun = new Map(); // lowerId -> { rowNum, doc }

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const standardFields = {};
    const customFields = {};
    let suppliedMemberId = null;

    for (const [header, val] of Object.entries(row)) {
      const mapping = headerMap.get(header.trim());
      if (!mapping || mapping.included === false) continue;

      // Preserve string value exactly as entered (no uppercase conversion!)
      const cleanVal = val !== undefined && val !== null ? String(val).trim() : '';

      // Check if this column represents the primary Member ID
      if (mapping.isMemberId || mapping.fieldKey === 'memberId' || isMemberIdHeader(mapping.header)) {
        if (cleanVal) {
          const isExplicitKtpdHeader = /ktpd|membership|member/i.test(mapping.header || mapping.fieldKey);
          if (!suppliedMemberId || isExplicitKtpdHeader) {
            suppliedMemberId = cleanVal;
            customFields.ktpdNo = cleanVal;
            customFields[mapping.fieldKey || 'ktpd_id_no'] = cleanVal;
            if (mapping.customFieldKey) {
              customFields[mapping.customFieldKey] = cleanVal;
            }
          }
        }
      } else if (
        [
          'name',
          'emiratesId',
          'mobileNo',
          'transportCompany',
          'emergencyContact',
          'uae',
          'india',
          'livingArea',
          'addressInIndia',
          'bloodGroup',
          'status'
        ].includes(mapping.fieldKey)
      ) {
        if (mapping.fieldKey === 'status') {
          const s = cleanVal.trim().toLowerCase();
          if (s === 'inactive' || s === 'disabled' || s === 'suspended' || s === 'expired') {
            standardFields.status = 'Inactive';
          } else {
            standardFields.status = 'Active';
          }
        } else if (mapping.fieldKey === 'bloodGroup') {
          let bg = cleanVal.toUpperCase();
          if (bg.includes('POS')) bg = bg.replace(/[\s\-_]?(POSITIVE|POS)/i, '+');
          if (bg.includes('NEG')) bg = bg.replace(/[\s\-_]?(NEGATIVE|NEG)/i, '-');
          bg = bg.replace(/\s+/g, '');
          standardFields.bloodGroup = bg;
        } else {
          standardFields[mapping.fieldKey] = cleanVal;
          if (mapping.fieldKey === 'transportCompany' && cleanVal) {
            customFields.transportCompany = cleanVal;
            customFields.transport_company_name = cleanVal;
          }
        }
      } else {
        // Dynamic custom field
        customFields[mapping.fieldKey] = cleanVal;

        // Check if custom field key is an ID key
        if (
          cleanVal &&
          (mapping.fieldKey === 'ktpd_id_no' ||
            mapping.fieldKey === 'ktpdNo' ||
            mapping.fieldKey === 'ktpd_no' ||
            isMemberIdHeader(mapping.header))
        ) {
          const isExplicitKtpdHeader = /ktpd|membership|member/i.test(mapping.header || mapping.fieldKey);
          if (!suppliedMemberId || isExplicitKtpdHeader) {
            suppliedMemberId = cleanVal;
            customFields.ktpdNo = cleanVal;
          }
        }

        // Transport company name helper
        if (
          cleanVal &&
          (mapping.fieldKey === 'transport_company_name' ||
            mapping.fieldKey === 'transportCompany' ||
            mapping.fieldKey.includes('transport') ||
            mapping.fieldKey.includes('company'))
        ) {
          standardFields.transportCompany = cleanVal;
          customFields.transportCompany = cleanVal;
          customFields.transport_company_name = cleanVal;
        }

        // Emergency contact helper
        if (
          cleanVal &&
          !standardFields.emergencyContact &&
          mapping.fieldKey.includes('emergency')
        ) {
          standardFields.emergencyContact = cleanVal;
        }
      }
    }

    let memberName = standardFields.name;
    if (!memberName) {
      for (const [k, v] of Object.entries(customFields)) {
        if (/name|driver|person/i.test(k) && v && String(v).trim()) {
          memberName = String(v).trim();
          standardFields.name = memberName;
          break;
        }
      }
    }
    if (!memberName && suppliedMemberId) {
      memberName = `Member ${suppliedMemberId}`;
      standardFields.name = memberName;
    }

    if (!memberName && !suppliedMemberId) {
      skippedMembers.push({ rowNumber: rowNum, reason: 'Row has neither a Member Name nor a Member ID.' });
      continue;
    }

    const lowerId = suppliedMemberId ? suppliedMemberId.trim().toLowerCase() : null;

    // A. Check intra-file duplicate in this same import run
    if (lowerId && processedInFileRun.has(lowerId)) {
      const prevRun = processedInFileRun.get(lowerId);
      if (duplicateStrategy === 'cancel') {
        throw createCancellationError(
          `Import cancelled: Duplicate Membership ID "${suppliedMemberId}" found on row #${prevRun.rowNum} and row #${rowNum}. No changes were applied.`
        );
      }
      if (duplicateStrategy === 'skip') {
        skippedMembers.push({
          rowNumber: rowNum,
          memberId: suppliedMemberId,
          name: memberName || `Member ${suppliedMemberId}`,
          reason: `Duplicate Membership ID in file (previously processed on row #${prevRun.rowNum}) skipped`
        });
        continue;
      }
      if (duplicateStrategy === 'update') {
        const targetDoc = prevRun.doc;
        Object.entries(standardFields).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            targetDoc[k] = v;
          }
        });
        targetDoc.customFields = {
          ...(targetDoc.customFields || {}),
          ...customFields
        };
        targetDoc.markModified('customFields');
        await targetDoc.save();

        updatedMembers.push({
          memberId: targetDoc.memberId,
          name: targetDoc.name
        });
        continue;
      }
    }

    // B. Check for existing member in database
    let existingDoc = null;
    if (lowerId && memberByCustomId.has(lowerId)) {
      existingDoc = memberByCustomId.get(lowerId);
    } else if (standardFields.emiratesId && memberByEmirates.has(standardFields.emiratesId.trim().toLowerCase())) {
      existingDoc = memberByEmirates.get(standardFields.emiratesId.trim().toLowerCase());
    }

    // Direct database fallback lookup (supporting soft-deleted members as well)
    if (!existingDoc && suppliedMemberId) {
      const cleanId = suppliedMemberId.trim();
      const safeRegex = new RegExp(`^${cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      existingDoc = await Member.findOne({
        $or: [
          { memberId: cleanId },
          { memberId: safeRegex },
          { 'customFields.ktpdNo': cleanId },
          { 'customFields.ktpdNo': safeRegex },
          { 'customFields.ktpd_no': cleanId },
          { 'customFields.ktpd_no': safeRegex },
          { 'customFields.ktpd_id_no': cleanId },
          { 'customFields.ktpd_id_no': safeRegex }
        ]
      });
    }

    if (existingDoc) {
      if (duplicateStrategy === 'cancel') {
        throw createCancellationError(
          `Import cancelled: Duplicate Membership ID "${suppliedMemberId || existingDoc.memberId}" detected at row #${rowNum}. No changes were applied.`
        );
      }

      if (duplicateStrategy === 'skip') {
        if (existingDoc.isDeleted) {
          existingDoc.isDeleted = false;
          existingDoc.deletedAt = null;
          await existingDoc.save();
        }
        skippedMembers.push({
          rowNumber: rowNum,
          memberId: suppliedMemberId || existingDoc.memberId,
          name: memberName || existingDoc.name,
          reason: 'Duplicate record skipped'
        });
        if (lowerId) {
          processedInFileRun.set(lowerId, { rowNum, doc: existingDoc });
        }
        continue;
      }

      if (duplicateStrategy === 'update') {
        // Update member fields while strictly preserving permanent qrToken & _id
        Object.entries(standardFields).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            existingDoc[k] = v;
          }
        });

        if (suppliedMemberId) {
          existingDoc.memberId = suppliedMemberId;
          customFields.ktpdNo = suppliedMemberId;
          customFields.ktpd_id_no = suppliedMemberId;
        }

        // Restore soft-deleted member if updating
        if (existingDoc.isDeleted) {
          existingDoc.isDeleted = false;
          existingDoc.deletedAt = null;
        }

        // Merge custom fields (preserves existing custom fields)
        existingDoc.customFields = {
          ...(existingDoc.customFields || {}),
          ...customFields
        };

        existingDoc.markModified('customFields');
        await existingDoc.save();

        if (lowerId) {
          processedInFileRun.set(lowerId, { rowNum, doc: existingDoc });
        }

        updatedMembers.push({
          memberId: existingDoc.memberId,
          name: existingDoc.name
        });
        continue;
      }
    }

    // New member registration: Use supplied CSV ID directly as authoritative Member ID!
    let finalMemberId = suppliedMemberId;
    if (!finalMemberId) {
      const seq = await Counter.getNextSequence('memberId');
      finalMemberId = Counter.formatMemberId(seq);
    }

    // Generate permanent QR token
    const qrToken = generateSecureToken();

    const newMember = new Member({
      memberId: finalMemberId,
      qrToken,
      name: memberName || `Member ${finalMemberId}`,
      emiratesId: standardFields.emiratesId || '',
      mobileNo: standardFields.mobileNo || '',
      transportCompany: standardFields.transportCompany || '',
      emergencyContact: standardFields.emergencyContact || '',
      uae: standardFields.uae || '',
      india: standardFields.india || '',
      livingArea: standardFields.livingArea || '',
      addressInIndia: standardFields.addressInIndia || '',
      bloodGroup: standardFields.bloodGroup || '',
      status: standardFields.status || 'Active',
      isDeleted: false,
      deletedAt: null,
      customFields: {
        ...customFields,
        ktpdNo: finalMemberId,
        ktpd_id_no: finalMemberId
      }
    });

    try {
      await newMember.save();

      // Update in-memory lookup sets
      memberByCustomId.set(finalMemberId.toLowerCase(), newMember);
      if (newMember.emiratesId) {
        memberByEmirates.set(newMember.emiratesId.toLowerCase(), newMember);
      }
      if (lowerId) {
        processedInFileRun.set(lowerId, { rowNum, doc: newMember });
      }

      createdMembers.push({
        memberId: newMember.memberId,
        name: newMember.name
      });
    } catch (saveErr) {
      // Handle MongoDB duplicate key error code 11000 gracefully (e.g. concurrent imports or index uniqueness)
      if (saveErr.code === 11000) {
        const clashDoc = await Member.findOne({
          $or: [
            { memberId: finalMemberId },
            { memberId: new RegExp(`^${finalMemberId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          ]
        });

        if (duplicateStrategy === 'skip') {
          skippedMembers.push({
            rowNumber: rowNum,
            memberId: finalMemberId,
            name: memberName || clashDoc?.name || `Member ${finalMemberId}`,
            reason: 'Duplicate Membership ID skipped'
          });
          continue;
        } else if (duplicateStrategy === 'update') {
          if (clashDoc) {
            Object.entries(standardFields).forEach(([k, v]) => {
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                clashDoc[k] = v;
              }
            });
            if (clashDoc.isDeleted) {
              clashDoc.isDeleted = false;
              clashDoc.deletedAt = null;
            }
            clashDoc.customFields = {
              ...(clashDoc.customFields || {}),
              ...customFields
            };
            clashDoc.markModified('customFields');
            await clashDoc.save();

            updatedMembers.push({
              memberId: clashDoc.memberId,
              name: clashDoc.name
            });
            continue;
          }
        } else if (duplicateStrategy === 'cancel') {
          throw createCancellationError(
            `Import cancelled: Duplicate Membership ID "${finalMemberId}" already exists.`
          );
        }
      }
      throw saveErr;
    }
  }

  // Audit Log
  await AuditLog.create({
    action: 'IMPORT_CSV',
    performedBy: adminUsername,
    details: {
      totalRows: rows.length,
      importedCount: createdMembers.length,
      updatedCount: updatedMembers.length,
      skippedCount: skippedMembers.length,
      fieldsCreatedCount: newFieldsCreated.length,
      newFieldsCreated: newFieldsCreated.map((f) => f.fieldKey)
    },
    ipAddress
  });

  return {
    success: true,
    message: `Import processed: ${createdMembers.length} created, ${updatedMembers.length} updated, ${skippedMembers.length} skipped.`,
    summary: {
      totalRows: rows.length,
      importedCount: createdMembers.length,
      updatedCount: updatedMembers.length,
      skippedCount: skippedMembers.length,
      fieldsCreatedCount: newFieldsCreated.length,
      newFieldsCreated
    },
    createdMembers: createdMembers.slice(0, 50),
    updatedMembers: updatedMembers.slice(0, 50),
    skippedMembers: skippedMembers.slice(0, 50)
  };
};

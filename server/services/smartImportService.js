import Papa from 'papaparse';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import Counter from '../models/Counter.js';
import AuditLog from '../models/AuditLog.js';
import { generateSecureToken } from '../utils/crypto.js';

/**
 * Normalizes a header or key for comparison by stripping punctuation and lowercasing.
 */
export const normalizeString = (str) => {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Checks if a CSV column header designates the primary KTPD Membership ID.
 * Excludes unrelated IDs such as Emirates ID, Passport, National ID, or Visa.
 */
export const isMemberIdHeader = (headerName) => {
  const norm = normalizeString(headerName);
  if (!norm) return false;

  // Exclude explicit unrelated document IDs
  if (
    norm.includes('emirates') ||
    norm.includes('passport') ||
    norm.includes('national') ||
    norm.includes('visa') ||
    norm.includes('license') ||
    norm.includes('licence') ||
    norm.includes('vehicle') ||
    norm.includes('truck') ||
    norm.includes('car')
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
    'memberid',
    'memberno',
    'membernumber',
    'idno',
    'idnumber'
  ];

  if (directMatches.includes(norm)) return true;

  if (norm.startsWith('ktpd') && (norm.includes('no') || norm.includes('id') || norm.includes('num'))) {
    return true;
  }

  // Exact 'id' if nothing else
  if (norm === 'id') return true;

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

  // Alphanumeric identifier check
  if (
    norm.includes('id') ||
    norm.includes('passport') ||
    norm.includes('license') ||
    norm.includes('licence') ||
    norm.includes('registration') ||
    norm.includes('badge') ||
    norm.includes('code') ||
    norm.includes('ktpd') ||
    norm.includes('number') ||
    norm.includes('no')
  ) {
    return 'alphanumeric';
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
  if (norm.includes('blood')) {
    return 'dropdown';
  }

  // Textarea / Address
  if (
    norm.includes('address') ||
    norm.includes('notes') ||
    norm.includes('remark') ||
    norm.includes('details') ||
    norm.includes('description')
  ) {
    return 'textarea';
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
 * Matches a CSV header against existing fields in MongoDB while strictly preserving
 * the CSV header's original name, spelling, casing, and spaces as the fieldLabel.
 */
export const matchHeaderToExistingField = (headerName, activeFields = []) => {
  const rawLabel = String(headerName || '').trim();
  const norm = normalizeString(rawLabel);

  // 1. Check if column represents primary Member ID
  if (isMemberIdHeader(rawLabel)) {
    // Find if a custom field exists in MongoDB for KTPD ID
    const existingIdField = activeFields.find(
      (f) =>
        f.fieldKey === 'memberId' ||
        f.fieldKey === 'ktpd_id_no' ||
        f.fieldKey === 'ktpdNo' ||
        f.fieldKey === 'ktpd_no' ||
        isMemberIdHeader(f.fieldLabel) ||
        isMemberIdHeader(f.fieldKey)
    );

    return {
      isExisting: true,
      isMemberId: true,
      matchedFieldKey: 'memberId',
      customFieldKey: existingIdField ? existingIdField.fieldKey : 'ktpd_id_no',
      fieldLabel: rawLabel, // PRESERVE EXACT CSV HEADER NAME
      fieldType: 'alphanumeric',
      isSystemField: true,
      options: []
    };
  }

  // 2. Direct match against active MemberField definitions in MongoDB (by label or key)
  for (const field of activeFields) {
    const fieldKeyNorm = normalizeString(field.fieldKey);
    const fieldLabelNorm = normalizeString(field.fieldLabel);

    if (fieldLabelNorm === norm || fieldKeyNorm === norm) {
      return {
        isExisting: true,
        isMemberId: field.fieldKey === 'memberId',
        matchedFieldKey: field.fieldKey,
        fieldLabel: rawLabel, // PRESERVE EXACT CSV HEADER NAME
        fieldType: field.fieldType,
        isSystemField: field.isSystemField || false,
        options: field.options || []
      };
    }
  }

  // 3. Match unambiguous core system properties
  if (['name', 'fullname', 'membername', 'drivername', 'nameofthemember'].includes(norm)) {
    return {
      isExisting: true,
      isMemberId: false,
      matchedFieldKey: 'name',
      fieldLabel: rawLabel,
      fieldType: 'text',
      isSystemField: true,
      options: []
    };
  }

  if (['emiratesid', 'eid', 'emiratesidno', 'emiratescardno'].includes(norm)) {
    return {
      isExisting: true,
      isMemberId: false,
      matchedFieldKey: 'emiratesId',
      fieldLabel: rawLabel,
      fieldType: 'text',
      isSystemField: true,
      options: []
    };
  }

  if (['mobileno', 'mobile', 'phoneno', 'phone', 'cellphone'].includes(norm)) {
    return {
      isExisting: true,
      isMemberId: false,
      matchedFieldKey: 'mobileNo',
      fieldLabel: rawLabel,
      fieldType: 'phone',
      isSystemField: true,
      options: []
    };
  }

  if (['bloodgroup', 'blood', 'bloodtype', 'bg'].includes(norm)) {
    return {
      isExisting: true,
      isMemberId: false,
      matchedFieldKey: 'bloodGroup',
      fieldLabel: rawLabel,
      fieldType: 'dropdown',
      isSystemField: true,
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    };
  }

  if (['status', 'membershipstatus'].includes(norm)) {
    return {
      isExisting: true,
      isMemberId: false,
      matchedFieldKey: 'status',
      fieldLabel: rawLabel,
      fieldType: 'text',
      isSystemField: true,
      options: ['Active', 'Inactive']
    };
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

  // Fetch all existing fields from MongoDB
  const activeFields = await MemberField.find({ isArchived: false }).lean();
  const existingKeySet = new Set(activeFields.map((f) => f.fieldKey));

  // Analyze each column in its original CSV sequence
  const columnAnalyses = [];
  const allocatedNewKeys = new Set();

  for (const header of rawHeaders) {
    const sampleValues = rows.slice(0, 20).map((r) => r[header]);
    const matched = matchHeaderToExistingField(header, activeFields);

    if (matched) {
      columnAnalyses.push({
        header,
        isExisting: true,
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
      while (existingKeySet.has(uniqueKey) || allocatedNewKeys.has(uniqueKey)) {
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

  // Duplicate member checking in MongoDB
  const existingMembers = await Member.find(
    { isDeleted: false },
    { memberId: 1, emiratesId: 1, 'customFields.ktpdNo': 1, 'customFields.ktpd_id_no': 1 }
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

  const seenInFileIds = new Set();
  const seenInFileEmirates = new Set();

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
        errors.push(`Duplicate ID "${rawIdVal}" appears multiple times in uploaded file.`);
      } else {
        seenInFileIds.add(lowerId);
      }

      if (existingMemberIdMap.has(lowerId)) {
        isDuplicate = true;
        duplicateReason = `Membership ID "${rawIdVal}" already registered in database.`;
      }
    }

    if (emiratesVal) {
      const lowerE = emiratesVal.toLowerCase();
      if (seenInFileEmirates.has(lowerE)) {
        errors.push(`Duplicate Emirates ID "${emiratesVal}" appears multiple times in uploaded file.`);
      } else {
        seenInFileEmirates.add(lowerE);
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
    previewRows: rows.slice(0, 15),
    duplicateRows,
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

  // 1. Create missing custom fields in MongoDB
  const newFieldsCreated = [];
  const activeFields = await MemberField.find({ isArchived: false });
  const existingKeys = new Set(activeFields.map((f) => f.fieldKey));
  const existingLabels = new Set(activeFields.map((f) => f.fieldLabel.trim().toLowerCase()));

  const validMappings = columnMappings.filter((m) => m.included !== false);

  for (let order = 0; order < validMappings.length; order++) {
    const mapping = validMappings[order];
    if (
      !mapping.isExisting &&
      !existingKeys.has(mapping.fieldKey) &&
      !existingLabels.has((mapping.fieldLabel || mapping.header).trim().toLowerCase()) &&
      mapping.fieldKey !== 'memberId'
    ) {
      const createdField = await MemberField.create({
        fieldKey: mapping.fieldKey,
        fieldLabel: mapping.fieldLabel || mapping.header, // PRESERVES EXACT CSV HEADER
        fieldType: mapping.fieldType || 'text',
        isSystemField: false,
        isSystemLocked: false,
        enabled: true,
        showInForm: true,
        showInTable: true,
        showInCsv: true,
        showOnPublicProfile: true,
        options: mapping.options || [],
        displayOrder: 200 + order
      });
      existingKeys.add(mapping.fieldKey);
      existingLabels.add(createdField.fieldLabel.trim().toLowerCase());
      newFieldsCreated.push({
        fieldKey: createdField.fieldKey,
        fieldLabel: createdField.fieldLabel,
        fieldType: createdField.fieldType
      });
    }
  }

  // 2. Process Member Records
  const createdMembers = [];
  const updatedMembers = [];
  const skippedMembers = [];

  // Mapping lookup map
  const headerMap = new Map();
  validMappings.forEach((m) => {
    headerMap.set(m.header, m);
  });

  // Pre-fetch all members for duplicate detection
  const existingMembers = await Member.find({ isDeleted: false });
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
          suppliedMemberId = cleanVal;
          customFields.ktpdNo = cleanVal;
          customFields[mapping.fieldKey || 'ktpd_id_no'] = cleanVal;
          if (mapping.customFieldKey) {
            customFields[mapping.customFieldKey] = cleanVal;
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
        if (mapping.fieldKey === 'bloodGroup') {
          let bg = cleanVal.toUpperCase();
          if (bg.includes('POS')) bg = bg.replace(/[\s\-_]?(POSITIVE|POS)/i, '+');
          if (bg.includes('NEG')) bg = bg.replace(/[\s\-_]?(NEGATIVE|NEG)/i, '-');
          bg = bg.replace(/\s+/g, '');
          standardFields.bloodGroup = bg;
        } else {
          standardFields[mapping.fieldKey] = cleanVal;
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
          suppliedMemberId = cleanVal;
          customFields.ktpdNo = cleanVal;
        }

        // Transport company name helper
        if (
          cleanVal &&
          !standardFields.transportCompany &&
          (mapping.fieldKey.includes('transport') || mapping.fieldKey.includes('company'))
        ) {
          standardFields.transportCompany = cleanVal;
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

    const memberName = standardFields.name || (suppliedMemberId ? `Member ${suppliedMemberId}` : '');
    if (!memberName && !suppliedMemberId) {
      skippedMembers.push({ rowNumber: rowNum, reason: 'Row has neither a Member Name nor a Member ID.' });
      continue;
    }

    // Check for existing member
    let existingDoc = null;
    if (suppliedMemberId && memberByCustomId.has(suppliedMemberId.toLowerCase())) {
      existingDoc = memberByCustomId.get(suppliedMemberId.toLowerCase());
    } else if (standardFields.emiratesId && memberByEmirates.has(standardFields.emiratesId.toLowerCase())) {
      existingDoc = memberByEmirates.get(standardFields.emiratesId.toLowerCase());
    }

    if (existingDoc) {
      if (duplicateStrategy === 'cancel') {
        throw new Error(
          `Import aborted: Duplicate member detected at row #${rowNum} (ID: ${suppliedMemberId || existingDoc.memberId}).`
        );
      }

      if (duplicateStrategy === 'skip') {
        skippedMembers.push({
          rowNumber: rowNum,
          memberId: suppliedMemberId || existingDoc.memberId,
          name: memberName || existingDoc.name,
          reason: 'Duplicate record skipped'
        });
        continue;
      }

      if (duplicateStrategy === 'update') {
        // Update member fields while strictly preserving permanent qrToken
        Object.entries(standardFields).forEach(([k, v]) => {
          if (v) existingDoc[k] = v;
        });

        if (suppliedMemberId) {
          existingDoc.memberId = suppliedMemberId;
          customFields.ktpdNo = suppliedMemberId;
        }

        existingDoc.customFields = {
          ...(existingDoc.customFields || {}),
          ...customFields
        };

        existingDoc.markModified('customFields');
        await existingDoc.save();

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
      customFields: {
        ...customFields,
        ktpdNo: finalMemberId,
        ktpd_id_no: finalMemberId
      }
    });

    await newMember.save();

    // Update in-memory lookup sets
    memberByCustomId.set(finalMemberId.toLowerCase(), newMember);
    if (newMember.emiratesId) {
      memberByEmirates.set(newMember.emiratesId.toLowerCase(), newMember);
    }

    createdMembers.push({
      memberId: newMember.memberId,
      name: newMember.name
    });
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

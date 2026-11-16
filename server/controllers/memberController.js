import Member from '../models/Member.js';
import Counter from '../models/Counter.js';
import AuditLog from '../models/AuditLog.js';
import MemberField from '../models/MemberField.js';
import { validateCustomFieldValues } from '../validators/fieldValidator.js';
import { generateSecureToken } from '../utils/crypto.js';
import { generateQrBuffer, getProfileUrl } from '../services/qrService.js';
import {
  parseAndValidateCsv,
  exportMembersToCsv,
  getCsvTemplate
} from '../services/csvService.js';
import {
  createQrZipStream,
  createCompleteExportZipStream
} from '../services/exportService.js';
import {
  createMembersPdfStream
} from '../services/pdfExportService.js';
import {
  createIllustratorZipStream
} from '../services/illustratorService.js';
import {
  analyzeCsvContent,
  executeSmartImport
} from '../services/smartImportService.js';

/**
 * Safely finds a member by MongoDB _id, memberId (e.g. D343, KTPD-0001),
 * or customFields.ktpdNo / ktpd_no.
 */
export const findMemberByIdOrCustom = async (id, includeDeleted = false) => {
  if (!id) return null;
  const strId = String(id).trim();
  const conditions = [];

  if (strId.match(/^[0-9a-fA-F]{24}$/)) {
    conditions.push({ _id: strId });
  }

  conditions.push({ memberId: strId });
  const safeRegex = new RegExp(`^${strId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  conditions.push({ memberId: safeRegex });
  conditions.push({ 'customFields.ktpdNo': strId });
  conditions.push({ 'customFields.ktpdNo': safeRegex });
  conditions.push({ 'customFields.ktpd_no': strId });
  conditions.push({ 'customFields.ktpd_no': safeRegex });
  conditions.push({ 'customFields.ktpd_id_no': strId });
  conditions.push({ 'customFields.ktpd_id_no': safeRegex });

  const query = { $or: conditions };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return await Member.findOne(query);
};

/**
 * @route   GET /api/members
 * @desc    Get paginated, searchable, filterable members
 * @access  Private (Admin)
 */
export const getMembers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      bloodGroup = '',
      transportCompany = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Status filter
    if (status && ['Active', 'Inactive'].includes(status)) {
      query.status = status;
    }

    // Blood Group filter
    if (bloodGroup) {
      query.bloodGroup = bloodGroup.trim().toUpperCase();
    }

    // Transport Company filter
    if (transportCompany) {
      query.transportCompany = new RegExp(`^${transportCompany.trim()}$`, 'i');
    }

    // Search by Name, Member ID, Mobile No, and any custom fields marked with showInSearch: true
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { memberId: searchRegex },
        { 'customFields.ktpdNo': searchRegex },
        { 'customFields.ktpd_no': searchRegex },
        { 'customFields.ktpd_id_no': searchRegex },
        { mobileNo: searchRegex },
        { transportCompany: searchRegex },
        { 'customFields.transport_company_name': searchRegex },
        { emiratesId: searchRegex }
      ];

      try {
        const searchableCustomFields = await MemberField.find({
          enabled: true,
          isArchived: false,
          showInSearch: true,
          isSystemField: false
        }).select('fieldKey');

        searchableCustomFields.forEach((f) => {
          query.$or.push({ [`customFields.${f.fieldKey}`]: searchRegex });
        });
      } catch (e) {
        // Fallback gracefully
      }
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    // Sort configuration
    const sortField = ['createdAt', 'memberId', 'name', 'status', 'transportCompany'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    const [members, total] = await Promise.all([
      Member.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Member.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: members,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/:id
 * @desc    Get single member details
 * @access  Private (Admin)
 */
export const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    const profileUrl = getProfileUrl(member.qrToken);

    res.json({
      success: true,
      data: {
        ...member.toObject(),
        profileUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/members
 * @desc    Create new member with safe sequential ID and permanent QR token
 * @access  Private (Admin)
 */
export const createMember = async (req, res, next) => {
  try {
    const {
      name,
      emiratesId,
      mobileNo,
      transportCompany,
      emergencyContact,
      uae,
      india,
      addressInIndia,
      livingArea,
      bloodGroup,
      status = 'Active',
      privacySettings
    } = req.body;

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    // Fetch active field definitions to dynamically determine which fields are currently required
    const activeFields = await MemberField.find({ enabled: true, isArchived: false });
    const activeRequiredKeys = new Set(
      activeFields.filter((f) => f.required).map((f) => f.fieldKey)
    );

    // Validate name (only required if active in fields or required by system)
    if (activeRequiredKeys.has('name') && (!name || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'name', message: 'Full name is required.' }]
      });
    }

    // Validate phone number format if provided (empty optional phone is allowed)
    if (mobileNo && mobileNo.trim() && !/^[\d\+\-\(\)\s]{5,30}$/.test(mobileNo.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'mobileNo', message: 'Invalid phone number format.' }]
      });
    }

    // Validate blood group if provided
    if (bloodGroup && bloodGroup.trim() && !bloodGroups.includes(bloodGroup.trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'bloodGroup', message: 'Invalid blood group. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-.' }]
      });
    }

    // Check duplicate Emirates ID if provided
    if (emiratesId && emiratesId.trim()) {
      const existingEmirates = await Member.findOne({
        emiratesId: emiratesId.trim(),
        isDeleted: false
      });

      if (existingEmirates) {
        return res.status(409).json({
          success: false,
          message: 'Validation failed',
          errors: [{
            field: 'emiratesId',
            message: `Member with Emirates ID "${emiratesId}" already exists (${existingEmirates.memberId} - ${existingEmirates.name}).`
          }]
        });
      }
    }

    // Validate custom fields if provided
    let cleanedCustom = {};
    if (req.body.customFields) {
      const customValidation = await validateCustomFieldValues(req.body.customFields, false);
      if (!customValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed: Custom field validation failed.',
          errors: customValidation.errors
        });
      }
      cleanedCustom = customValidation.cleanedCustomFields;
    }

    // Determine authoritative KTPD Member ID
    let submittedKtpdNo = '';
    if (req.body.ktpdNo !== undefined && String(req.body.ktpdNo).trim()) {
      submittedKtpdNo = String(req.body.ktpdNo).trim();
    } else if (cleanedCustom.ktpdNo !== undefined && String(cleanedCustom.ktpdNo).trim()) {
      submittedKtpdNo = String(cleanedCustom.ktpdNo).trim();
    } else if (cleanedCustom.ktpd_no !== undefined && String(cleanedCustom.ktpd_no).trim()) {
      submittedKtpdNo = String(cleanedCustom.ktpd_no).trim();
    } else {
      for (const [k, v] of Object.entries(cleanedCustom)) {
        if (/^ktpd.*(no|id)/i.test(k) && v && String(v).trim()) {
          submittedKtpdNo = String(v).trim();
          break;
        }
      }
    }

    let memberId;
    if (submittedKtpdNo) {
      // Check duplicate across non-deleted members
      const duplicate = await Member.findOne({
        isDeleted: false,
        $or: [
          { memberId: submittedKtpdNo },
          { 'customFields.ktpdNo': submittedKtpdNo },
          { 'customFields.ktpd_no': submittedKtpdNo }
        ]
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'ktpdNo',
              message: 'Member ID already in use. Please enter a unique ID.'
            },
            {
              field: 'memberId',
              message: 'Member ID already in use. Please enter a unique ID.'
            }
          ]
        });
      }

      memberId = submittedKtpdNo;
      cleanedCustom.ktpdNo = submittedKtpdNo;
    } else {
      // Safely generate next sequential Member ID (KTPD-0001, KTPD-0002, etc.) as internal fallback
      const seq = await Counter.getNextSequence('memberId');
      memberId = Counter.formatMemberId(seq);
    }

    // Generate cryptographically secure random token (PERMANENT)
    const qrToken = generateSecureToken();

    const assignedName = name && name.trim() ? name.trim() : `Member ${memberId}`;

    const newMember = new Member({
      memberId,
      qrToken,
      name: assignedName,
      emiratesId: (emiratesId || '').trim(),
      mobileNo: (mobileNo || '').trim(),
      transportCompany: (transportCompany || '').trim(),
      emergencyContact: (emergencyContact || '').trim(),
      uae: (uae || '').trim(),
      india: (india || '').trim(),
      addressInIndia: (addressInIndia || '').trim(),
      livingArea: (livingArea || '').trim(),
      bloodGroup: (bloodGroup || '').trim().toUpperCase(),
      status: ['Active', 'Inactive'].includes(status) ? status : 'Active',
      customFields: cleanedCustom,
      privacySettings: {
        hideEmiratesId: privacySettings?.hideEmiratesId ?? true,
        hideAddressInIndia: privacySettings?.hideAddressInIndia ?? true,
        hideEmergencyContact: privacySettings?.hideEmergencyContact ?? false
      }
    });

    await newMember.save();

    // Record audit log
    await AuditLog.create({
      action: 'CREATE_MEMBER',
      performedBy: req.admin?.username || 'system',
      targetMemberId: memberId,
      details: { name: newMember.name, transportCompany: newMember.transportCompany },
      ipAddress: req.ip || ''
    });

    const profileUrl = getProfileUrl(newMember.qrToken);

    res.status(201).json({
      success: true,
      message: `Member ${memberId} created successfully.`,
      data: {
        ...newMember.toObject(),
        profileUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/members/:id
 * @desc    Update member details while strictly preserving memberId and permanent qrToken
 * @access  Private (Admin)
 */
export const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    // CRITICAL QR IMMUTABILITY: Never allow modifying or regenerating QR token or URL
    if (req.body) {
      delete req.body.qrToken;
      delete req.body.qrUrl;
      delete req.body.qrImage;
    }

    const {
      name,
      emiratesId,
      mobileNo,
      transportCompany,
      emergencyContact,
      uae,
      india,
      addressInIndia,
      livingArea,
      bloodGroup,
      status,
      privacySettings
    } = req.body;

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    // Check Emirates ID uniqueness if changed
    if (emiratesId && emiratesId.trim() !== member.emiratesId) {
      const duplicate = await Member.findOne({
        _id: { $ne: member._id },
        emiratesId: emiratesId.trim(),
        isDeleted: false
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Validation failed',
          errors: [{
            field: 'emiratesId',
            message: `Another member (${duplicate.memberId} - ${duplicate.name}) already has Emirates ID "${emiratesId}".`
          }]
        });
      }
      member.emiratesId = emiratesId.trim();
    }

    // Validate phone number format if provided
    if (mobileNo !== undefined && mobileNo.trim() && !/^[\d\+\-\(\)\s]{5,30}$/.test(mobileNo.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'mobileNo', message: 'Invalid phone number format.' }]
      });
    }

    // Validate blood group if provided
    if (bloodGroup !== undefined && bloodGroup.trim() && !bloodGroups.includes(bloodGroup.trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'bloodGroup', message: 'Invalid blood group. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-.' }]
      });
    }

    // Check if KTPD NO (Membership ID) is being updated
    let requestedKtpdNo = null;
    if (req.body.ktpdNo !== undefined) {
      requestedKtpdNo = String(req.body.ktpdNo).trim();
    } else if (req.body.customFields && req.body.customFields.ktpdNo !== undefined) {
      requestedKtpdNo = String(req.body.customFields.ktpdNo).trim();
    } else if (req.body.customFields && req.body.customFields.ktpd_no !== undefined) {
      requestedKtpdNo = String(req.body.customFields.ktpd_no).trim();
    } else if (req.body.customFields) {
      for (const [k, v] of Object.entries(req.body.customFields)) {
        if (/^ktpd.*(no|id)/i.test(k) && v !== undefined && v !== null) {
          requestedKtpdNo = String(v).trim();
          break;
        }
      }
    }

    if (requestedKtpdNo !== null && requestedKtpdNo !== '') {
      if (requestedKtpdNo !== member.memberId) {
        const duplicate = await Member.findOne({
          _id: { $ne: member._id },
          isDeleted: false,
          $or: [
            { memberId: requestedKtpdNo },
            { 'customFields.ktpdNo': requestedKtpdNo },
            { 'customFields.ktpd_no': requestedKtpdNo }
          ]
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Validation failed',
            errors: [
              {
                field: 'ktpdNo',
                message: 'Member ID already in use. Please enter a unique ID.'
              },
              {
                field: 'memberId',
                message: 'Member ID already in use. Please enter a unique ID.'
              }
            ]
          });
        }

        // Authoritative update: Member ID becomes the custom KTPD NO
        member.memberId = requestedKtpdNo;
        if (!member.customFields) member.customFields = {};
        member.customFields.ktpdNo = requestedKtpdNo;
        member.markModified('customFields');
      }
    }

    // Update editable fields
    if (name !== undefined) member.name = name.trim();
    if (mobileNo !== undefined) member.mobileNo = mobileNo.trim();
    if (transportCompany !== undefined) member.transportCompany = transportCompany.trim();
    if (emergencyContact !== undefined) member.emergencyContact = emergencyContact.trim();
    if (uae !== undefined) member.uae = uae.trim();
    if (india !== undefined) member.india = india.trim();
    if (addressInIndia !== undefined) member.addressInIndia = addressInIndia.trim();
    if (livingArea !== undefined) member.livingArea = livingArea.trim();
    if (bloodGroup !== undefined) member.bloodGroup = bloodGroup.trim().toUpperCase();
    if (status !== undefined && ['Active', 'Inactive'].includes(status)) {
      member.status = status;
    }

    if (privacySettings) {
      if (privacySettings.hideEmiratesId !== undefined) {
        member.privacySettings.hideEmiratesId = Boolean(privacySettings.hideEmiratesId);
      }
      if (privacySettings.hideAddressInIndia !== undefined) {
        member.privacySettings.hideAddressInIndia = Boolean(privacySettings.hideAddressInIndia);
      }
      if (privacySettings.hideEmergencyContact !== undefined) {
        member.privacySettings.hideEmergencyContact = Boolean(privacySettings.hideEmergencyContact);
      }
    }

    // Update dynamic custom fields if provided
    if (req.body.customFields !== undefined) {
      const customValidation = await validateCustomFieldValues(req.body.customFields, true);
      if (!customValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed: Custom field validation failed.',
          errors: customValidation.errors
        });
      }
      member.customFields = {
        ...(member.customFields || {}),
        ...customValidation.cleanedCustomFields
      };
      if (requestedKtpdNo) {
        member.customFields.ktpdNo = requestedKtpdNo;
      }
      member.markModified('customFields');
    }

    // NOTE: qrToken is permanent and NEVER modified!
    // Printed QR codes remain 100% valid and continue resolving seamlessly!

    await member.save();

    // Log update
    await AuditLog.create({
      action: 'UPDATE_MEMBER',
      performedBy: req.admin?.username || 'system',
      targetMemberId: member.memberId,
      details: { updatedFields: Object.keys(req.body).filter(k => k !== 'password') },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Member ${member.memberId} updated successfully. QR code remains permanently valid.`,
      data: {
        ...member.toObject(),
        profileUrl: getProfileUrl(member.qrToken)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/members/:id
 * @desc    Permanently delete member record from MongoDB
 * @access  Private (Admin)
 */
export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or already deleted.'
      });
    }

    const memberId = member.memberId;
    const memberName = member.name;

    // Permanently remove member document from MongoDB
    await Member.deleteOne({ _id: member._id });

    await AuditLog.create({
      action: 'DELETE_MEMBER',
      performedBy: req.admin?.username || 'system',
      targetMemberId: memberId,
      details: { name: memberName, permanentlyDeleted: true },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Member ${memberId} has been permanently deleted from the database.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/members/bulk-delete
 * @desc    Secure bulk permanent deletion of selected members
 * @access  Private (Superadmin, Admin only)
 */
export const bulkDeleteMembers = async (req, res, next) => {
  try {
    const rawIds = req.body?.ids || req.body?.memberIds;

    // Strict validation: must be a non-empty array
    if (!rawIds || !Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No member IDs provided for bulk deletion. Please select at least one member.'
      });
    }

    // Clean and filter IDs
    const cleanIds = Array.from(
      new Set(
        rawIds
          .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id).trim() : ''))
          .filter(Boolean)
      )
    );

    if (cleanIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid member IDs provided for bulk deletion.'
      });
    }

    // Safety guard against massive payloads
    if (cleanIds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1,000 members can be bulk-deleted in a single operation.'
      });
    }

    // Identify objectIds and string identifiers
    const objectIds = cleanIds.filter((id) => id.match(/^[0-9a-fA-F]{24}$/));
    const matchConditions = [
      { memberId: { $in: cleanIds } },
      { 'customFields.ktpdNo': { $in: cleanIds } },
      { 'customFields.ktpd_no': { $in: cleanIds } },
      { 'customFields.ktpd_id_no': { $in: cleanIds } }
    ];
    if (objectIds.length > 0) {
      matchConditions.push({ _id: { $in: objectIds } });
    }

    // Query active matching members
    const matchingMembers = await Member.find({
      isDeleted: false,
      $or: matchConditions
    }).select('_id memberId name customFields');

    if (matchingMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active member records found matching the selected IDs.',
        deletedCount: 0,
        failedCount: cleanIds.length,
        failedIds: cleanIds
      });
    }

    const targetDocIds = matchingMembers.map((m) => m._id);

    // Perform genuine atomic permanent deletion from MongoDB
    const deleteResult = await Member.deleteMany({ _id: { $in: targetDocIds } });

    // Identify which requested IDs were matched
    const matchedIdentifierSet = new Set();
    matchingMembers.forEach((m) => {
      matchedIdentifierSet.add(String(m._id));
      if (m.memberId) matchedIdentifierSet.add(m.memberId);
      if (m.customFields?.ktpdNo) matchedIdentifierSet.add(String(m.customFields.ktpdNo));
      if (m.customFields?.ktpd_no) matchedIdentifierSet.add(String(m.customFields.ktpd_no));
      if (m.customFields?.ktpd_id_no) matchedIdentifierSet.add(String(m.customFields.ktpd_id_no));
    });

    const failedIds = cleanIds.filter((id) => !matchedIdentifierSet.has(id));

    // Audit log
    await AuditLog.create({
      action: 'BULK_DELETE_MEMBERS',
      performedBy: req.admin?.username || 'system',
      details: {
        requestedCount: cleanIds.length,
        deletedCount: deleteResult.deletedCount || matchingMembers.length,
        failedCount: failedIds.length,
        deletedMemberIds: matchingMembers.map((m) => m.memberId),
        permanentlyDeleted: true
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Successfully permanently deleted ${matchingMembers.length} member record(s) from the database.`,
      deletedCount: matchingMembers.length,
      failedCount: failedIds.length,
      deletedMembers: matchingMembers.map((m) => ({
        _id: m._id,
        memberId: m.memberId,
        name: m.name
      })),
      failedIds
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/members/:id/status
 * @desc    Toggle member Active/Inactive status
 * @access  Private (Admin)
 */
export const toggleMemberStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    const newStatus = status && ['Active', 'Inactive'].includes(status)
      ? status
      : member.status === 'Active'
      ? 'Inactive'
      : 'Active';

    member.status = newStatus;
    await member.save();

    await AuditLog.create({
      action: 'TOGGLE_STATUS',
      performedBy: req.admin?.username || 'system',
      targetMemberId: member.memberId,
      details: { newStatus },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Member ${member.memberId} status set to ${newStatus}.`,
      data: {
        memberId: member.memberId,
        status: member.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/:id/qr
 * @desc    Download or stream individual high-res QR code PNG
 * @access  Private (Admin)
 */
export const getMemberQr = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { download } = req.query;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    const pngBuffer = await generateQrBuffer(member.qrToken, { width: 1024 });
    const safeFilename = `${member.memberId.replace(/[\/\\:*?"<>|]/g, '_')}.png`;

    res.setHeader('Content-Type', 'image/png');
    if (download === 'true' || download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    }

    return res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/:id/profile-url
 * @desc    Get the permanent public profile URL for a member
 * @access  Private (Admin)
 */
export const getMemberProfileUrl = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await findMemberByIdOrCustom(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    const profileUrl = getProfileUrl(member.qrToken);

    res.json({
      success: true,
      data: {
        memberId: member.memberId,
        qrToken: member.qrToken,
        profileUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/members/import/preview
 * @desc    Analyze uploaded CSV, detect headers, match existing vs new fields, infer types, and preview records
 * @access  Private (Admin)
 */
export const previewCsvImport = async (req, res, next) => {
  try {
    let csvContent = '';

    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csvData) {
      csvContent = req.body.csvData;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No CSV file or data provided.'
      });
    }

    const analysis = await analyzeCsvContent(csvContent);
    res.json({
      success: true,
      filename: req.file?.originalname || 'import.csv',
      ...analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/members/import
 * @desc    Upload and validate CSV, preview or execute bulk import with automatic field creation
 * @access  Private (Admin)
 */
export const importCsv = async (req, res, next) => {
  try {
    let csvContent = '';

    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csvData) {
      csvContent = req.body.csvData;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No CSV file or data provided.'
      });
    }

    // If dry run/preview requested
    if (req.query.dryRun === 'true' || req.query.preview === 'true') {
      const analysis = await analyzeCsvContent(csvContent);
      return res.json({
        success: true,
        preview: true,
        filename: req.file?.originalname || 'import.csv',
        ...analysis
      });
    }

    // Parse column mappings and duplicate strategy if provided
    let columnMappings = [];
    if (req.body && req.body.mappings) {
      try {
        columnMappings = typeof req.body.mappings === 'string'
          ? JSON.parse(req.body.mappings)
          : req.body.mappings;
      } catch (e) {
        console.warn('Failed to parse column mappings:', e.message);
      }
    }

    const duplicateStrategy = req.body?.duplicateStrategy || req.query?.duplicateStrategy || 'skip';

    // If no mappings provided, auto-detect columns
    if (!columnMappings || columnMappings.length === 0) {
      const analysis = await analyzeCsvContent(csvContent);
      columnMappings = analysis.columns;
    }

    const result = await executeSmartImport({
      csvContent,
      columnMappings,
      duplicateStrategy,
      adminUsername: req.admin?.username || 'admin',
      ipAddress: req.ip || ''
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const buildExportQuery = (req) => {
  const { status, ids, search } = req.query;
  const query = { isDeleted: { $ne: true } };

  if (status && ['Active', 'Inactive'].includes(status)) {
    query.status = status;
  }

  if (ids) {
    const rawArray = ids.split(',').map((id) => id.trim()).filter(Boolean);
    const upperArray = rawArray.map((id) => id.toUpperCase());
    const allIds = Array.from(new Set([...rawArray, ...upperArray]));
    const objectIds = allIds.filter((id) => id.match(/^[0-9a-fA-F]{24}$/));

    const conditions = [
      { memberId: { $in: allIds } },
      { 'customFields.ktpdNo': { $in: allIds } },
      { 'customFields.ktpd_no': { $in: allIds } },
      { 'customFields.ktpd_id_no': { $in: allIds } }
    ];
    if (objectIds.length > 0) {
      conditions.push({ _id: { $in: objectIds } });
    }
    query.$or = conditions;
  }

  if (search) {
    const s = search.trim();
    const searchConditions = [
      { name: { $regex: s, $options: 'i' } },
      { memberId: { $regex: s, $options: 'i' } },
      { 'customFields.ktpdNo': { $regex: s, $options: 'i' } },
      { 'customFields.ktpd_no': { $regex: s, $options: 'i' } },
      { mobileNo: { $regex: s, $options: 'i' } },
      { emiratesId: { $regex: s, $options: 'i' } },
      { transportCompany: { $regex: s, $options: 'i' } }
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  return query;
};

/**
 * @route   GET /api/members/export/pdf
 * @desc    Export members with high-res QR codes as an A4 PDF document
 * @access  Private (Admin)
 */
export const exportMembersPdf = async (req, res, next) => {
  try {
    const query = buildExportQuery(req);
    const members = await Member.find(query).sort({ memberId: 1 }).lean();

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No members match the export criteria.'
      });
    }

    await AuditLog.create({
      action: 'EXPORT_PDF',
      performedBy: req.admin?.username || 'system',
      details: { exportedCount: members.length },
      ipAddress: req.ip || ''
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="KTPD-Members-with-QR.pdf"');

    await createMembersPdfStream(members, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/export
 * @desc    Export members as dynamic CSV (Supports data-only mode without QR column)
 * @access  Private (Admin)
 */
export const exportMembers = async (req, res, next) => {
  try {
    const query = buildExportQuery(req);
    const members = await Member.find(query).sort({ memberId: 1 }).lean();

    const isDataOnly = req.query.dataOnly === 'true' || req.query.dataOnly === '1';
    const csvData = await exportMembersToCsv(members, { includeQrImage: !isDataOnly });

    await AuditLog.create({
      action: isDataOnly ? 'EXPORT_CSV_DATA_ONLY' : 'EXPORT_CSV',
      performedBy: req.admin?.username || 'system',
      details: { exportedCount: members.length, dataOnly: isDataOnly },
      ipAddress: req.ip || ''
    });

    const filename = isDataOnly ? 'KTPD-Members-Data.csv' : 'KTPD-Members.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/export/qr-zip
 * @desc    Export high-res permanent QR code PNG images for all selected members in a ZIP (Filename: KTPD-QR-Codes.zip)
 * @access  Private (Admin)
 */
export const exportQrZip = async (req, res, next) => {
  try {
    const query = buildExportQuery(req);
    const members = await Member.find(query).sort({ memberId: 1 }).lean();

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No members match the export criteria.'
      });
    }

    await AuditLog.create({
      action: 'EXPORT_QR',
      performedBy: req.admin?.username || 'system',
      details: { exportedCount: members.length },
      ipAddress: req.ip || ''
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="KTPD-QR-Codes.zip"');

    await createQrZipStream(members, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/export/all
 * @desc    Export combined ZIP package containing Members.csv, Member-Details/, and QR-Codes/ folder (Filename: KTPD-Members-and-QR.zip)
 * @access  Private (Admin)
 */
export const exportCompleteZip = async (req, res, next) => {
  try {
    const query = buildExportQuery(req);
    const members = await Member.find(query).sort({ memberId: 1 }).lean();

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No members match the export criteria.'
      });
    }

    await AuditLog.create({
      action: 'EXPORT_ALL',
      performedBy: req.admin?.username || 'system',
      details: { exportedCount: members.length },
      ipAddress: req.ip || ''
    });

    const filename = req.path.includes('members-qr-zip') ? 'KTPD-Members-and-QR.zip' : 'KTPD-Export.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await createCompleteExportZipStream(members, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/template
 * @desc    Download CSV import template
 * @access  Private (Admin)
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const templateCsv = await getCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ktpd_member_import_template.csv"');
    res.send(templateCsv);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/qr/export
 * @desc    Unified bulk export endpoint (supports qrOnly=true, format=all, format=qr)
 * @access  Private (Admin)
 */
export const exportIllustratorZip = async (req, res, next) => {
  try {
    const { status, ids, qrOnly, format } = req.query;

    if (qrOnly === 'true' || format === 'qr') {
      return exportQrZip(req, res, next);
    }

    if (format === 'all' || format === 'complete') {
      return exportCompleteZip(req, res, next);
    }

    const query = buildExportQuery(req);
    const members = await Member.find(query).sort({ memberId: 1 }).lean();

    if (!members || members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No members match the export criteria.'
      });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `ktpd_illustrator_package_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await AuditLog.create({
      action: 'EXPORT_ILLUSTRATOR',
      performedBy: req.admin?.username || 'system',
      details: { exportedCount: members.length },
      ipAddress: req.ip || ''
    });

    await createIllustratorZipStream(members, res);
  } catch (error) {
    next(error);
  }
};


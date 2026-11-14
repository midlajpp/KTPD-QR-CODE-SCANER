import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import ProfileDesign from '../models/ProfileDesign.js';

/**
 * Mask sensitive string leaving first and last few characters visible
 */
const maskEmiratesId = (emiratesId) => {
  if (!emiratesId || emiratesId.length < 5) return '***-****-*******-*';
  const parts = emiratesId.split('-');
  if (parts.length === 4) {
    return `${parts[0]}-****-*******-${parts[3]}`;
  }
  return `${emiratesId.slice(0, 3)}****${emiratesId.slice(-2)}`;
};

/**
 * Mask phone number leaving last 4 digits
 */
const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 6) return '****';
  return phone.replace(/\d(?=\d{4})/g, '*');
};

/**
 * Evaluate conditional visibility rule against member's custom field values
 */
const evaluateCondition = (conditional, memberCustomFields, parentObj) => {
  if (!conditional || !conditional.enabled || !conditional.dependsOn) {
    return true; // No condition, always visible
  }

  const depKey = conditional.dependsOn;
  const actualVal =
    parentObj?.[depKey] !== undefined
      ? parentObj[depKey]
      : (memberCustomFields?.[depKey] !== undefined ? memberCustomFields[depKey] : null);

  const actualStr = String(actualVal !== null && actualVal !== undefined ? actualVal : '').trim().toLowerCase();
  const expectedStr = String(conditional.value !== undefined ? conditional.value : 'Yes').trim().toLowerCase();

  if (conditional.operator === 'not_equals') {
    return actualStr !== expectedStr;
  }

  if (conditional.operator === 'includes') {
    if (Array.isArray(actualVal)) {
      return actualVal.map((v) => String(v).toLowerCase()).includes(expectedStr);
    }
    return actualStr.includes(expectedStr);
  }

  // Default: equals
  return actualStr === expectedStr;
};

/**
 * @route   GET /api/public/members/:token
 * @desc    Public member profile accessed by QR code scan (No auth required)
 * @access  Public
 */
export const getPublicMemberProfile = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing QR token.'
      });
    }

    const member = await Member.findOne({
      qrToken: token.trim(),
      isDeleted: false
    }).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        isFound: false,
        message: 'Invalid QR Code. No active member record found for this token.'
      });
    }

    // Check privacy settings
    const privacy = member.privacySettings || {
      hideEmiratesId: true,
      hideAddressInIndia: true,
      hideEmergencyContact: false
    };

    const memberCustom = member.customFields || {};

    // Fetch all enabled fields configured to appear on the public QR profile
    const activePublicFields = await MemberField.find({
      enabled: true,
      isArchived: false,
      showOnPublicProfile: true
    }).sort({ displayOrder: 1, createdAt: 1 });

    const activePublicKeys = new Set(activePublicFields.map((f) => f.fieldKey));
    const publicCustomFieldDefs = activePublicFields.filter((f) => !f.isSystemField);

    const formattedCustomFields = [];

    for (const field of publicCustomFieldDefs) {
      // Check top-level condition
      if (!evaluateCondition(field.conditional, memberCustom, memberCustom)) {
        continue;
      }

      const rawValue = memberCustom[field.fieldKey];
      const isParentGroup = (field.children && field.children.length > 0) || field.fieldType === 'group';

      if (isParentGroup) {
        const parentObj = typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue) ? rawValue : {};
        const formattedChildren = [];

        for (const child of field.children || []) {
          if (!child.enabled || !child.showOnPublicProfile) {
            continue;
          }

          // Evaluate sub-field conditional logic
          if (!evaluateCondition(child.conditional, memberCustom, parentObj)) {
            continue;
          }

          const rawChildVal = parentObj[child.fieldKey] !== undefined ? parentObj[child.fieldKey] : memberCustom[child.fieldKey];
          if (rawChildVal === undefined || rawChildVal === null || rawChildVal === '') {
            continue;
          }

          let childDisplay = String(rawChildVal);
          let selectedOpts = [];

          if (child.fieldType === 'checkbox') {
            selectedOpts = Array.isArray(rawChildVal) ? rawChildVal : (rawChildVal ? [rawChildVal] : []);
            childDisplay = selectedOpts.join(', ');
          } else if (child.fieldType === 'boolean') {
            childDisplay = rawChildVal === true || rawChildVal === 'true' || rawChildVal === 'yes' ? 'Yes' : 'No';
          }

          if (child.isSensitive && childDisplay) {
            if (child.fieldType === 'phone') {
              childDisplay = maskPhoneNumber(childDisplay);
            } else if (childDisplay.length > 4) {
              childDisplay = `${childDisplay.slice(0, 2)}****${childDisplay.slice(-2)}`;
            }
          }

          formattedChildren.push({
            fieldKey: child.fieldKey,
            fieldLabel: child.fieldLabel || child.fieldKey,
            fieldType: child.fieldType,
            value: childDisplay,
            selectedOptions: selectedOpts,
            isSensitive: Boolean(child.isSensitive)
          });
        }

        if (formattedChildren.length > 0) {
          formattedCustomFields.push({
            fieldKey: field.fieldKey,
            fieldLabel: field.fieldLabel || 'Custom Details',
            fieldType: field.fieldType,
            isGroup: true,
            children: formattedChildren
          });
        }
        continue;
      }

      // Standalone single field
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }

      let displayValue = String(rawValue);
      let selectedOptions = [];
      let isMasked = false;

      if (field.fieldType === 'checkbox') {
        selectedOptions = Array.isArray(rawValue) ? rawValue : (rawValue ? [rawValue] : []);
        displayValue = selectedOptions.join(', ');
        if (selectedOptions.length === 0) continue;
      } else if (field.fieldType === 'boolean') {
        displayValue = rawValue === true || rawValue === 'true' || rawValue === 'yes' ? 'Yes' : 'No';
      }

      if (field.isSensitive && displayValue) {
        if (field.fieldType === 'phone') {
          displayValue = maskPhoneNumber(displayValue);
          isMasked = true;
        } else if (displayValue.length > 4) {
          displayValue = `${displayValue.slice(0, 2)}****${displayValue.slice(-2)}`;
          isMasked = true;
        }
      }

      formattedCustomFields.push({
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel || field.fieldKey,
        fieldType: field.fieldType,
        value: displayValue,
        selectedOptions,
        isSensitive: field.isSensitive,
        isMasked
      });
    }

    // Resolve authoritative Membership ID
    const custom = member.customFields || {};
    let displayMemberId = null;

    if (member.memberId && !/^KTPD-\d{4}$/i.test(String(member.memberId).trim())) {
      displayMemberId = String(member.memberId).trim();
    } else {
      const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
      for (const k of candidateKeys) {
        const val = custom[k];
        if (val && String(val).trim() && !/^KTPD-\d{4}$/i.test(String(val).trim())) {
          displayMemberId = String(val).trim();
          break;
        }
      }
      if (!displayMemberId) {
        for (const [k, v] of Object.entries(custom)) {
          if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && !/^KTPD-\d{4}$/i.test(String(v).trim())) {
            displayMemberId = String(v).trim();
            break;
          }
        }
      }
    }
    if (!displayMemberId) {
      displayMemberId = member.memberId || custom.ktpdNo || 'No ID Assigned';
    }

    // Public allowlisted payload - strictly prevents exposing database internals
    const publicProfile = {
      memberId: displayMemberId,
      name: activePublicKeys.has('name') ? member.name : (member.name || `Member ${member.memberId}`),
      emiratesId: activePublicKeys.has('emiratesId') && member.emiratesId ? (privacy.hideEmiratesId ? maskEmiratesId(member.emiratesId) : member.emiratesId) : '',
      isEmiratesIdMasked: Boolean(privacy.hideEmiratesId),
      mobileNo: activePublicKeys.has('mobileNo') ? (member.mobileNo || '') : '',
      transportCompany: activePublicKeys.has('transportCompany') ? (member.transportCompany || '') : '',
      emergencyContact: activePublicKeys.has('emergencyContact') && member.emergencyContact ? (privacy.hideEmergencyContact ? maskPhoneNumber(member.emergencyContact) : member.emergencyContact) : '',
      isEmergencyContactMasked: Boolean(privacy.hideEmergencyContact),
      uae: activePublicKeys.has('uae') ? (member.uae || '') : '',
      india: activePublicKeys.has('india') ? (member.india || '') : '',
      addressInIndia: activePublicKeys.has('addressInIndia') ? (privacy.hideAddressInIndia ? '' : (member.addressInIndia || '')) : '',
      isAddressHidden: Boolean(privacy.hideAddressInIndia),
      livingArea: activePublicKeys.has('livingArea') ? (member.livingArea || '') : '',
      bloodGroup: activePublicKeys.has('bloodGroup') ? (member.bloodGroup || '') : '',
      status: member.status,
      customFields: formattedCustomFields,
      memberSince: member.createdAt,
      lastVerifiedAt: member.updatedAt
    };

    const isInactive = member.status === 'Inactive';
    const publishedDesign = await ProfileDesign.getEffectivePublished();

    res.json({
      success: true,
      isFound: true,
      isActive: !isInactive,
      organization: {
        name: publishedDesign.branding?.orgName || 'Kerala Transport Drivers Association (KTPD)',
        tagline: publishedDesign.branding?.subtitle || 'UAE Chapter - Official Digital Verification',
        verified: true
      },
      message: isInactive
        ? 'Notice: This membership record is currently marked as INACTIVE. Please contact KTPD Administration.'
        : 'Official Membership Verified',
      data: publicProfile,
      design: publishedDesign
    });
  } catch (error) {
    next(error);
  }
};

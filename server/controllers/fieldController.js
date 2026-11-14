import mongoose from 'mongoose';
import MemberField, { FIELD_TYPES } from '../models/MemberField.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';

// Safe query builder supporting ObjectId and fieldKey
const findFieldQuery = (id) => {
  if (!id) return { _id: null };
  const cleanId = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    return { $or: [{ _id: cleanId }, { fieldKey: cleanId }] };
  }
  return { fieldKey: cleanId };
};

// Helper to convert arbitrary label into lowerCamelCase fieldKey
const generateFieldKey = (label) => {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
};

const RESERVED_KEYS = [
  'memberid',
  'qrtoken',
  'status',
  'createdat',
  'updatedat',
  'isdeleted',
  'deletedat',
  'customfields',
  'privacysettings',
  'id',
  '_id'
];

/**
 * @route   GET /api/fields
 * @desc    Get all member field definitions
 * @access  Private (Admin)
 */
export const getFields = async (req, res, next) => {
  try {
    const { activeOnly, search, includeArchived } = req.query;
    const query = {};

    if (includeArchived !== 'true') {
      query.isArchived = { $ne: true };
    }

    if (activeOnly === 'true') {
      query.enabled = true;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ fieldLabel: searchRegex }, { fieldKey: searchRegex }];
    }

    const fields = await MemberField.find(query).sort({ displayOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      count: fields.length,
      data: fields
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/fields/:id
 * @desc    Get single field definition
 * @access  Private (Admin)
 */
export const getFieldById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const field = await MemberField.findOne(findFieldQuery(id));

    if (!field) {
      return res.status(404).json({
        success: false,
        message: `Member field not found with identifier "${id}".`
      });
    }

    res.json({
      success: true,
      data: field
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/fields
 * @desc    Create a new dynamic custom member field (Field Label is OPTIONAL!)
 * @access  Private (Admin)
 */
export const createField = async (req, res, next) => {
  try {
    const {
      fieldLabel = '',
      fieldKey: customKey,
      fieldType = 'text',
      required = false,
      enabled = true,
      isSensitive = false,
      showOnPublicProfile = true,
      showInCsv = true,
      showInSearch = false,
      options = [],
      conditional = {},
      children = [],
      displayOrder
    } = req.body;

    const trimmedLabel = fieldLabel ? fieldLabel.trim() : '';

    let rawKey = '';
    if (customKey && customKey.trim()) {
      rawKey = customKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
    } else if (trimmedLabel) {
      rawKey = generateFieldKey(trimmedLabel).replace(/[^a-zA-Z0-9_]/g, '');
    } else {
      rawKey = `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    if (!rawKey || rawKey.length < 2) {
      rawKey = `field_${Date.now()}`;
    }

    if (RESERVED_KEYS.includes(rawKey.toLowerCase())) {
      rawKey = `${rawKey}_custom_${Date.now()}`;
    }

    let finalKey = rawKey;
    const existing = await MemberField.findOne({ fieldKey: finalKey });
    if (existing) {
      finalKey = `${finalKey}_${Math.random().toString(36).substring(2, 6)}`;
    }

    let order = displayOrder;
    if (order === undefined || order === null) {
      const highestField = await MemberField.findOne().sort({ displayOrder: -1 });
      order = highestField ? (highestField.displayOrder || 0) + 10 : 10;
    }

    let cleanOptions = [];
    if (['select', 'dropdown', 'checkbox', 'radio'].includes(fieldType)) {
      cleanOptions = Array.isArray(options)
        ? options.map((opt) => String(opt).trim()).filter(Boolean)
        : [];
    }

    const newField = new MemberField({
      fieldKey: finalKey,
      fieldLabel: trimmedLabel || (fieldType === 'group' ? 'Untitled Group' : (fieldType === 'alphanumeric' ? 'Untitled ID No Field' : `Untitled ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`)),
      fieldType,
      required: Boolean(required),
      enabled: Boolean(enabled),
      isSystemField: false,
      isSensitive: Boolean(isSensitive),
      showOnPublicProfile: showOnPublicProfile !== undefined ? Boolean(showOnPublicProfile) : true,
      showInCsv: Boolean(showInCsv),
      showInSearch: Boolean(showInSearch),
      options: cleanOptions,
      conditional: {
        enabled: Boolean(conditional?.enabled),
        dependsOn: conditional?.dependsOn || null,
        operator: ['equals', 'not_equals', 'includes'].includes(conditional?.operator) ? conditional.operator : 'equals',
        value: conditional?.value !== undefined ? conditional.value : 'Yes'
      },
      children: Array.isArray(children)
        ? children.map((c, idx) => ({
            fieldKey: c.fieldKey || `sub_${Date.now()}_${idx}`,
            fieldLabel: c.fieldLabel || '',
            fieldType: FIELD_TYPES.includes(c.fieldType) ? c.fieldType : 'text',
            options: Array.isArray(c.options) ? c.options.map((o) => String(o).trim()).filter(Boolean) : [],
            conditional: {
              enabled: Boolean(c.conditional?.enabled),
              dependsOn: c.conditional?.dependsOn || null,
              operator: ['equals', 'not_equals', 'includes'].includes(c.conditional?.operator) ? c.conditional.operator : 'equals',
              value: c.conditional?.value !== undefined ? c.conditional.value : 'Yes'
            },
            showOnPublicProfile: c.showOnPublicProfile !== undefined ? Boolean(c.showOnPublicProfile) : true,
            displayOrder: c.displayOrder || (idx + 1) * 10,
            enabled: c.enabled !== undefined ? Boolean(c.enabled) : true
          }))
        : [],
      displayOrder: order,
      isArchived: false
    });

    await newField.save();

    await AuditLog.create({
      action: 'CREATE_MEMBER',
      performedBy: req.admin?.username || 'system',
      details: {
        actionType: 'CREATE_CUSTOM_FIELD',
        fieldKey: newField.fieldKey,
        fieldLabel: newField.fieldLabel,
        fieldType: newField.fieldType
      },
      ipAddress: req.ip || ''
    });

    res.status(201).json({
      success: true,
      message: `Custom field "${newField.fieldLabel}" (${newField.fieldKey}) created successfully.`,
      data: newField
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/fields/:id
 * @desc    Update an existing field (Label, options, children, visibility - fieldKey is preserved!)
 * @access  Private (Admin)
 */
export const updateField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const field = await MemberField.findOne(findFieldQuery(id));

    if (!field) {
      return res.status(404).json({
        success: false,
        message: `Field definition not found with identifier "${id}".`
      });
    }

    const {
      fieldLabel,
      fieldType,
      required,
      enabled,
      isSensitive,
      showOnPublicProfile,
      showInCsv,
      showInSearch,
      options,
      conditional,
      children,
      displayOrder
    } = req.body;

    if (fieldLabel !== undefined) field.fieldLabel = fieldLabel.trim();

    if (fieldType !== undefined && !field.isSystemField) {
      field.fieldType = fieldType;
    }

    if (required !== undefined) field.required = Boolean(required);
    if (enabled !== undefined) field.enabled = Boolean(enabled);
    if (isSensitive !== undefined) field.isSensitive = Boolean(isSensitive);
    if (showOnPublicProfile !== undefined) field.showOnPublicProfile = Boolean(showOnPublicProfile);
    if (showInCsv !== undefined) field.showInCsv = Boolean(showInCsv);
    if (showInSearch !== undefined) field.showInSearch = Boolean(showInSearch);
    if (displayOrder !== undefined) field.displayOrder = Number(displayOrder);

    if (options !== undefined) {
      field.options = Array.isArray(options)
        ? options.map((opt) => String(opt).trim()).filter(Boolean)
        : [];
    }

    if (conditional !== undefined) {
      field.conditional = {
        enabled: Boolean(conditional.enabled),
        dependsOn: conditional.dependsOn || null,
        operator: ['equals', 'not_equals', 'includes'].includes(conditional.operator) ? conditional.operator : 'equals',
        value: conditional.value !== undefined ? conditional.value : 'Yes'
      };
    }

    if (children !== undefined && Array.isArray(children)) {
      field.children = children.map((c, idx) => ({
        _id: c._id || undefined,
        fieldKey: c.fieldKey || `sub_${Date.now()}_${idx}`,
        fieldLabel: c.fieldLabel || '',
        fieldType: FIELD_TYPES.includes(c.fieldType) ? c.fieldType : 'text',
        options: Array.isArray(c.options) ? c.options.map((o) => String(o).trim()).filter(Boolean) : [],
        conditional: {
          enabled: Boolean(c.conditional?.enabled),
          dependsOn: c.conditional?.dependsOn || null,
          operator: ['equals', 'not_equals', 'includes'].includes(c.conditional?.operator) ? c.conditional.operator : 'equals',
          value: c.conditional?.value !== undefined ? c.conditional.value : 'Yes'
        },
        showOnPublicProfile: c.showOnPublicProfile !== undefined ? Boolean(c.showOnPublicProfile) : true,
        displayOrder: c.displayOrder || (idx + 1) * 10,
        enabled: c.enabled !== undefined ? Boolean(c.enabled) : true
      }));
    }

    await field.save();

    await AuditLog.create({
      action: 'UPDATE_MEMBER',
      performedBy: req.admin?.username || 'system',
      details: {
        actionType: 'UPDATE_FIELD_DEFINITION',
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Field "${field.fieldLabel}" updated successfully. Existing member data is preserved.`,
      data: field
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/fields/:id/children
 * @desc    Get all nested child fields for a parent field
 * @access  Private (Admin)
 */
export const getChildFields = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parentField = await MemberField.findOne(findFieldQuery(id));

    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    const sortedChildren = [...(parentField.children || [])].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    res.json({
      success: true,
      count: sortedChildren.length,
      data: sortedChildren,
      parent: {
        _id: parentField._id,
        fieldKey: parentField.fieldKey,
        fieldLabel: parentField.fieldLabel,
        fieldType: parentField.fieldType
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/fields/:id/children
 * @desc    Add a nested sub-field to a parent field
 * @access  Private (Admin)
 */
export const addChildField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parentField = await MemberField.findOne(findFieldQuery(id));

    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    const {
      fieldLabel = '',
      fieldKey: customChildKey,
      fieldType = 'text',
      options = [],
      conditional = {},
      showOnPublicProfile = true
    } = req.body;

    const trimmedLabel = fieldLabel ? fieldLabel.trim() : '';

    let baseKey = '';
    if (customChildKey && customChildKey.trim()) {
      baseKey = customChildKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
    } else if (trimmedLabel) {
      baseKey = generateFieldKey(trimmedLabel).replace(/[^a-zA-Z0-9_]/g, '');
    } else {
      baseKey = `sub_${Date.now()}`;
    }

    let childKey = baseKey || `sub_${Date.now()}`;

    // Guarantee uniqueness among siblings within this parent
    if (parentField.children.some((c) => c.fieldKey === childKey)) {
      childKey = `${childKey}_${Math.random().toString(36).substring(2, 6)}`;
    }

    let cleanOptions = [];
    if (['select', 'dropdown', 'checkbox', 'radio'].includes(fieldType)) {
      cleanOptions = Array.isArray(options)
        ? options.map((opt) => String(opt).trim()).filter(Boolean)
        : [];
    }

    const newChild = {
      fieldKey: childKey,
      fieldLabel: trimmedLabel || (fieldType === 'alphanumeric' ? 'Untitled ID No' : `Untitled ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`),
      fieldType,
      options: cleanOptions,
      conditional: {
        enabled: Boolean(conditional?.enabled),
        dependsOn: conditional?.dependsOn || null,
        operator: ['equals', 'not_equals', 'includes'].includes(conditional?.operator) ? conditional.operator : 'equals',
        value: conditional?.value !== undefined ? conditional.value : 'Yes'
      },
      showOnPublicProfile: showOnPublicProfile !== undefined ? Boolean(showOnPublicProfile) : true,
      displayOrder: (parentField.children.length + 1) * 10,
      enabled: true
    };

    parentField.children.push(newChild);
    await parentField.save();

    const savedChild = parentField.children[parentField.children.length - 1];

    res.status(201).json({
      success: true,
      message: `Sub-field "${savedChild.fieldLabel}" added successfully.`,
      data: parentField,
      child: savedChild
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/fields/:id/children/:childId
 * @desc    Update a nested sub-field (fieldKey preserved)
 * @access  Private (Admin)
 */
export const updateChildField = async (req, res, next) => {
  try {
    const { id, childId } = req.params;
    const parentField = await MemberField.findOne(findFieldQuery(id));

    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    const child =
      parentField.children.id(childId) ||
      parentField.children.find((c) => String(c._id) === childId || c.fieldKey === childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: `Sub-field not found with identifier "${childId}".`
      });
    }

    const {
      fieldLabel,
      fieldType,
      options,
      conditional,
      showOnPublicProfile,
      enabled,
      displayOrder
    } = req.body;

    if (fieldLabel !== undefined) child.fieldLabel = fieldLabel.trim();
    if (fieldType !== undefined) child.fieldType = fieldType;

    if (options !== undefined) {
      child.options = Array.isArray(options)
        ? options.map((opt) => String(opt).trim()).filter(Boolean)
        : [];
    }

    if (conditional !== undefined) {
      child.conditional = {
        enabled: Boolean(conditional.enabled),
        dependsOn: conditional.dependsOn || null,
        operator: ['equals', 'not_equals', 'includes'].includes(conditional.operator) ? conditional.operator : 'equals',
        value: conditional.value !== undefined ? conditional.value : 'Yes'
      };
    }

    if (showOnPublicProfile !== undefined) child.showOnPublicProfile = Boolean(showOnPublicProfile);
    if (enabled !== undefined) child.enabled = Boolean(enabled);
    if (displayOrder !== undefined) child.displayOrder = Number(displayOrder);

    await parentField.save();

    res.json({
      success: true,
      message: `Sub-field "${child.fieldLabel}" updated successfully.`,
      data: parentField,
      child
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/fields/:id/children/:childId
 * @desc    Delete a sub-field from parent
 * @access  Private (Admin)
 */
export const deleteChildField = async (req, res, next) => {
  try {
    const { id, childId } = req.params;
    const parentField = await MemberField.findOne(findFieldQuery(id));

    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    const targetChild =
      parentField.children.id(childId) ||
      parentField.children.find((c) => String(c._id) === childId || c.fieldKey === childId);

    if (!targetChild) {
      return res.status(404).json({
        success: false,
        message: `Sub-field not found with identifier "${childId}".`
      });
    }

    const childLabel = targetChild.fieldLabel || targetChild.fieldKey;

    // Check if any member has data stored for this sub-field
    const memberUsageCount = await Member.countDocuments({
      $or: [
        { [`customFields.${parentField.fieldKey}.${targetChild.fieldKey}`]: { $exists: true, $ne: '' } },
        { [`customFields.${targetChild.fieldKey}`]: { $exists: true, $ne: '' } }
      ]
    });

    parentField.children = parentField.children.filter(
      (c) => String(c._id) !== String(targetChild._id) && c.fieldKey !== targetChild.fieldKey
    );

    await parentField.save();

    await AuditLog.create({
      action: 'DELETE_MEMBER',
      performedBy: req.admin?.username || 'system',
      details: {
        actionType: 'DELETE_SUB_FIELD',
        parentKey: parentField.fieldKey,
        childKey: targetChild.fieldKey,
        childLabel,
        memberUsageCount
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Sub-field "${childLabel}" deleted successfully.${memberUsageCount > 0 ? ` (Note: ${memberUsageCount} historical member records retain their saved values).` : ''}`,
      data: parentField
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/fields/:id/options/:optionName
 * @desc    Delete a single option from a field's options array
 * @access  Private (Admin)
 */
export const deleteFieldOption = async (req, res, next) => {
  try {
    const { id, optionName } = req.params;
    const targetOption = decodeURIComponent(optionName || req.query.option || '').trim();

    if (!targetOption) {
      return res.status(400).json({
        success: false,
        message: 'Option name or index to delete is required.'
      });
    }

    const field = await MemberField.findOne(findFieldQuery(id));
    if (!field) {
      return res.status(404).json({
        success: false,
        message: `Field not found with identifier "${id}".`
      });
    }

    const initialCount = field.options.length;
    field.options = field.options.filter(
      (opt) => String(opt).trim() !== targetOption && String(opt) !== targetOption
    );

    if (field.options.length === initialCount) {
      const optIdx = parseInt(targetOption, 10);
      if (!isNaN(optIdx) && optIdx >= 0 && optIdx < field.options.length) {
        field.options.splice(optIdx, 1);
      } else {
        return res.status(404).json({
          success: false,
          message: `Option "${targetOption}" not found in field options.`
        });
      }
    }

    await field.save();

    res.json({
      success: true,
      message: `Option "${targetOption}" removed successfully from "${field.fieldLabel}".`,
      data: field
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/fields/:id/children/:childId/options/:optionName
 * @desc    Delete a single option from a sub-field's options array
 * @access  Private (Admin)
 */
export const deleteChildFieldOption = async (req, res, next) => {
  try {
    const { id, childId, optionName } = req.params;
    const targetOption = decodeURIComponent(optionName || req.query.option || '').trim();

    if (!targetOption) {
      return res.status(400).json({
        success: false,
        message: 'Option name or index to delete is required.'
      });
    }

    const parentField = await MemberField.findOne(findFieldQuery(id));
    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    const child =
      parentField.children.id(childId) ||
      parentField.children.find((c) => String(c._id) === childId || c.fieldKey === childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: `Sub-field not found with identifier "${childId}".`
      });
    }

    const initialCount = child.options.length;
    child.options = child.options.filter(
      (opt) => String(opt).trim() !== targetOption && String(opt) !== targetOption
    );

    if (child.options.length === initialCount) {
      const optIdx = parseInt(targetOption, 10);
      if (!isNaN(optIdx) && optIdx >= 0 && optIdx < child.options.length) {
        child.options.splice(optIdx, 1);
      } else {
        return res.status(404).json({
          success: false,
          message: `Option "${targetOption}" not found in sub-field options.`
        });
      }
    }

    await parentField.save();

    res.json({
      success: true,
      message: `Option "${targetOption}" removed successfully from "${child.fieldLabel}".`,
      data: parentField
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/fields/:id/children/reorder
 * @desc    Reorder sub-fields inside parent
 * @access  Private (Admin)
 */
export const reorderChildFields = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { childOrders } = req.body;

    const parentField = await MemberField.findOne(findFieldQuery(id));

    if (!parentField) {
      return res.status(404).json({
        success: false,
        message: `Parent field not found with identifier "${id}".`
      });
    }

    if (Array.isArray(childOrders)) {
      const orderMap = new Map(childOrders.map((co) => [String(co.childId), Number(co.displayOrder)]));
      parentField.children.forEach((c) => {
        const ord = orderMap.get(String(c._id)) ?? orderMap.get(c.fieldKey);
        if (ord !== undefined) {
          c.displayOrder = ord;
        }
      });
      parentField.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      await parentField.save();
    }

    res.json({
      success: true,
      message: 'Sub-fields reordered successfully.',
      data: parentField
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/fields/reorder
 * @desc    Bulk update display order of fields
 * @access  Private (Admin)
 */
export const reorderFields = async (req, res, next) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid orders array is required.'
      });
    }

    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { displayOrder: Number(item.displayOrder) || 0 } }
      }
    }));

    await MemberField.bulkWrite(bulkOps);

    const updatedFields = await MemberField.find().sort({ displayOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      message: 'Field display order updated successfully.',
      data: updatedFields
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/fields/:id/toggle
 * @desc    Toggle field enabled status
 * @access  Private (Admin)
 */
export const toggleField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const field = await MemberField.findOne(findFieldQuery(id));

    if (!field) {
      return res.status(404).json({
        success: false,
        message: `Field not found with identifier "${id}".`
      });
    }

    field.enabled = !field.enabled;
    await field.save();

    res.json({
      success: true,
      message: `Field "${field.fieldLabel}" is now ${field.enabled ? 'Enabled' : 'Disabled'}.`,
      data: field
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/fields/:id
 * @desc    Archive or delete a custom member field
 * @access  Private (Admin)
 */
export const deleteField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const field = await MemberField.findOne(findFieldQuery(id));

    if (!field) {
      return res.status(404).json({
        success: false,
        message: `Field not found with identifier "${id}".`
      });
    }

    // Never allow deletion of essential internal system identifiers: memberId and qrToken
    const IMMUTABLE_IDENTIFIERS = ['memberid', 'qrtoken'];
    if (IMMUTABLE_IDENTIFIERS.includes(String(field.fieldKey).toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: `Cannot delete permanent system identifier "${field.fieldKey}". This identifier is required for permanent membership identification and QR functionality.`
      });
    }

    // Check if any members have data stored in this field
    const memberUsageCount = await Member.countDocuments({
      $or: [
        { [`customFields.${field.fieldKey}`]: { $exists: true, $ne: '' } },
        { [`customFields.${field.fieldKey}`]: { $exists: true, $not: { $size: 0 } } },
        { [field.fieldKey]: { $exists: true, $ne: '' } }
      ]
    });

    if (permanent === 'true' && memberUsageCount === 0) {
      await MemberField.deleteOne({ _id: field._id });
    } else {
      // Safe archival: keep definition marked archived so historical values remain intact
      field.isArchived = true;
      field.enabled = false;
      await field.save();
    }

    await AuditLog.create({
      action: 'DELETE_MEMBER',
      performedBy: req.admin?.username || 'system',
      details: {
        actionType: 'DELETE_FIELD',
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        memberUsageCount,
        archived: memberUsageCount > 0 || permanent !== 'true'
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      memberUsageCount,
      message: `Field "${field.fieldLabel}" has been ${
        memberUsageCount > 0
          ? `safely archived (${memberUsageCount} member records retain their data)`
          : 'removed'
      }. Existing member records retain their data.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/public/fields
 * @desc    Get enabled fields allowed on public QR profiles
 * @access  Public
 */
export const getPublicFields = async (req, res, next) => {
  try {
    const fields = await MemberField.find({
      enabled: true,
      isArchived: false,
      showOnPublicProfile: true
    }).sort({ displayOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      data: fields.map((f) => ({
        fieldKey: f.fieldKey,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType,
        options: f.options,
        children: f.children ? f.children.filter((c) => c.enabled && c.showOnPublicProfile) : [],
        isSensitive: f.isSensitive,
        displayOrder: f.displayOrder
      }))
    });
  } catch (error) {
    next(error);
  }
};

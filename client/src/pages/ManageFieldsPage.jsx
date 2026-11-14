import React, { useState, useEffect } from 'react';
import { fieldService } from '../services/fieldService';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Sliders,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  Layers,
  Zap,
  X
} from 'lucide-react';

const SUPPORTED_FIELD_TYPES = [
  { value: 'text', label: 'Text (Single Line)' },
  { value: 'alphanumeric', label: 'ID No (Alphanumeric)' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email Address' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Textarea (Multi-line)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox Question' },
  { value: 'radio', label: 'Radio Button' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'group', label: 'Parent Group (with Sub-Fields)' }
];

const initialFieldForm = {
  fieldLabel: '',
  fieldType: 'text',
  options: [],
  showOnPublicProfile: true
};

const initialSubFieldForm = {
  fieldLabel: '',
  fieldType: 'text',
  options: [],
  showOnPublicProfile: true,
  conditional: {
    enabled: false,
    dependsOn: '',
    operator: 'equals',
    value: 'Yes'
  }
};

const ManageFieldsPage = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedParents, setExpandedParents] = useState({});

  // Field Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldFormData, setFieldFormData] = useState(initialFieldForm);

  // Sub-field modal
  const [subFieldModalParent, setSubFieldModalParent] = useState(null);
  const [editingSubField, setEditingSubField] = useState(null);
  const [subFieldFormData, setSubFieldFormData] = useState(initialSubFieldForm);

  // Unified Deletion Confirmation State (Handles Parent, Sub-field, Option, Sub-option)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Option input state
  const [newOptionText, setNewOptionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await fieldService.getFields();
      if (res.success) {
        setFields(res.data);
        const expandMap = {};
        res.data.forEach((f) => {
          if (f.children && f.children.length > 0) {
            expandMap[f._id] = true;
          }
        });
        setExpandedParents(expandMap);
      }
    } catch (err) {
      showError('Failed to fetch field definitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const toggleExpand = (fieldId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // =========================================================================
  // TOP-LEVEL FIELD HANDLERS
  // =========================================================================

  const handleOpenAdd = () => {
    setFieldFormData({ ...initialFieldForm, options: [] });
    setNewOptionText('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (field) => {
    setEditingField(field);
    setFieldFormData({
      fieldLabel: field.fieldLabel || '',
      fieldType: field.fieldType || 'text',
      options: [...(field.options || [])],
      showOnPublicProfile: field.showOnPublicProfile !== undefined ? field.showOnPublicProfile : true
    });
    setNewOptionText('');
  };

  const handleSaveTopField = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingField) {
        const res = await fieldService.updateField(editingField._id, fieldFormData);
        showSuccess(res.message || 'Field updated successfully.');
        setEditingField(null);
      } else {
        const res = await fieldService.createField(fieldFormData);
        showSuccess(res.message || 'Custom field created successfully.');
        setIsAddModalOpen(false);
      }
      fetchFields();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        const msgs = resp.errors.map((e) => (typeof e === 'object' ? e.message : String(e))).join(' | ');
        showError(msgs || resp.message || 'Failed to save field.');
      } else {
        showError(resp?.message || err.message || 'Failed to save field.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orders = reordered.map((f, i) => ({
      id: f._id,
      displayOrder: (i + 1) * 10
    }));

    try {
      setFields(reordered.map((f, i) => ({ ...f, displayOrder: (i + 1) * 10 })));
      await fieldService.reorderFields(orders);
      showSuccess('Field order saved.');
    } catch (err) {
      showError('Failed to update field order.');
      fetchFields();
    }
  };

  // =========================================================================
  // SUB-FIELD HANDLERS
  // =========================================================================

  const handleOpenAddSubField = (parentField) => {
    setSubFieldModalParent(parentField);
    setEditingSubField(null);
    setSubFieldFormData({
      ...initialSubFieldForm,
      options: [],
      conditional: {
        enabled: false,
        dependsOn: (parentField.children && parentField.children[0]?.fieldKey) || parentField.fieldKey,
        operator: 'equals',
        value: 'Yes'
      }
    });
    setNewOptionText('');
  };

  const handleOpenEditSubField = (parentField, subField) => {
    setSubFieldModalParent(parentField);
    setEditingSubField(subField);
    setSubFieldFormData({
      fieldLabel: subField.fieldLabel || '',
      fieldType: subField.fieldType || 'text',
      options: [...(subField.options || [])],
      showOnPublicProfile: subField.showOnPublicProfile !== undefined ? subField.showOnPublicProfile : true,
      conditional: {
        enabled: Boolean(subField.conditional?.enabled),
        dependsOn: subField.conditional?.dependsOn || parentField.fieldKey,
        operator: subField.conditional?.operator || 'equals',
        value: subField.conditional?.value !== undefined ? subField.conditional.value : 'Yes'
      }
    });
    setNewOptionText('');
  };

  const handleSaveSubField = async (e) => {
    e.preventDefault();
    if (!subFieldModalParent) return;

    const parentId = subFieldModalParent._id || subFieldModalParent.id || subFieldModalParent.fieldKey;
    setSubmitting(true);
    try {
      if (editingSubField) {
        const childId = editingSubField._id || editingSubField.id || editingSubField.fieldKey;
        await fieldService.updateChildField(
          parentId,
          childId,
          subFieldFormData
        );
        showSuccess('Sub-field updated successfully.');
      } else {
        await fieldService.addChildField(parentId, subFieldFormData);
        showSuccess('Sub-field added successfully.');
      }
      setSubFieldModalParent(null);
      setEditingSubField(null);
      fetchFields();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        const msgs = resp.errors.map((e) => (typeof e === 'object' ? e.message : String(e))).join(' | ');
        showError(msgs || resp.message || 'Failed to save sub-field.');
      } else {
        showError(resp?.message || err.message || 'Failed to save sub-field.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveSubFieldOrder = async (parentField, childIndex, direction) => {
    const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
    if (targetIndex < 0 || targetIndex >= parentField.children.length) return;

    const children = [...parentField.children];
    const temp = children[childIndex];
    children[childIndex] = children[targetIndex];
    children[targetIndex] = temp;

    const childOrders = children.map((c, i) => ({
      childId: c._id || c.id || c.fieldKey,
      displayOrder: (i + 1) * 10
    }));

    try {
      const parentId = parentField._id || parentField.id || parentField.fieldKey;
      await fieldService.reorderChildFields(parentId, childOrders);
      showSuccess('Sub-field order saved.');
      fetchFields();
    } catch (err) {
      showError('Failed to reorder sub-fields.');
    }
  };

  // =========================================================================
  // UNIFIED DELETE CLICK HANDLERS (Parent, Sub-field, Checkbox Option)
  // =========================================================================

  // 1. Delete Parent Field / Checkbox Question
  const promptDeleteField = (field) => {
    const label = field.fieldLabel || field.fieldKey;
    setDeleteTarget({
      type: 'parent',
      id: field._id || field.id || field.fieldKey,
      title: `Delete Field: "${label}"`,
      message: `Delete field "${label}"? Existing member data will be preserved in records.`,
      confirmText: 'Delete Field'
    });
  };

  // 2. Delete Sub-Field / Nested Child Item
  const promptDeleteSubField = (parentField, subField) => {
    const parentId = parentField._id || parentField.id || parentField.fieldKey;
    const childId = subField._id || subField.id || subField.fieldKey;
    const childLabel = subField.fieldLabel || subField.fieldKey;

    setDeleteTarget({
      type: 'subfield',
      parentId,
      childId,
      title: `Delete Sub-Field: "${childLabel}"`,
      message: `Delete sub-field "${childLabel}" from "${parentField.fieldLabel || 'Parent Group'}"?`,
      confirmText: 'Delete Sub-Field'
    });
  };

  // 3. Delete Option from Top-Level Field
  const promptDeleteOption = (field, optionName) => {
    const fieldId = field._id || field.id || field.fieldKey;
    const fieldLabel = field.fieldLabel || field.fieldKey;

    setDeleteTarget({
      type: 'option',
      fieldId,
      optionName,
      title: `Delete Option: "${optionName}"`,
      message: `Delete option "${optionName}" from "${fieldLabel}"?`,
      confirmText: 'Delete Option'
    });
  };

  // 4. Delete Option from Sub-Field
  const promptDeleteSubOption = (parentField, subField, optionName) => {
    const parentId = parentField._id || parentField.id || parentField.fieldKey;
    const childId = subField._id || subField.id || subField.fieldKey;
    const childLabel = subField.fieldLabel || subField.fieldKey;

    setDeleteTarget({
      type: 'suboption',
      parentId,
      childId,
      optionName,
      title: `Delete Option: "${optionName}"`,
      message: `Delete option "${optionName}" from sub-field "${childLabel}"?`,
      confirmText: 'Delete Option'
    });
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingLoading(true);

    try {
      if (deleteTarget.type === 'parent') {
        const res = await fieldService.deleteField(deleteTarget.id);
        showSuccess(res.message || 'Field deleted successfully.');
      } else if (deleteTarget.type === 'subfield') {
        const res = await fieldService.deleteChildField(
          deleteTarget.parentId,
          deleteTarget.childId
        );
        showSuccess(res.message || 'Sub-field deleted successfully.');
      } else if (deleteTarget.type === 'option') {
        const res = await fieldService.deleteFieldOption(
          deleteTarget.fieldId,
          deleteTarget.optionName
        );
        showSuccess(res.message || `Option "${deleteTarget.optionName}" deleted.`);
      } else if (deleteTarget.type === 'suboption') {
        const res = await fieldService.deleteChildFieldOption(
          deleteTarget.parentId,
          deleteTarget.childId,
          deleteTarget.optionName
        );
        showSuccess(res.message || `Option "${deleteTarget.optionName}" deleted.`);
      }

      setDeleteTarget(null);
      fetchFields();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete item.');
    } finally {
      setDeletingLoading(false);
    }
  };

  // =========================================================================
  // OPTIONS BUILDER HELPERS (For Modals)
  // =========================================================================

  const handleAddOption = (formSetter) => {
    const trimmed = newOptionText.trim();
    if (!trimmed) return;
    formSetter((prev) => {
      if (prev.options.includes(trimmed)) {
        showError('Option already exists.');
        return prev;
      }
      return {
        ...prev,
        options: [...prev.options, trimmed]
      };
    });
    setNewOptionText('');
  };

  const handleRemoveOptionInModal = (optToRemove, formSetter) => {
    formSetter((prev) => ({
      ...prev,
      options: prev.options.filter((o) => o !== optToRemove)
    }));
  };

  const handleReorderOption = (index, direction, formSetter) => {
    formSetter((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.options.length) return prev;
      const opts = [...prev.options];
      const temp = opts[index];
      opts[index] = opts[targetIndex];
      opts[targetIndex] = temp;
      return { ...prev, options: opts };
    });
  };

  const handleRenameOption = (index, newName, formSetter) => {
    formSetter((prev) => {
      const opts = [...prev.options];
      opts[index] = newName;
      return { ...prev, options: opts };
    });
  };

  const filteredFields = fields.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesLabel = (f.fieldLabel || '').toLowerCase().includes(q);
    const matchesKey = (f.fieldKey || '').toLowerCase().includes(q);
    const matchesType = (f.fieldType || '').toLowerCase().includes(q);
    const matchesChild = (f.children || []).some(
      (c) =>
        (c.fieldLabel || '').toLowerCase().includes(q) ||
        (c.fieldKey || '').toLowerCase().includes(q)
    );
    return matchesLabel || matchesKey || matchesType || matchesChild;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'group':
        return { label: 'Parent Group', color: '#6366F1', bg: '#EEF2FF' };
      case 'checkbox':
        return { label: 'Checkbox Question', color: '#059669', bg: '#ECFDF5' };
      case 'radio':
        return { label: 'Radio Button', color: '#D97706', bg: '#FEF3C7' };
      case 'dropdown':
      case 'select':
        return { label: 'Dropdown', color: '#2563EB', bg: '#EFF6FF' };
      case 'boolean':
        return { label: 'Yes / No', color: '#0891B2', bg: '#ECFEFF' };
      case 'date':
        return { label: 'Date', color: '#7C3AED', bg: '#F5F3FF' };
      case 'alphanumeric':
        return { label: 'ID No (Alphanumeric)', color: '#0284C7', bg: '#E0F2FE' };
      case 'number':
        return { label: 'Number', color: '#EA580C', bg: '#FFF7ED' };
      case 'phone':
        return { label: 'Phone', color: '#16A34A', bg: '#F0FDF4' };
      case 'email':
        return { label: 'Email', color: '#0284C7', bg: '#F0F9FF' };
      case 'textarea':
        return { label: 'Textarea', color: '#4B5563', bg: '#F3F4F6' };
      default:
        return { label: 'Text', color: '#4B5563', bg: '#F3F4F6' };
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Fields</h1>
          <p className="page-subtitle">
            Configure custom membership fields, nested groups, and options.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Add Field</span>
        </button>
      </div>

      {/* Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search fields, sub-fields, or types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
        </div>
      </div>

      {/* Dynamic Fields List (Manageable Cards / Rows) */}
      {loading ? (
        <LoadingSpinner text="Loading member fields..." />
      ) : filteredFields.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Layers size={36} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No Fields Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.875rem' }}>
            {search ? 'No fields matched your search.' : 'Get started by creating your first custom membership field.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Add Custom Field</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredFields.map((field, idx) => {
            const typeBadge = getTypeBadge(field.fieldType);
            const childCount = (field.children && field.children.length) || 0;
            const isExpanded = expandedParents[field._id];
            const hasOptions = field.options && field.options.length > 0;

            return (
              <div
                key={field._id}
                className="card"
                style={{
                  border: '1px solid var(--border)',
                  padding: '1.125rem 1.25rem',
                  transition: 'box-shadow 0.2s ease',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                {/* Main Field Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  {/* Left: Reorder, Expand, Field Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                    {/* Reorder Up/Down */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        className="btn-icon"
                        style={{ padding: '2px' }}
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ padding: '2px' }}
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === filteredFields.length - 1}
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Expand/Collapse Chevron (if has children or is group) */}
                    {(childCount > 0 || field.fieldType === 'group') && (
                      <button
                        className="btn-icon"
                        style={{ padding: '4px' }}
                        onClick={() => toggleExpand(field._id)}
                        title={isExpanded ? 'Collapse Sub-Fields' : 'Expand Sub-Fields'}
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    )}

                    {/* Field Labels & Badges */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {field.fieldLabel || <span style={{ color: 'var(--text-muted)' }}>(Untitled Field)</span>}
                        </strong>

                        <span
                          className="badge"
                          style={{
                            backgroundColor: typeBadge.bg,
                            color: typeBadge.color,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {typeBadge.label}
                        </span>

                        {childCount > 0 ? (
                          <span
                            className="badge badge-subtle"
                            style={{ fontSize: '0.6875rem', cursor: 'pointer' }}
                            onClick={() => toggleExpand(field._id)}
                          >
                            {childCount} {childCount === 1 ? 'Sub-Field' : 'Sub-Fields'}
                          </span>
                        ) : (
                          <span className="badge badge-subtle" style={{ fontSize: '0.6875rem', opacity: 0.6 }}>
                            No sub-fields
                          </span>
                        )}

                        {hasOptions && (
                          <span
                            className="badge badge-subtle"
                            style={{ fontSize: '0.6875rem' }}
                          >
                            {field.options.length} options
                          </span>
                        )}

                        {field.showOnPublicProfile && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.6875rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Visible on Member Public QR Profile"
                          >
                            <Eye size={10} /> QR
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <code>#{field.fieldKey}</code>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons with Clear Delete Icon Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Add Sub Field Button */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenAddSubField(field)}
                      title="Add a nested sub-field"
                    >
                      <Plus size={14} />
                      <span className="hide-on-xs">Add Sub Field</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(field)}
                      title="Edit Field"
                    >
                      <Edit2 size={14} />
                      <span className="hide-on-xs">Edit</span>
                    </button>

                    {/* 1. PARENT / TOP-LEVEL FIELD DELETE BUTTON */}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => promptDeleteField(field)}
                      title={`Delete ${field.fieldType === 'checkbox' ? 'checkbox question' : 'field'} "${field.fieldLabel || field.fieldKey}"`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Trash2 size={14} />
                      <span className="hide-on-xs">Delete</span>
                    </button>
                  </div>
                </div>

                {/* 4. INDIVIDUAL CHECKBOX / DROPDOWN OPTIONS (WITH DEDICATED DELETE BUTTON FOR EVERY OPTION) */}
                {hasOptions && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.625rem 0.875rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '0.375rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {field.fieldType === 'checkbox' ? 'Checkbox Options' : 'Options'} ({field.options.length}):
                    </span>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {field.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.2rem 0.6rem',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <span>{opt}</span>
                          {/* Dedicated Delete button for each checkbox/dropdown option */}
                          <button
                            type="button"
                            onClick={() => promptDeleteOption(field, opt)}
                            style={{
                              border: 'none',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '2px',
                              transition: 'opacity 0.15s ease'
                            }}
                            title={`Delete option "${opt}"`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2 & 5. NESTED SUB-FIELDS / CHILD ITEMS BUILDER */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px dashed var(--border)',
                      paddingLeft: '1.25rem'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        Nested Sub-Fields ({childCount})
                      </span>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAddSubField(field)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <Plus size={12} />
                        <span>Add Sub Field</span>
                      </button>
                    </div>

                    {childCount === 0 ? (
                      <div
                        style={{
                          padding: '1.25rem',
                          textAlign: 'center',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-muted)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        No sub-fields added yet. Click <strong>"Add Sub Field"</strong> to attach nested items.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {field.children.map((sub, childIdx) => {
                          const subBadge = getTypeBadge(sub.fieldType);
                          const hasSubOptions = sub.options && sub.options.length > 0;

                          return (
                            <div
                              key={sub._id || sub.fieldKey}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '0.75rem 0.875rem',
                                backgroundColor: 'var(--bg-subtle)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                gap: '0.5rem'
                              }}
                            >
                              {/* Sub-field Top Row */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                  flexWrap: 'wrap'
                                }}
                              >
                                {/* Info & Reorder */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <button
                                      className="btn-icon"
                                      style={{ padding: '1px' }}
                                      onClick={() => handleMoveSubFieldOrder(field, childIdx, 'up')}
                                      disabled={childIdx === 0}
                                      title="Move Up"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      className="btn-icon"
                                      style={{ padding: '1px' }}
                                      onClick={() => handleMoveSubFieldOrder(field, childIdx, 'down')}
                                      disabled={childIdx === field.children.length - 1}
                                      title="Move Down"
                                    >
                                      <ArrowDown size={11} />
                                    </button>
                                  </div>

                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                        {sub.fieldLabel || '(Untitled Sub-Field)'}
                                      </strong>

                                      <span
                                        className="badge"
                                        style={{
                                          backgroundColor: subBadge.bg,
                                          color: subBadge.color,
                                          fontSize: '0.6875rem',
                                          padding: '0.1rem 0.4rem'
                                        }}
                                      >
                                        {subBadge.label}
                                      </span>

                                      {/* Conditional Badge */}
                                      {sub.conditional && sub.conditional.enabled && (
                                        <span
                                          className="badge"
                                          style={{
                                            backgroundColor: '#FEF3C7',
                                            color: '#B45309',
                                            fontSize: '0.6875rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                          }}
                                          title={`Only appears when ${sub.conditional.dependsOn} = ${sub.conditional.value}`}
                                        >
                                          <Zap size={10} />
                                          Shows if {sub.conditional.dependsOn} = {String(sub.conditional.value)}
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                      <code>#{sub.fieldKey}</code>
                                    </div>
                                  </div>
                                </div>

                                {/* Sub-field Actions with Individual Delete Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleOpenEditSubField(field, sub)}
                                    title="Edit Sub-Field"
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </button>

                                  {/* 2 & 5. SUB-FIELD / NESTED CHILD INDIVIDUAL DELETE BUTTON */}
                                  <button
                                    className="btn btn-danger btn-sm"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    onClick={() => promptDeleteSubField(field, sub)}
                                    title={`Delete sub-field "${sub.fieldLabel || sub.fieldKey}"`}
                                  >
                                    <Trash2 size={12} />
                                    <span className="hide-on-xs">Delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Sub-field Options (with Delete button for each option) */}
                              {hasSubOptions && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    Options:
                                  </span>
                                  {sub.options.map((opt, optIdx) => (
                                    <span
                                      key={optIdx}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.15rem 0.5rem',
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.6875rem',
                                        color: 'var(--text-primary)'
                                      }}
                                    >
                                      <span>{opt}</span>
                                      {/* Dedicated Delete button for each sub-field option */}
                                      <button
                                        type="button"
                                        onClick={() => promptDeleteSubOption(field, sub, opt)}
                                        style={{
                                          border: 'none',
                                          background: '#FEE2E2',
                                          color: '#DC2626',
                                          padding: '2px 4px',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginLeft: '2px'
                                        }}
                                        title={`Delete option "${opt}"`}
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          ADD / EDIT CUSTOM FIELD MODAL
          ===================================================================== */}
      <Modal
        isOpen={isAddModalOpen || editingField !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingField(null);
        }}
        title={editingField ? `Edit Field: ${editingField.fieldLabel || editingField.fieldKey}` : 'Add Custom Field'}
      >
        <form onSubmit={handleSaveTopField}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Field Label (OPTIONAL) */}
            <div className="form-group">
              <label className="form-label">
                Field Label <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Passport Number, UAE Details, Membership Date..."
                value={fieldFormData.fieldLabel}
                onChange={(e) => setFieldFormData({ ...fieldFormData, fieldLabel: e.target.value })}
                autoFocus
              />
              <span className="form-help">Leave blank to automatically assign a default title and stable identifier.</span>
            </div>

            {/* 2. Field Type */}
            <div className="form-group">
              <label className="form-label">Field Type</label>
              <select
                className="form-select"
                value={fieldFormData.fieldType}
                onChange={(e) =>
                  setFieldFormData({
                    ...fieldFormData,
                    fieldType: e.target.value,
                    options: ['dropdown', 'select', 'checkbox', 'radio'].includes(e.target.value)
                      ? fieldFormData.options.length > 0 ? fieldFormData.options : ['Option 1', 'Option 2']
                      : []
                  })
                }
              >
                {SUPPORTED_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* OPTIONS BUILDER IN MODAL */}
            {['dropdown', 'select', 'checkbox', 'radio'].includes(fieldFormData.fieldType) && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                  {fieldFormData.fieldType === 'checkbox' ? 'Checkbox Options (Multiple Choice)' : 'Selection Options'}
                </label>

                {/* Add Option Input */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type an option and press Add..."
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption(setFieldFormData);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddOption(setFieldFormData)}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Option List with Reorder and Delete Button */}
                {fieldFormData.options.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No options configured yet. Add at least one option.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {fieldFormData.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'var(--bg-surface)',
                          padding: '0.375rem 0.625rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ padding: 0 }}
                            onClick={() => handleReorderOption(optIdx, 'up', setFieldFormData)}
                            disabled={optIdx === 0}
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ padding: 0 }}
                            onClick={() => handleReorderOption(optIdx, 'down', setFieldFormData)}
                            disabled={optIdx === fieldFormData.options.length - 1}
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleRenameOption(optIdx, e.target.value, setFieldFormData)}
                          style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)'
                          }}
                        />

                        {/* Red Trash Delete Button for each option in modal */}
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: 'var(--danger)', padding: '4px' }}
                          onClick={() => handleRemoveOptionInModal(opt, setFieldFormData)}
                          title="Remove option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Public QR Profile Visibility Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Display on Public QR Profile
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  When enabled, this field will be visible when scanning member ID cards.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fieldFormData.showOnPublicProfile}
                onChange={(e) =>
                  setFieldFormData({ ...fieldFormData, showOnPublicProfile: e.target.checked })
                }
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingField(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingField ? 'Save Changes' : 'Create Field'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          ADD / EDIT SUB-FIELD MODAL
          ===================================================================== */}
      <Modal
        isOpen={subFieldModalParent !== null}
        onClose={() => {
          setSubFieldModalParent(null);
          setEditingSubField(null);
        }}
        title={
          editingSubField
            ? `Edit Sub-Field: ${editingSubField.fieldLabel || editingSubField.fieldKey}`
            : `Add Sub-Field to "${subFieldModalParent?.fieldLabel || 'Parent Group'}"`
        }
      >
        <form onSubmit={handleSaveSubField}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sub-Field Label (OPTIONAL) */}
            <div className="form-group">
              <label className="form-label">
                Sub-Field Label <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Visa Number, Expiry Date, Licence Status..."
                value={subFieldFormData.fieldLabel}
                onChange={(e) =>
                  setSubFieldFormData({ ...subFieldFormData, fieldLabel: e.target.value })
                }
                autoFocus
              />
            </div>

            {/* Sub-Field Type */}
            <div className="form-group">
              <label className="form-label">Sub-Field Type</label>
              <select
                className="form-select"
                value={subFieldFormData.fieldType}
                onChange={(e) =>
                  setSubFieldFormData({
                    ...subFieldFormData,
                    fieldType: e.target.value,
                    options: ['dropdown', 'select', 'checkbox', 'radio'].includes(e.target.value)
                      ? subFieldFormData.options.length > 0 ? subFieldFormData.options : ['Option 1', 'Option 2']
                      : []
                  })
                }
              >
                {SUPPORTED_FIELD_TYPES.filter((t) => t.value !== 'group').map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Options Builder for Sub-Field */}
            {['dropdown', 'select', 'checkbox', 'radio'].includes(subFieldFormData.fieldType) && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                  Options List
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add option..."
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption(setSubFieldFormData);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddOption(setSubFieldFormData)}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {subFieldFormData.options.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No options added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {subFieldFormData.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'var(--bg-surface)',
                          padding: '0.375rem 0.625rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleRenameOption(optIdx, e.target.value, setSubFieldFormData)}
                          style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.875rem'
                          }}
                        />
                        {/* Red Trash Delete Button for each option in sub-field modal */}
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: 'var(--danger)', padding: '4px' }}
                          onClick={() => handleRemoveOptionInModal(opt, setSubFieldFormData)}
                          title="Remove option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONDITIONAL QUESTIONS BUILDER */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="var(--warning)" />
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      Conditional Visibility
                    </strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Only show this sub-field when a specific answer is given.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={subFieldFormData.conditional?.enabled || false}
                  onChange={(e) =>
                    setSubFieldFormData({
                      ...subFieldFormData,
                      conditional: {
                        ...subFieldFormData.conditional,
                        enabled: e.target.checked
                      }
                    })
                  }
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {subFieldFormData.conditional?.enabled && (
                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                      Show this field when:
                    </label>
                    <select
                      className="form-select"
                      value={subFieldFormData.conditional?.dependsOn || ''}
                      onChange={(e) =>
                        setSubFieldFormData({
                          ...subFieldFormData,
                          conditional: {
                            ...subFieldFormData.conditional,
                            dependsOn: e.target.value
                          }
                        })
                      }
                    >
                      <option value={subFieldModalParent?.fieldKey}>
                        {subFieldModalParent?.fieldLabel || subFieldModalParent?.fieldKey} (Parent Field)
                      </option>
                      {(subFieldModalParent?.children || [])
                        .filter((c) => !editingSubField || c._id !== editingSubField._id)
                        .map((c) => (
                          <option key={c.fieldKey} value={c.fieldKey}>
                            {c.fieldLabel || c.fieldKey} (Sibling Field)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                        Condition:
                      </label>
                      <select
                        className="form-select"
                        value={subFieldFormData.conditional?.operator || 'equals'}
                        onChange={(e) =>
                          setSubFieldFormData({
                            ...subFieldFormData,
                            conditional: {
                              ...subFieldFormData.conditional,
                              operator: e.target.value
                            }
                          })
                        }
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does Not Equal</option>
                        <option value="includes">Contains</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                        Value to Match:
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Yes, Option 1"
                        value={subFieldFormData.conditional?.value ?? 'Yes'}
                        onChange={(e) =>
                          setSubFieldFormData({
                            ...subFieldFormData,
                            conditional: {
                              ...subFieldFormData.conditional,
                              value: e.target.value
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Public QR Profile Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Show on Public QR Profile
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Include this sub-field on public verification scan when condition is met.
                </p>
              </div>
              <input
                type="checkbox"
                checked={subFieldFormData.showOnPublicProfile}
                onChange={(e) =>
                  setSubFieldFormData({
                    ...subFieldFormData,
                    showOnPublicProfile: e.target.checked
                  })
                }
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSubFieldModalParent(null);
                  setEditingSubField(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingSubField ? 'Save Sub-Field' : 'Add Sub-Field'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          UNIFIED CONFIRMATION DIALOG (For Parent, Sub-field, and Options)
          ===================================================================== */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.title || 'Confirm Deletion'}
        message={deleteTarget?.message || 'Are you sure you want to delete this item?'}
        confirmText={deleteTarget?.confirmText || 'Delete'}
        danger={true}
        loading={deletingLoading}
      />
    </div>
  );
};

export default ManageFieldsPage;

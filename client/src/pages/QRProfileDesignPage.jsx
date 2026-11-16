import React, { useState, useEffect, useRef } from 'react';
import { designService } from '../services/designService';
import { fieldService } from '../services/fieldService';
import { getAssetUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import ProfileCardView, { SAMPLE_MEMBER } from '../components/ProfileCardView';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/design-customizer.css';
import {
  Palette,
  Layout,
  Type,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  RotateCcw,
  Save,
  UploadCloud,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Upload,
  Layers,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
  Minus,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  FolderPlus,
  ListFilter,
  Tag,
  Edit3
} from 'lucide-react';

const FONT_OPTIONS = ['Poppins', 'Inter', 'Nunito', 'Montserrat', 'Roboto'];

const COLOR_PRESETS = [
  {
    name: 'Official KTPD Blue',
    primary: '#1D4ED8',
    secondary: '#0F172A',
    accent: '#3B82F6',
    pageBg: '#0F172A',
    cardBg: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    headingColor: '#0F172A',
    labelColor: '#64748B',
    borderColor: '#E2E8F0',
    activeStatusBg: '#DCFCE7',
    activeStatusText: '#15803D',
    inactiveStatusBg: '#FEE2E2',
    inactiveStatusText: '#991B1B'
  },
  {
    name: 'Emerald Verification',
    primary: '#059669',
    secondary: '#064E3B',
    accent: '#10B981',
    pageBg: '#022C22',
    cardBg: '#FFFFFF',
    textPrimary: '#064E3B',
    textSecondary: '#4B5563',
    headingColor: '#064E3B',
    labelColor: '#059669',
    borderColor: '#D1FAE5',
    activeStatusBg: '#D1FAE5',
    activeStatusText: '#065F46',
    inactiveStatusBg: '#FEE2E2',
    inactiveStatusText: '#991B1B'
  },
  {
    name: 'Royal Indigo',
    primary: '#4F46E5',
    secondary: '#1E1B4B',
    accent: '#6366F1',
    pageBg: '#0F172A',
    cardBg: '#FFFFFF',
    textPrimary: '#1E1B4B',
    textSecondary: '#6B7280',
    headingColor: '#1E1B4B',
    labelColor: '#4F46E5',
    borderColor: '#E0E7FF',
    activeStatusBg: '#E0E7FF',
    activeStatusText: '#3730A3',
    inactiveStatusBg: '#FEE2E2',
    inactiveStatusText: '#991B1B'
  },
  {
    name: 'Modern Slate Dark',
    primary: '#38BDF8',
    secondary: '#1E293B',
    accent: '#0EA5E9',
    pageBg: '#090D16',
    cardBg: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    headingColor: '#FFFFFF',
    labelColor: '#38BDF8',
    borderColor: '#334155',
    activeStatusBg: '#064E3B',
    activeStatusText: '#34D399',
    inactiveStatusBg: '#7F1D1D',
    inactiveStatusText: '#FCA5A5'
  }
];

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern Card',
    desc: 'Contemporary curved header, floating pill badge, elegant spacing'
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    desc: 'Light transparent header, borderless cards, typography-first presentation'
  },
  {
    id: 'corporate',
    name: 'Corporate Pro',
    desc: 'Structured header, top border accent, crisp dividers and formal layout'
  },
  {
    id: 'gradient',
    name: 'Gradient Header',
    desc: 'Lush gradient banner, glowing status highlights, high visual presence'
  },
  {
    id: 'compact',
    name: 'Compact Density',
    desc: 'High information density, condensed padding for swift inspections'
  }
];

/**
 * Full-Featured Text Element Customizer Card
 * Supports: Show/Hide, Rename, Text Editing, Size (+, -, slider, px input),
 * Font Family, Font Weight, Text Color, Text Alignment, Line Height, Letter Spacing,
 * Placement selector (for custom items), and Delete button.
 */
const TextElementCustomizerCard = ({
  id,
  title,
  onRename,
  textValue,
  onTextChange,
  placeholder,
  isTextEditable = true,
  visible = true,
  onVisibleChange,
  canRemove = false,
  onRemove,
  placement,
  onPlacementChange,
  fontSize,
  defaultSize = 16,
  minSize = 10,
  maxSize = 48,
  onFontSizeChange,
  fontWeight,
  onFontWeightChange,
  color,
  defaultColor = '#0F172A',
  onColorChange,
  textAlign = 'left',
  onTextAlignChange,
  letterSpacing,
  onLetterSpacingChange,
  lineHeight,
  onLineHeightChange,
  fontFamily,
  onFontFamilyChange,
  isSelected = false,
  linkedFieldLabel
}) => {
  const currentSize = Number(fontSize !== undefined && fontSize !== null ? fontSize : defaultSize);
  const currentWeight = String(fontWeight || '600');
  const currentSpacing = letterSpacing || '0px';
  const currentLineHeight = Number(lineHeight || 1.25);
  const currentColor = color || defaultColor;
  const currentFamily = fontFamily || 'inherit';

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title || '');

  return (
    <div
      id={`element-card-${id}`}
      className={`text-element-card ${isSelected ? 'is-active-element' : ''}`}
      style={{
        opacity: visible ? 1 : 0.65,
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Element Header */}
      <div className="text-element-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <Type size={16} color="var(--primary)" style={{ flexShrink: 0 }} />

          {isEditingTitle && onRename ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.8125rem', height: 28 }}
                value={tempTitle}
                autoFocus
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (tempTitle.trim()) onRename(tempTitle.trim());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    if (tempTitle.trim()) onRename(tempTitle.trim());
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.4rem', height: 28 }}
                onClick={() => {
                  setIsEditingTitle(false);
                  if (tempTitle.trim()) onRename(tempTitle.trim());
                }}
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
              <span className="text-element-title" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {title}
              </span>
              {onRename && (
                <button
                  type="button"
                  onClick={() => {
                    setTempTitle(title);
                    setIsEditingTitle(true);
                  }}
                  title="Rename this element"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                >
                  <Edit3 size={12} />
                </button>
              )}
            </div>
          )}

          {linkedFieldLabel && (
            <span
              className="element-placement-badge"
              style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}
              title={`Linked to member field: ${linkedFieldLabel}`}
            >
              <Tag size={10} />
              <span>{linkedFieldLabel}</span>
            </span>
          )}

          {placement && (
            <span className="element-placement-badge">
              {placement.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="text-element-card-header-actions">
          {/* Show / Hide Toggle Switch */}
          {onVisibleChange && (
            <label className="element-toggle-switch" title={visible ? 'Hide this element from profile' : 'Show this element on profile'}>
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => onVisibleChange(e.target.checked)}
              />
              <span>{visible ? <Eye size={14} color="#16A34A" /> : <EyeOff size={14} color="#94A3B8" />}</span>
            </label>
          )}

          <span className="text-element-badge">{currentSize}px</span>

          {/* Remove / Delete Button for Custom Elements */}
          {canRemove && onRemove && (
            <button
              type="button"
              className="btn-remove-element"
              onClick={onRemove}
              title="Delete this custom text element"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Direct Text String Input (if editable) */}
      {isTextEditable && onTextChange && (
        <input
          type="text"
          className="form-input"
          value={textValue || ''}
          placeholder={placeholder}
          onChange={(e) => onTextChange(e.target.value)}
          style={{ marginBottom: '0.875rem' }}
        />
      )}

      {/* Font Size Row: Stepper (-) [Input px] (+) & Range Slider */}
      <div className="font-size-control-row">
        <span className="font-size-label">
          Font Size (Min {minSize}px &bull; Max {maxSize}px)
        </span>
        <div className="font-size-stepper-control">
          <button
            type="button"
            className="btn-stepper"
            disabled={currentSize <= minSize}
            onClick={() => onFontSizeChange(Math.max(minSize, currentSize - 1))}
            title={`Decrease font size (Min ${minSize}px)`}
          >
            <Minus size={14} />
          </button>

          <div className="stepper-input-container">
            <input
              type="number"
              min={minSize}
              max={maxSize}
              value={currentSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onFontSizeChange(Math.min(maxSize, Math.max(minSize, val)));
                }
              }}
              className="stepper-num-input"
            />
            <span className="stepper-unit">px</span>
          </div>

          <button
            type="button"
            className="btn-stepper"
            disabled={currentSize >= maxSize}
            onClick={() => onFontSizeChange(Math.min(maxSize, currentSize + 1))}
            title={`Increase font size (Max ${maxSize}px)`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Font Size Slider */}
      <input
        type="range"
        min={minSize}
        max={maxSize}
        step="1"
        value={currentSize}
        onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
        className="custom-range-slider"
      />

      {/* Typography & Appearance Subcontrols */}
      <div className="element-typo-subcontrols">
        {/* Font Family Selector */}
        {onFontFamilyChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Font Family</span>
            <select
              className="form-input"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 32 }}
              value={currentFamily}
              onChange={(e) => onFontFamilyChange(e.target.value)}
            >
              <option value="inherit">Inherit Theme Font</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Font Weight */}
        {onFontWeightChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Font Weight</span>
            <div className="pill-options-row" style={{ gap: '0.2rem' }}>
              {[
                { id: '400', label: 'Regular' },
                { id: '500', label: 'Medium' },
                { id: '600', label: 'Semibold' },
                { id: '700', label: 'Bold' }
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`pill-option-btn ${currentWeight === w.id ? 'selected' : ''}`}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                  onClick={() => onFontWeightChange(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Color */}
        {onColorChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Text Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="color"
                className="color-swatch-picker"
                style={{ width: 32, height: 32, borderRadius: 6 }}
                value={currentColor.startsWith('#') ? currentColor : '#0F172A'}
                onChange={(e) => onColorChange(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 32, width: 85 }}
                value={color || ''}
                placeholder={defaultColor}
                onChange={(e) => onColorChange(e.target.value)}
              />
              {color && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.6875rem', height: 32 }}
                  onClick={() => onColorChange('')}
                  title="Reset to default theme color"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Text Alignment */}
        {onTextAlignChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Text Alignment</span>
            <div className="pill-options-row" style={{ gap: '0.25rem' }}>
              {[
                { id: 'left', label: 'Left', icon: AlignLeft },
                { id: 'center', label: 'Center', icon: AlignCenter },
                { id: 'right', label: 'Right', icon: AlignRight }
              ].map((align) => {
                const IconComponent = align.icon;
                const isSelected = (textAlign || 'left') === align.id;
                return (
                  <button
                    key={align.id}
                    type="button"
                    className={`pill-option-btn ${isSelected ? 'selected' : ''}`}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => onTextAlignChange(align.id)}
                    title={`${align.label} align`}
                  >
                    <IconComponent size={13} />
                    <span>{align.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Line Height */}
        {onLineHeightChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Line Height ({currentLineHeight})</span>
            <div className="pill-options-row" style={{ gap: '0.2rem' }}>
              {[
                { id: 1.1, label: '1.1' },
                { id: 1.25, label: '1.25' },
                { id: 1.35, label: '1.35' },
                { id: 1.5, label: '1.5' }
              ].map((lh) => (
                <button
                  key={lh.id}
                  type="button"
                  className={`pill-option-btn ${currentLineHeight === lh.id ? 'selected' : ''}`}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                  onClick={() => onLineHeightChange(lh.id)}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Letter Spacing */}
        {onLetterSpacingChange && (
          <div className="subcontrol-item">
            <span className="subcontrol-label">Letter Spacing</span>
            <div className="pill-options-row" style={{ gap: '0.2rem' }}>
              {[
                { id: '-0.5px', label: 'Tight' },
                { id: '0px', label: 'Normal' },
                { id: '0.5px', label: 'Wide' },
                { id: '1px', label: 'Wider' }
              ].map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className={`pill-option-btn ${currentSpacing === sp.id ? 'selected' : ''}`}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                  onClick={() => onLetterSpacingChange(sp.id)}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Placement Position (for custom elements) */}
        {onPlacementChange && placement && (
          <div className="subcontrol-item" style={{ gridColumn: '1 / -1' }}>
            <span className="subcontrol-label">Profile Placement</span>
            <div className="pill-options-row" style={{ gap: '0.25rem' }}>
              {[
                { id: 'header', label: 'Header' },
                { id: 'above_fields', label: 'Above Fields' },
                { id: 'below_fields', label: 'Below Fields' },
                { id: 'footer', label: 'Footer' }
              ].map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  className={`pill-option-btn ${placement === pl.id ? 'selected' : ''}`}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => onPlacementChange(pl.id)}
                >
                  {pl.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QRProfileDesignPage = () => {
  const [activeTab, setActiveTab] = useState('texts'); // Default to Text Customizer as requested
  const [textFilter, setTextFilter] = useState('all');
  const [viewport, setViewport] = useState('desktop');
  const [design, setDesign] = useState(null);
  const [initialDraft, setInitialDraft] = useState(null);
  const [lastPublishedAt, setLastPublishedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sampleIsActive, setSampleIsActive] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Available member fields from Manage Fields
  const [availableFields, setAvailableFields] = useState([]);

  // "+ Add Text" Modal State
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [newTextType, setNewTextType] = useState('custom'); // 'custom' | 'field'
  const [newTextTitle, setNewTextTitle] = useState('');
  const [newTextContent, setNewTextContent] = useState('');
  const [newTextLinkedFieldKey, setNewTextLinkedFieldKey] = useState('');
  const [newTextPlacement, setNewTextPlacement] = useState('above_fields');
  const [newTextFontSize, setNewTextFontSize] = useState(14);
  const [newTextFontWeight, setNewTextFontWeight] = useState('500');
  const [newTextColor, setNewTextColor] = useState('#0F172A');
  const [newTextAlignment, setNewTextAlignment] = useState('left');

  const logoFileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const { showSuccess, showError } = useToast();

  // Load design and available fields on mount
  useEffect(() => {
    fetchDesignSettings();
    fetchAvailableFields();
  }, []);

  const fetchDesignSettings = async () => {
    setLoading(true);
    try {
      const res = await designService.getDesignSettings();
      if (res.success && res.data) {
        const loadedDesign = res.data.draft || res.data.published || {};
        setDesign(loadedDesign);
        setInitialDraft(JSON.stringify(loadedDesign));
        setLastPublishedAt(res.data.lastPublishedAt);
        setIsDirty(false);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load profile design settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableFields = async () => {
    try {
      const res = await fieldService.getFields();
      if (res.success && Array.isArray(res.data)) {
        setAvailableFields(res.data);
      }
    } catch (err) {
      console.warn('Could not load dynamic fields list:', err);
    }
  };

  // Helper to deep update design properties
  const updateDesignField = (path, value) => {
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      const keys = path.split('.');
      let current = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }
      current[keys[keys.length - 1]] = value;

      // Track dirty state
      if (initialDraft) {
        setIsDirty(JSON.stringify(clone) !== initialDraft);
      } else {
        setIsDirty(true);
      }

      return clone;
    });
  };

  // Helper to update specific textElement
  const updateTextElement = (key, prop, value) => {
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      if (!clone.textElements) clone.textElements = {};
      if (!clone.textElements[key]) clone.textElements[key] = {};
      clone.textElements[key][prop] = value;

      // Sync legacy branding properties if applicable
      if (key === 'orgName') {
        if (!clone.branding) clone.branding = {};
        if (prop === 'text') clone.branding.orgName = value;
        if (prop === 'fontSize') clone.branding.orgNameFontSize = value;
        if (prop === 'fontWeight') clone.branding.orgNameFontWeight = value;
        if (prop === 'letterSpacing') clone.branding.orgNameLetterSpacing = value;
        if (prop === 'lineHeight') clone.branding.orgNameLineHeight = value;
      } else if (key === 'pageTitle') {
        if (!clone.branding) clone.branding = {};
        if (prop === 'text') clone.branding.pageTitle = value;
        if (prop === 'fontSize') clone.branding.pageTitleFontSize = value;
        if (prop === 'fontWeight') clone.branding.pageTitleFontWeight = value;
        if (prop === 'letterSpacing') clone.branding.pageTitleLetterSpacing = value;
        if (prop === 'lineHeight') clone.branding.pageTitleLineHeight = value;
      } else if (key === 'subtitle') {
        if (!clone.branding) clone.branding = {};
        if (prop === 'text') clone.branding.subtitle = value;
        if (prop === 'fontSize') clone.branding.subtitleFontSize = value;
        if (prop === 'fontWeight') clone.branding.subtitleFontWeight = value;
        if (prop === 'letterSpacing') clone.branding.subtitleLetterSpacing = value;
        if (prop === 'lineHeight') clone.branding.subtitleLineHeight = value;
      }

      if (initialDraft) {
        setIsDirty(JSON.stringify(clone) !== initialDraft);
      } else {
        setIsDirty(true);
      }
      return clone;
    });
  };

  // Helper to update custom text item
  const updateCustomText = (id, prop, value) => {
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(clone.customTexts)) clone.customTexts = [];
      const item = clone.customTexts.find((t) => t.id === id);
      if (item) {
        item[prop] = value;
      }
      if (initialDraft) {
        setIsDirty(JSON.stringify(clone) !== initialDraft);
      } else {
        setIsDirty(true);
      }
      return clone;
    });
  };

  // Add new Custom Text Element (saves ONLY in ProfileDesign)
  const handleAddTextSubmit = (e) => {
    e.preventDefault();

    const title = newTextTitle.trim() || (newTextType === 'field'
      ? (availableFields.find((f) => f.fieldKey === newTextLinkedFieldKey)?.fieldLabel || 'Member Field')
      : 'Custom Note');

    const newId = `ct_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newElement = {
      id: newId,
      title,
      content: newTextType === 'custom' ? newTextContent.trim() : '',
      linkedFieldKey: newTextType === 'field' ? newTextLinkedFieldKey : '',
      placement: newTextPlacement || 'above_fields',
      visible: true,
      fontSize: Number(newTextFontSize) || 14,
      minSize: 10,
      maxSize: 48,
      fontWeight: newTextFontWeight || '500',
      color: newTextColor || '#0F172A',
      textAlign: newTextAlignment || 'left',
      lineHeight: 1.35,
      letterSpacing: '0px',
      fontFamily: ''
    };

    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(clone.customTexts)) clone.customTexts = [];
      clone.customTexts.push(newElement);
      setIsDirty(true);
      return clone;
    });

    setShowAddTextModal(false);
    setNewTextTitle('');
    setNewTextContent('');
    setNewTextLinkedFieldKey('');
    setSelectedElementId(newId);
    showSuccess('New text element added to profile design.');
  };

  // Delete a custom text element
  const handleRemoveCustomText = (id) => {
    if (!window.confirm('Remove this custom text element from the profile design?')) {
      return;
    }
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      if (Array.isArray(clone.customTexts)) {
        clone.customTexts = clone.customTexts.filter((t) => t.id !== id);
      }
      setIsDirty(true);
      return clone;
    });
    if (selectedElementId === id) setSelectedElementId(null);
    showSuccess('Text element removed.');
  };

  // Toggle individual field visibility (Designation/Transport Company, Blood Group, Mobile, Emirates ID, etc.)
  const toggleFieldVisibility = (fieldKey) => {
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      if (!clone.fieldDisplay) clone.fieldDisplay = {};
      if (!Array.isArray(clone.fieldDisplay.hiddenFields)) clone.fieldDisplay.hiddenFields = [];

      const isHidden = clone.fieldDisplay.hiddenFields.includes(fieldKey);
      if (isHidden) {
        clone.fieldDisplay.hiddenFields = clone.fieldDisplay.hiddenFields.filter((k) => k !== fieldKey);
      } else {
        clone.fieldDisplay.hiddenFields.push(fieldKey);
      }
      setIsDirty(true);
      return clone;
    });
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await designService.saveDraft(design);
      if (res.success) {
        setInitialDraft(JSON.stringify(design));
        setIsDirty(false);
        showSuccess('Design draft saved successfully.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish Live
  const handlePublish = async () => {
    if (!window.confirm('Publish design live for all member QR codes?')) {
      return;
    }
    setPublishing(true);
    try {
      const res = await designService.publishDesign(design);
      if (res.success) {
        setInitialDraft(JSON.stringify(design));
        setIsDirty(false);
        setLastPublishedAt(res.data?.lastPublishedAt || new Date().toISOString());
        showSuccess('Design published live to all member QR profiles.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to publish design.');
    } finally {
      setPublishing(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm('Reset design settings to official default KTPD theme?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await designService.resetDesign();
      if (res.success && res.data) {
        const restored = res.data.draft || res.data.published;
        setDesign(restored);
        setInitialDraft(JSON.stringify(restored));
        setIsDirty(false);
        setLastPublishedAt(res.data.lastPublishedAt);
        showSuccess('Profile design reset to default.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reset design.');
    } finally {
      setResetting(false);
    }
  };

  // Upload Logo Asset
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/)) {
      showError('Please upload a valid image (PNG, JPEG, WEBP, or SVG).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showError('Image size exceeds 3MB limit.');
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await designService.uploadAsset(file);
      if (res.success && res.fileUrl) {
        updateDesignField('branding.logoUrl', res.fileUrl);
        showSuccess('Logo uploaded.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  // Upload Background Image Asset
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/)) {
      showError('Please upload a valid image.');
      return;
    }

    setUploadingBg(true);
    try {
      const res = await designService.uploadAsset(file);
      if (res.success && res.fileUrl) {
        updateDesignField('background.imageUrl', res.fileUrl);
        updateDesignField('background.type', 'image');
        showSuccess('Background uploaded.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload background.');
    } finally {
      setUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  // Apply color preset
  const applyPreset = (preset) => {
    setDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || {}));
      clone.colors = {
        ...clone.colors,
        ...preset
      };
      if (preset.pageBg && clone.background?.type === 'solid') {
        clone.background.solidColor = preset.pageBg;
      }
      setIsDirty(true);
      return clone;
    });
    showSuccess(`Applied "${preset.name}" color preset.`);
  };

  if (loading) {
    return (
      <div className="design-customizer-page" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <LoadingSpinner text="Loading QR Profile Design Customizer..." />
      </div>
    );
  }

  const d = design || {};
  const branding = d.branding || {};
  const colors = d.colors || {};
  const background = d.background || {};
  const typography = d.typography || {};
  const cardStyle = d.cardStyle || {};
  const idBadge = d.idBadge || {};
  const statusBadge = d.statusBadge || {};
  const memberPhoto = d.memberPhoto || {};
  const fieldDisplay = d.fieldDisplay || {};
  const footer = d.footer || {};
  const textElements = d.textElements || {};
  const customTexts = Array.isArray(d.customTexts) ? d.customTexts : [];
  const hiddenFields = Array.isArray(fieldDisplay.hiddenFields) ? fieldDisplay.hiddenFields : [];

  // Default Built-in Text Element Accessors
  const orgNameEl = textElements.orgName || {};
  const pageTitleEl = textElements.pageTitle || {};
  const subtitleEl = textElements.subtitle || {};
  const memberNameEl = textElements.memberName || {};
  const memberIdEl = textElements.memberId || {};
  const statusTextEl = textElements.statusText || {};
  const sectionHeadingEl = textElements.sectionHeading || {};
  const fieldLabelsEl = textElements.fieldLabels || {};
  const fieldValuesEl = textElements.fieldValues || {};
  const footerTextEl = textElements.footerText || {};
  const securityBadgeTextEl = textElements.securityBadgeText || {};

  return (
    <div className="design-customizer-page">
      {/* Top Header */}
      <div className="customizer-header">
        <div className="customizer-title-area">
          <h1>
            <Palette size={26} color="var(--primary)" />
            <span>QR Public Profile Design Customizer</span>
          </h1>
          <p>
            Fully customize all text elements, font sizes, weights, colors, show/hide, or add new custom text &amp; fields.
          </p>
        </div>

        <div className="customizer-actions">
          {/* Status Indicator */}
          {isDirty ? (
            <span className="customizer-status-pill status-dirty">
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#B45309' }} />
              Unsaved Changes
            </span>
          ) : lastPublishedAt ? (
            <span className="customizer-status-pill status-published">
              <CheckCircle2 size={13} />
              Published ({new Date(lastPublishedAt).toLocaleDateString()})
            </span>
          ) : (
            <span className="customizer-status-pill status-saved">
              <Check size={13} />
              Draft Saved
            </span>
          )}

          {/* Reset */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={resetting || savingDraft || publishing}
            title="Reset design to default official KTPD theme"
          >
            <RotateCcw size={15} />
            <span>{resetting ? 'Resetting...' : 'Reset'}</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing || !isDirty}
            title="Save as working draft without affecting live member QR scans"
          >
            <Save size={15} />
            <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {/* Publish Design */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={publishing || savingDraft}
            style={{ fontWeight: 700 }}
            title="Publish live to all member QR profiles"
          >
            <UploadCloud size={16} />
            <span>{publishing ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls Left, Live Preview Right */}
      <div className="customizer-grid">
        {/* ================= LEFT CONTROLS PANEL ================= */}
        <div className="customizer-controls-panel">
          {/* Main Navigation Tabs */}
          <div className="customizer-tabs">
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'texts' ? 'active' : ''}`}
              onClick={() => setActiveTab('texts')}
            >
              <Type size={16} />
              <span>Text Elements</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Layout size={16} />
              <span>Templates</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
              onClick={() => setActiveTab('branding')}
            >
              <Sparkles size={16} />
              <span>Branding</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'colors' ? 'active' : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              <Palette size={16} />
              <span>Colors</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'background' ? 'active' : ''}`}
              onClick={() => setActiveTab('background')}
            >
              <ImageIcon size={16} />
              <span>Background</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
              onClick={() => setActiveTab('card')}
            >
              <Layers size={16} />
              <span>Card &amp; Badges</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
              onClick={() => setActiveTab('fields')}
            >
              <Sliders size={16} />
              <span>Fields &amp; Footer</span>
            </button>
          </div>

          <div className="customizer-tab-content">
            {/* ---------------- 1. TEXT ELEMENTS & TYPOGRAPHY TAB (PRIMARY) ---------------- */}
            {activeTab === 'texts' && (
              <div>
                {/* Header Action Bar */}
                <div className="text-elements-manager-header">
                  <div>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                      Profile Text Customizer
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Adjust size, font, color, alignment, or show/hide any text element.
                    </p>
                  </div>

                  {/* "+ Add Text" Button */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8125rem', fontWeight: 600 }}
                    onClick={() => {
                      setNewTextType('custom');
                      setNewTextTitle('');
                      setNewTextContent('');
                      setNewTextLinkedFieldKey('');
                      setShowAddTextModal(true);
                    }}
                  >
                    <Plus size={15} />
                    <span>+ Add Text</span>
                  </button>
                </div>

                {/* Filter Bar */}
                <div className="text-elements-filter-bar">
                  {[
                    { id: 'all', label: 'All Elements' },
                    { id: 'header', label: 'Header & Brand' },
                    { id: 'hero', label: 'Member Hero & ID' },
                    { id: 'fields', label: 'Fields & Section' },
                    { id: 'footer', label: 'Footer & Notice' },
                    { id: 'custom', label: `Custom Texts (${customTexts.length})` }
                  ].map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      className={`text-filter-btn ${textFilter === flt.id ? 'active' : ''}`}
                      onClick={() => setTextFilter(flt.id)}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>

                {/* ================= SECTION A: HEADER & BRAND TEXTS ================= */}
                {(textFilter === 'all' || textFilter === 'header') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      Header &amp; Brand Elements
                    </div>

                    {/* 1. Organization Name */}
                    <TextElementCustomizerCard
                      id="orgName"
                      title="Organization Name"
                      textValue={orgNameEl.text !== undefined ? orgNameEl.text : branding.orgName || ''}
                      onTextChange={(val) => updateTextElement('orgName', 'text', val)}
                      placeholder="e.g. KTPD Drivers Association"
                      visible={orgNameEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('orgName', 'visible', val)}
                      fontSize={orgNameEl.fontSize || branding.orgNameFontSize || 24}
                      defaultSize={24}
                      minSize={12}
                      maxSize={48}
                      onFontSizeChange={(val) => updateTextElement('orgName', 'fontSize', val)}
                      fontWeight={orgNameEl.fontWeight || branding.orgNameFontWeight || '700'}
                      onFontWeightChange={(val) => updateTextElement('orgName', 'fontWeight', val)}
                      color={orgNameEl.color}
                      defaultColor="#FFFFFF"
                      onColorChange={(val) => updateTextElement('orgName', 'color', val)}
                      textAlign={orgNameEl.textAlign || branding.headerTextAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('orgName', 'textAlign', val)}
                      letterSpacing={orgNameEl.letterSpacing || branding.orgNameLetterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('orgName', 'letterSpacing', val)}
                      lineHeight={orgNameEl.lineHeight || branding.orgNameLineHeight || 1.25}
                      onLineHeightChange={(val) => updateTextElement('orgName', 'lineHeight', val)}
                      fontFamily={orgNameEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('orgName', 'fontFamily', val)}
                      isSelected={selectedElementId === 'orgName'}
                    />

                    {/* 2. Profile Page Title */}
                    <TextElementCustomizerCard
                      id="pageTitle"
                      title="Profile Page Title"
                      textValue={pageTitleEl.text !== undefined ? pageTitleEl.text : branding.pageTitle || ''}
                      onTextChange={(val) => updateTextElement('pageTitle', 'text', val)}
                      placeholder="e.g. Official Digital Verification"
                      visible={pageTitleEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('pageTitle', 'visible', val)}
                      fontSize={pageTitleEl.fontSize || branding.pageTitleFontSize || 28}
                      defaultSize={28}
                      minSize={14}
                      maxSize={56}
                      onFontSizeChange={(val) => updateTextElement('pageTitle', 'fontSize', val)}
                      fontWeight={pageTitleEl.fontWeight || branding.pageTitleFontWeight || '600'}
                      onFontWeightChange={(val) => updateTextElement('pageTitle', 'fontWeight', val)}
                      color={pageTitleEl.color}
                      defaultColor="#BFDBFE"
                      onColorChange={(val) => updateTextElement('pageTitle', 'color', val)}
                      textAlign={pageTitleEl.textAlign || branding.headerTextAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('pageTitle', 'textAlign', val)}
                      letterSpacing={pageTitleEl.letterSpacing || branding.pageTitleLetterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('pageTitle', 'letterSpacing', val)}
                      lineHeight={pageTitleEl.lineHeight || branding.pageTitleLineHeight || 1.25}
                      onLineHeightChange={(val) => updateTextElement('pageTitle', 'lineHeight', val)}
                      fontFamily={pageTitleEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('pageTitle', 'fontFamily', val)}
                      isSelected={selectedElementId === 'pageTitle'}
                    />

                    {/* 3. Subtitle / Chapter Tagline */}
                    <TextElementCustomizerCard
                      id="subtitle"
                      title="Subtitle / Chapter Tagline"
                      textValue={subtitleEl.text !== undefined ? subtitleEl.text : branding.subtitle || ''}
                      onTextChange={(val) => updateTextElement('subtitle', 'text', val)}
                      placeholder="e.g. UAE Chapter • Kerala Transport Drivers Association"
                      visible={subtitleEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('subtitle', 'visible', val)}
                      fontSize={subtitleEl.fontSize || branding.subtitleFontSize || 16}
                      defaultSize={16}
                      minSize={10}
                      maxSize={32}
                      onFontSizeChange={(val) => updateTextElement('subtitle', 'fontSize', val)}
                      fontWeight={subtitleEl.fontWeight || branding.subtitleFontWeight || '500'}
                      onFontWeightChange={(val) => updateTextElement('subtitle', 'fontWeight', val)}
                      color={subtitleEl.color}
                      defaultColor="#93C5FD"
                      onColorChange={(val) => updateTextElement('subtitle', 'color', val)}
                      textAlign={subtitleEl.textAlign || branding.headerTextAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('subtitle', 'textAlign', val)}
                      letterSpacing={subtitleEl.letterSpacing || branding.subtitleLetterSpacing || '0.5px'}
                      onLetterSpacingChange={(val) => updateTextElement('subtitle', 'letterSpacing', val)}
                      lineHeight={subtitleEl.lineHeight || branding.subtitleLineHeight || 1.35}
                      onLineHeightChange={(val) => updateTextElement('subtitle', 'lineHeight', val)}
                      fontFamily={subtitleEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('subtitle', 'fontFamily', val)}
                      isSelected={selectedElementId === 'subtitle'}
                    />
                  </div>
                )}

                {/* ================= SECTION B: MEMBER HERO & ID ================= */}
                {(textFilter === 'all' || textFilter === 'hero') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      Member Hero &amp; Identification Elements
                    </div>

                    {/* 4. Member Name */}
                    <TextElementCustomizerCard
                      id="memberName"
                      title="Member Display Name"
                      isTextEditable={false}
                      placeholder="Rendered dynamically from Member record"
                      visible={memberNameEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('memberName', 'visible', val)}
                      fontSize={memberNameEl.fontSize || 24}
                      defaultSize={24}
                      minSize={14}
                      maxSize={48}
                      onFontSizeChange={(val) => updateTextElement('memberName', 'fontSize', val)}
                      fontWeight={memberNameEl.fontWeight || typography.fontWeight || '700'}
                      onFontWeightChange={(val) => updateTextElement('memberName', 'fontWeight', val)}
                      color={memberNameEl.color}
                      defaultColor={colors.headingColor || '#0F172A'}
                      onColorChange={(val) => updateTextElement('memberName', 'color', val)}
                      textAlign={memberNameEl.textAlign || typography.textAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('memberName', 'textAlign', val)}
                      letterSpacing={memberNameEl.letterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('memberName', 'letterSpacing', val)}
                      lineHeight={memberNameEl.lineHeight || 1.25}
                      onLineHeightChange={(val) => updateTextElement('memberName', 'lineHeight', val)}
                      fontFamily={memberNameEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('memberName', 'fontFamily', val)}
                      isSelected={selectedElementId === 'memberName'}
                    />

                    {/* 5. KTPD Number (ID Badge) */}
                    <TextElementCustomizerCard
                      id="memberId"
                      title="KTPD Number (Membership ID Badge)"
                      isTextEditable={false}
                      placeholder="Rendered dynamically from Member ID"
                      visible={memberIdEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('memberId', 'visible', val)}
                      fontSize={memberIdEl.fontSize || 15}
                      defaultSize={15}
                      minSize={11}
                      maxSize={32}
                      onFontSizeChange={(val) => updateTextElement('memberId', 'fontSize', val)}
                      fontWeight={memberIdEl.fontWeight || '700'}
                      onFontWeightChange={(val) => updateTextElement('memberId', 'fontWeight', val)}
                      color={memberIdEl.color}
                      defaultColor={colors.primary || '#1D4ED8'}
                      onColorChange={(val) => updateTextElement('memberId', 'color', val)}
                      textAlign={memberIdEl.textAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('memberId', 'textAlign', val)}
                      letterSpacing={memberIdEl.letterSpacing || '0.5px'}
                      onLetterSpacingChange={(val) => updateTextElement('memberId', 'letterSpacing', val)}
                      lineHeight={memberIdEl.lineHeight || 1.2}
                      onLineHeightChange={(val) => updateTextElement('memberId', 'lineHeight', val)}
                      fontFamily={memberIdEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('memberId', 'fontFamily', val)}
                      isSelected={selectedElementId === 'memberId'}
                    />

                    {/* 6. Membership Status Text */}
                    <TextElementCustomizerCard
                      id="statusText"
                      title="Status Banner / Pill Text"
                      isTextEditable={false}
                      placeholder="Dynamic based on member status (Active / Inactive)"
                      visible={statusTextEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('statusText', 'visible', val)}
                      fontSize={statusTextEl.fontSize || 13}
                      defaultSize={13}
                      minSize={10}
                      maxSize={24}
                      onFontSizeChange={(val) => updateTextElement('statusText', 'fontSize', val)}
                      fontWeight={statusTextEl.fontWeight || '600'}
                      onFontWeightChange={(val) => updateTextElement('statusText', 'fontWeight', val)}
                      color={statusTextEl.color}
                      defaultColor={colors.activeStatusText || '#15803D'}
                      onColorChange={(val) => updateTextElement('statusText', 'color', val)}
                      textAlign={statusTextEl.textAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('statusText', 'textAlign', val)}
                      letterSpacing={statusTextEl.letterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('statusText', 'letterSpacing', val)}
                      lineHeight={statusTextEl.lineHeight || 1.2}
                      onLineHeightChange={(val) => updateTextElement('statusText', 'lineHeight', val)}
                      fontFamily={statusTextEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('statusText', 'fontFamily', val)}
                      isSelected={selectedElementId === 'statusText'}
                    />
                  </div>
                )}

                {/* ================= SECTION C: FIELDS & SECTION TEXTS ================= */}
                {(textFilter === 'all' || textFilter === 'fields') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      Card Section &amp; Field Attributes
                    </div>

                    {/* 7. Section Heading */}
                    <TextElementCustomizerCard
                      id="sectionHeading"
                      title="Section Heading Text"
                      textValue={sectionHeadingEl.text !== undefined ? sectionHeadingEl.text : 'Member Information'}
                      onTextChange={(val) => updateTextElement('sectionHeading', 'text', val)}
                      placeholder="e.g. Member Information or Driver Details"
                      visible={sectionHeadingEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('sectionHeading', 'visible', val)}
                      fontSize={sectionHeadingEl.fontSize || 16}
                      defaultSize={16}
                      minSize={12}
                      maxSize={32}
                      onFontSizeChange={(val) => updateTextElement('sectionHeading', 'fontSize', val)}
                      fontWeight={sectionHeadingEl.fontWeight || '600'}
                      onFontWeightChange={(val) => updateTextElement('sectionHeading', 'fontWeight', val)}
                      color={sectionHeadingEl.color}
                      defaultColor={colors.primary || '#1D4ED8'}
                      onColorChange={(val) => updateTextElement('sectionHeading', 'color', val)}
                      textAlign={sectionHeadingEl.textAlign || 'left'}
                      onTextAlignChange={(val) => updateTextElement('sectionHeading', 'textAlign', val)}
                      letterSpacing={sectionHeadingEl.letterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('sectionHeading', 'letterSpacing', val)}
                      lineHeight={sectionHeadingEl.lineHeight || 1.3}
                      onLineHeightChange={(val) => updateTextElement('sectionHeading', 'lineHeight', val)}
                      fontFamily={sectionHeadingEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('sectionHeading', 'fontFamily', val)}
                      isSelected={selectedElementId === 'sectionHeading'}
                    />

                    {/* 8. Field Labels */}
                    <TextElementCustomizerCard
                      id="fieldLabels"
                      title="Field Labels (All Attribute Titles)"
                      isTextEditable={false}
                      placeholder="Controls all field title labels"
                      visible={fieldLabelsEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('fieldLabels', 'visible', val)}
                      fontSize={fieldLabelsEl.fontSize || 12}
                      defaultSize={12}
                      minSize={10}
                      maxSize={22}
                      onFontSizeChange={(val) => updateTextElement('fieldLabels', 'fontSize', val)}
                      fontWeight={fieldLabelsEl.fontWeight || '600'}
                      onFontWeightChange={(val) => updateTextElement('fieldLabels', 'fontWeight', val)}
                      color={fieldLabelsEl.color}
                      defaultColor={colors.labelColor || '#64748B'}
                      onColorChange={(val) => updateTextElement('fieldLabels', 'color', val)}
                      textAlign={fieldLabelsEl.textAlign || 'left'}
                      onTextAlignChange={(val) => updateTextElement('fieldLabels', 'textAlign', val)}
                      letterSpacing={fieldLabelsEl.letterSpacing || '0.5px'}
                      onLetterSpacingChange={(val) => updateTextElement('fieldLabels', 'letterSpacing', val)}
                      lineHeight={fieldLabelsEl.lineHeight || 1.2}
                      onLineHeightChange={(val) => updateTextElement('fieldLabels', 'lineHeight', val)}
                      fontFamily={fieldLabelsEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('fieldLabels', 'fontFamily', val)}
                      isSelected={selectedElementId === 'fieldLabels'}
                    />

                    {/* 9. Field Values */}
                    <TextElementCustomizerCard
                      id="fieldValues"
                      title="Field Values (All Member Attribute Values)"
                      isTextEditable={false}
                      placeholder="Controls all field content values"
                      visible={fieldValuesEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('fieldValues', 'visible', val)}
                      fontSize={fieldValuesEl.fontSize || 14}
                      defaultSize={14}
                      minSize={11}
                      maxSize={26}
                      onFontSizeChange={(val) => updateTextElement('fieldValues', 'fontSize', val)}
                      fontWeight={fieldValuesEl.fontWeight || '500'}
                      onFontWeightChange={(val) => updateTextElement('fieldValues', 'fontWeight', val)}
                      color={fieldValuesEl.color}
                      defaultColor={colors.textPrimary || '#0F172A'}
                      onColorChange={(val) => updateTextElement('fieldValues', 'color', val)}
                      textAlign={fieldValuesEl.textAlign || 'left'}
                      onTextAlignChange={(val) => updateTextElement('fieldValues', 'textAlign', val)}
                      letterSpacing={fieldValuesEl.letterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('fieldValues', 'letterSpacing', val)}
                      lineHeight={fieldValuesEl.lineHeight || 1.35}
                      onLineHeightChange={(val) => updateTextElement('fieldValues', 'lineHeight', val)}
                      fontFamily={fieldValuesEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('fieldValues', 'fontFamily', val)}
                      isSelected={selectedElementId === 'fieldValues'}
                    />

                    {/* Individual Field Show/Hide Manager */}
                    <div className="control-group" style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div className="control-label" style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700 }}>Individual Member Field Visibility</span>
                        <span className="control-hint">Toggle specific fields on or off the public profile</span>
                      </div>

                      <div className="field-visibility-grid">
                        {[
                          { key: 'transportCompany', label: 'Transport Company / Designation' },
                          { key: 'bloodGroup', label: 'Blood Group' },
                          { key: 'mobileNo', label: 'Mobile Number' },
                          { key: 'emiratesId', label: 'Emirates ID' },
                          { key: 'livingArea', label: 'Living Area (UAE)' },
                          { key: 'india', label: 'India Hometown' },
                          { key: 'addressInIndia', label: 'Address in India' },
                          { key: 'emergencyContact', label: 'Emergency Contact' },
                          ...availableFields
                            .filter((f) => !['name', 'memberId', 'transportCompany', 'bloodGroup', 'mobileNo', 'emiratesId', 'livingArea', 'india', 'addressInIndia', 'emergencyContact'].includes(f.fieldKey))
                            .map((f) => ({ key: f.fieldKey, label: f.fieldLabel }))
                        ].map((f) => {
                          const isHidden = hiddenFields.includes(f.key);
                          return (
                            <label key={f.key} className="field-visibility-item">
                              <input
                                type="checkbox"
                                checked={!isHidden}
                                onChange={() => toggleFieldVisibility(f.key)}
                              />
                              <span style={{ flex: 1, color: isHidden ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                {f.label}
                              </span>
                              {isHidden && <EyeOff size={13} color="var(--text-muted)" />}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SECTION D: FOOTER & SECURITY NOTICE ================= */}
                {(textFilter === 'all' || textFilter === 'footer') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      Footer &amp; Security Elements
                    </div>

                    {/* 10. Footer Notice Text */}
                    <TextElementCustomizerCard
                      id="footerText"
                      title="Footer Verification Notice"
                      textValue={footerTextEl.text !== undefined ? footerTextEl.text : footer.text || ''}
                      onTextChange={(val) => {
                        updateTextElement('footerText', 'text', val);
                        updateDesignField('footer.text', val);
                      }}
                      placeholder="e.g. This digital card is cryptographically verified against the KTPD Database."
                      visible={footerTextEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('footerText', 'visible', val)}
                      fontSize={footerTextEl.fontSize || 12}
                      defaultSize={12}
                      minSize={9}
                      maxSize={22}
                      onFontSizeChange={(val) => updateTextElement('footerText', 'fontSize', val)}
                      fontWeight={footerTextEl.fontWeight || '400'}
                      onFontWeightChange={(val) => updateTextElement('footerText', 'fontWeight', val)}
                      color={footerTextEl.color}
                      defaultColor={colors.textSecondary || '#64748B'}
                      onColorChange={(val) => updateTextElement('footerText', 'color', val)}
                      textAlign={footerTextEl.textAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('footerText', 'textAlign', val)}
                      letterSpacing={footerTextEl.letterSpacing || '0px'}
                      onLetterSpacingChange={(val) => updateTextElement('footerText', 'letterSpacing', val)}
                      lineHeight={footerTextEl.lineHeight || 1.4}
                      onLineHeightChange={(val) => updateTextElement('footerText', 'lineHeight', val)}
                      fontFamily={footerTextEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('footerText', 'fontFamily', val)}
                      isSelected={selectedElementId === 'footerText'}
                    />

                    {/* 11. Security Badge Text */}
                    <TextElementCustomizerCard
                      id="securityBadgeText"
                      title="Security Badge Text"
                      textValue={securityBadgeTextEl.text !== undefined ? securityBadgeTextEl.text : footer.securityBadgeText || ''}
                      onTextChange={(val) => {
                        updateTextElement('securityBadgeText', 'text', val);
                        updateDesignField('footer.securityBadgeText', val);
                      }}
                      placeholder="e.g. Permanent Dynamic QR Authentication Active"
                      visible={securityBadgeTextEl.visible !== false}
                      onVisibleChange={(val) => updateTextElement('securityBadgeText', 'visible', val)}
                      fontSize={securityBadgeTextEl.fontSize || 11}
                      defaultSize={11}
                      minSize={9}
                      maxSize={20}
                      onFontSizeChange={(val) => updateTextElement('securityBadgeText', 'fontSize', val)}
                      fontWeight={securityBadgeTextEl.fontWeight || '600'}
                      onFontWeightChange={(val) => updateTextElement('securityBadgeText', 'fontWeight', val)}
                      color={securityBadgeTextEl.color}
                      defaultColor="#16A34A"
                      onColorChange={(val) => updateTextElement('securityBadgeText', 'color', val)}
                      textAlign={securityBadgeTextEl.textAlign || 'center'}
                      onTextAlignChange={(val) => updateTextElement('securityBadgeText', 'textAlign', val)}
                      letterSpacing={securityBadgeTextEl.letterSpacing || '0.25px'}
                      onLetterSpacingChange={(val) => updateTextElement('securityBadgeText', 'letterSpacing', val)}
                      lineHeight={securityBadgeTextEl.lineHeight || 1.2}
                      onLineHeightChange={(val) => updateTextElement('securityBadgeText', 'lineHeight', val)}
                      fontFamily={securityBadgeTextEl.fontFamily}
                      onFontFamilyChange={(val) => updateTextElement('securityBadgeText', 'fontFamily', val)}
                      isSelected={selectedElementId === 'securityBadgeText'}
                    />
                  </div>
                )}

                {/* ================= SECTION E: CUSTOM TEXT ELEMENTS ================= */}
                {(textFilter === 'all' || textFilter === 'custom') && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Custom Profile Text Items ({customTexts.length})
                      </span>
                    </div>

                    {customTexts.length === 0 ? (
                      <div
                        style={{
                          padding: '2rem 1rem',
                          textAlign: 'center',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <Type size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                        <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>No custom text elements added yet.</p>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Click "+ Add Text" to add custom notices, instructions, or link fields from Manage Fields.
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setNewTextType('custom');
                            setNewTextTitle('');
                            setNewTextContent('');
                            setNewTextLinkedFieldKey('');
                            setShowAddTextModal(true);
                          }}
                        >
                          <Plus size={14} />
                          <span>+ Add Text Now</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {customTexts.map((item) => {
                          const linkedDef = item.linkedFieldKey
                            ? availableFields.find((f) => f.fieldKey === item.linkedFieldKey)
                            : null;
                          return (
                            <TextElementCustomizerCard
                              key={item.id}
                              id={item.id}
                              title={item.title || 'Custom Text'}
                              onRename={(newTitle) => updateCustomText(item.id, 'title', newTitle)}
                              textValue={item.content || ''}
                              onTextChange={!item.linkedFieldKey ? (val) => updateCustomText(item.id, 'content', val) : undefined}
                              isTextEditable={!item.linkedFieldKey}
                              placeholder="Enter custom text content..."
                              visible={item.visible !== false}
                              onVisibleChange={(val) => updateCustomText(item.id, 'visible', val)}
                              canRemove={true}
                              onRemove={() => handleRemoveCustomText(item.id)}
                              placement={item.placement || 'above_fields'}
                              onPlacementChange={(val) => updateCustomText(item.id, 'placement', val)}
                              fontSize={item.fontSize || 14}
                              defaultSize={14}
                              minSize={10}
                              maxSize={48}
                              onFontSizeChange={(val) => updateCustomText(item.id, 'fontSize', val)}
                              fontWeight={item.fontWeight || '500'}
                              onFontWeightChange={(val) => updateCustomText(item.id, 'fontWeight', val)}
                              color={item.color}
                              defaultColor="#0F172A"
                              onColorChange={(val) => updateCustomText(item.id, 'color', val)}
                              textAlign={item.textAlign || 'left'}
                              onTextAlignChange={(val) => updateCustomText(item.id, 'textAlign', val)}
                              letterSpacing={item.letterSpacing || '0px'}
                              onLetterSpacingChange={(val) => updateCustomText(item.id, 'letterSpacing', val)}
                              lineHeight={item.lineHeight || 1.35}
                              onLineHeightChange={(val) => updateCustomText(item.id, 'lineHeight', val)}
                              fontFamily={item.fontFamily}
                              onFontFamilyChange={(val) => updateCustomText(item.id, 'fontFamily', val)}
                              isSelected={selectedElementId === item.id}
                              linkedFieldLabel={linkedDef ? linkedDef.fieldLabel : (item.linkedFieldKey || undefined)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- 2. TEMPLATES TAB ---------------- */}
            {activeTab === 'templates' && (
              <div>
                <div className="control-group">
                  <div className="control-label">
                    <span>Select Profile Card Template</span>
                    <span className="control-hint">5 distinct layout architectures</span>
                  </div>
                  <div className="template-cards-grid">
                    {TEMPLATES.map((tmpl) => {
                      const isSelected = (d.template || 'modern') === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          className={`template-card-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => updateDesignField('template', tmpl.id)}
                        >
                          {isSelected && (
                            <div className="template-card-badge">
                              <Check size={12} />
                            </div>
                          )}
                          <div className="template-card-icon">
                            <Layout size={22} />
                          </div>
                          <div className="template-card-name">{tmpl.name}</div>
                          <div className="template-card-desc">{tmpl.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <strong style={{ color: 'var(--text-primary)' }}>Notice:</strong> Switching templates preserves all your
                  custom branding, logos, color choices, and custom field visibility.
                </div>
              </div>
            )}

            {/* ---------------- 3. BRANDING TAB ---------------- */}
            {activeTab === 'branding' && (
              <div>
                {/* Logo Upload & Controls */}
                <div className="control-group">
                  <div className="control-label">
                    <span>KTPD Emblem / Logo</span>
                    <span className="control-hint">PNG, JPG, SVG or WEBP (Max 3MB)</span>
                  </div>
                  <div className="logo-upload-wrapper">
                    <div className="logo-preview-box">
                      <img src={getAssetUrl(branding.logoUrl || '/ktpd-logo.svg')} alt="Logo Preview" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLogoUpload}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                          onClick={() => logoFileInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          <Upload size={14} />
                          <span>{uploadingLogo ? 'Uploading...' : 'Upload New Logo'}</span>
                        </button>
                        {branding.logoUrl && branding.logoUrl !== '/ktpd-logo.svg' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', color: 'var(--danger)' }}
                            onClick={() => updateDesignField('branding.logoUrl', '/ktpd-logo.svg')}
                          >
                            <Trash2 size={14} />
                            <span>Reset to Default Logo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Size */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Logo Size ({branding.logoSize || 64}px)</span>
                  </div>
                  <input
                    type="range"
                    min="36"
                    max="120"
                    step="2"
                    value={branding.logoSize || 64}
                    onChange={(e) => updateDesignField('branding.logoSize', parseInt(e.target.value, 10))}
                    className="custom-range-slider"
                  />
                </div>

                {/* Header Layout & Text Alignment */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Header Layout &amp; Alignment</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="pill-options-row">
                      {[
                        { id: 'center', label: 'Centered (Stacked)' },
                        { id: 'left', label: 'Left Aligned' },
                        { id: 'split', label: 'Split (Logo & Title)' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pill-option-btn ${(branding.headerLayout || 'center') === opt.id ? 'selected' : ''}`}
                          onClick={() => updateDesignField('branding.headerLayout', opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Text Align:
                      </span>
                      <div className="pill-options-row" style={{ gap: '0.25rem' }}>
                        {[
                          { id: 'left', label: 'Left', icon: AlignLeft },
                          { id: 'center', label: 'Center', icon: AlignCenter },
                          { id: 'right', label: 'Right', icon: AlignRight }
                        ].map((align) => {
                          const IconComponent = align.icon;
                          const isSelected = (branding.headerTextAlign || 'center') === align.id;
                          return (
                            <button
                              key={align.id}
                              type="button"
                              className={`pill-option-btn ${isSelected ? 'selected' : ''}`}
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                updateDesignField('branding.headerTextAlign', align.id);
                                updateTextElement('orgName', 'textAlign', align.id);
                                updateTextElement('pageTitle', 'textAlign', align.id);
                                updateTextElement('subtitle', 'textAlign', align.id);
                              }}
                            >
                              <IconComponent size={13} />
                              <span>{align.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Link to Text Customizer */}
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Looking for full font size, color, weight and alignment controls for header texts?
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => {
                      setActiveTab('texts');
                      setTextFilter('header');
                    }}
                  >
                    <Type size={13} />
                    <span>Open Text Elements Customizer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 4. COLORS TAB ---------------- */}
            {activeTab === 'colors' && (
              <div>
                {/* Presets */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Quick Color Presets</span>
                    <span className="control-hint">One-click cohesive palettes</span>
                  </div>
                  <div className="pill-options-row">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="pill-option-btn"
                        onClick={() => applyPreset(p)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: p.primary,
                            display: 'inline-block'
                          }}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Color Pickers */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Custom Palette Configuration</span>
                  </div>
                  <div className="color-picker-grid">
                    {[
                      { key: 'colors.primary', label: 'Primary Brand Color', val: colors.primary || '#1D4ED8' },
                      { key: 'colors.secondary', label: 'Secondary / Header', val: colors.secondary || '#0F172A' },
                      { key: 'colors.accent', label: 'Accent Highlight', val: colors.accent || '#3B82F6' },
                      { key: 'colors.cardBg', label: 'Profile Card Background', val: colors.cardBg || '#FFFFFF' },
                      { key: 'colors.headingColor', label: 'Member Name / Headings', val: colors.headingColor || '#0F172A' },
                      { key: 'colors.textPrimary', label: 'Primary Text Color', val: colors.textPrimary || '#0F172A' },
                      { key: 'colors.textSecondary', label: 'Secondary Text Color', val: colors.textSecondary || '#64748B' },
                      { key: 'colors.labelColor', label: 'Field Label Color', val: colors.labelColor || '#64748B' },
                      { key: 'colors.borderColor', label: 'Border / Divider Color', val: colors.borderColor || '#E2E8F0' },
                      { key: 'colors.activeStatusBg', label: 'Active Badge Background', val: colors.activeStatusBg || '#DCFCE7' },
                      { key: 'colors.activeStatusText', label: 'Active Badge Text', val: colors.activeStatusText || '#15803D' },
                      { key: 'colors.inactiveStatusBg', label: 'Inactive Badge Background', val: colors.inactiveStatusBg || '#FEE2E2' },
                      { key: 'colors.inactiveStatusText', label: 'Inactive Badge Text', val: colors.inactiveStatusText || '#991B1B' }
                    ].map((col) => (
                      <div key={col.key} className="color-input-card">
                        <input
                          type="color"
                          className="color-swatch-picker"
                          value={col.val}
                          onChange={(e) => updateDesignField(col.key, e.target.value)}
                        />
                        <div className="color-card-info">
                          <span className="color-card-title">{col.label}</span>
                          <input
                            type="text"
                            className="color-hex-text"
                            value={col.val}
                            onChange={(e) => updateDesignField(col.key, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 5. BACKGROUND TAB ---------------- */}
            {activeTab === 'background' && (
              <div>
                <div className="control-group">
                  <div className="control-label">
                    <span>Background Type</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'gradient', label: 'Linear Gradient' },
                      { id: 'solid', label: 'Solid Color' },
                      { id: 'image', label: 'Custom Wallpaper' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        className={`pill-option-btn ${(background.type || 'gradient') === type.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('background.type', type.id)}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Color */}
                {background.type === 'solid' && (
                  <div className="control-group">
                    <div className="control-label">
                      <span>Solid Page Background Color</span>
                    </div>
                    <div className="color-input-card" style={{ maxWidth: '280px' }}>
                      <input
                        type="color"
                        className="color-swatch-picker"
                        value={background.solidColor || colors.pageBg || '#0F172A'}
                        onChange={(e) => {
                          updateDesignField('background.solidColor', e.target.value);
                          updateDesignField('colors.pageBg', e.target.value);
                        }}
                      />
                      <div className="color-card-info">
                        <span className="color-card-title">Background Color</span>
                        <input
                          type="text"
                          className="color-hex-text"
                          value={background.solidColor || colors.pageBg || '#0F172A'}
                          onChange={(e) => {
                            updateDesignField('background.solidColor', e.target.value);
                            updateDesignField('colors.pageBg', e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Gradient */}
                {background.type !== 'solid' && background.type !== 'image' && (
                  <div>
                    <div className="control-group">
                      <div className="control-label">
                        <span>Gradient Direction / Angle</span>
                      </div>
                      <div className="pill-options-row">
                        {[
                          { id: '135deg', label: 'Diagonal 135°' },
                          { id: '180deg', label: 'Top to Bottom 180°' },
                          { id: '90deg', label: 'Left to Right 90°' },
                          { id: '45deg', label: 'Diagonal 45°' }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`pill-option-btn ${(background.gradientDirection || '135deg') === opt.id ? 'selected' : ''}`}
                            onClick={() => updateDesignField('background.gradientDirection', opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="color-picker-grid" style={{ marginTop: '1rem' }}>
                      <div className="color-input-card">
                        <input
                          type="color"
                          className="color-swatch-picker"
                          value={background.gradientStart || '#0F172A'}
                          onChange={(e) => updateDesignField('background.gradientStart', e.target.value)}
                        />
                        <div className="color-card-info">
                          <span className="color-card-title">Gradient Start Color</span>
                          <input
                            type="text"
                            className="color-hex-text"
                            value={background.gradientStart || '#0F172A'}
                            onChange={(e) => updateDesignField('background.gradientStart', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="color-input-card">
                        <input
                          type="color"
                          className="color-swatch-picker"
                          value={background.gradientEnd || '#1E293B'}
                          onChange={(e) => updateDesignField('background.gradientEnd', e.target.value)}
                        />
                        <div className="color-card-info">
                          <span className="color-card-title">Gradient End Color</span>
                          <input
                            type="text"
                            className="color-hex-text"
                            value={background.gradientEnd || '#1E293B'}
                            onChange={(e) => updateDesignField('background.gradientEnd', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background Image */}
                {background.type === 'image' && (
                  <div>
                    <div className="control-group">
                      <div className="control-label">
                        <span>Background Image</span>
                      </div>
                      <input
                        type="file"
                        ref={bgFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleBgUpload}
                      />
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => bgFileInputRef.current?.click()}
                          disabled={uploadingBg}
                        >
                          <Upload size={14} />
                          <span>{uploadingBg ? 'Uploading Image...' : 'Upload Wallpaper Image'}</span>
                        </button>
                        {background.imageUrl && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => {
                              updateDesignField('background.imageUrl', '');
                              updateDesignField('background.type', 'gradient');
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Remove Image</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {background.imageUrl && (
                      <>
                        <div className="control-group">
                          <div className="control-label">
                            <span>Image Sizing</span>
                          </div>
                          <div className="pill-options-row">
                            {['cover', 'contain', 'auto'].map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                className={`pill-option-btn ${(background.imageSize || 'cover') === sz ? 'selected' : ''}`}
                                onClick={() => updateDesignField('background.imageSize', sz)}
                              >
                                {sz.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="control-group">
                          <div className="control-label">
                            <span>Image Position</span>
                          </div>
                          <div className="pill-options-row">
                            {['center', 'top', 'bottom'].map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                className={`pill-option-btn ${(background.imagePosition || 'center') === pos ? 'selected' : ''}`}
                                onClick={() => updateDesignField('background.imagePosition', pos)}
                              >
                                {pos.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- 6. CARD & BADGES TAB ---------------- */}
            {activeTab === 'card' && (
              <div>
                {/* Card Variant */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Card Surface Style</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'card', label: 'Standard Card' },
                      { id: 'flat', label: 'Flat (Borderless)' },
                      { id: 'bordered', label: 'Bold Bordered' },
                      { id: 'glassmorphic', label: 'Glassmorphic Blur' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(cardStyle.variant || 'card') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('cardStyle.variant', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border Radius */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Card Corner Radius ({cardStyle.borderRadius || '16px'})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    value={parseInt(cardStyle.borderRadius || '16', 10)}
                    onChange={(e) => updateDesignField('cardStyle.borderRadius', `${e.target.value}px`)}
                    className="custom-range-slider"
                  />
                </div>

                {/* Shadow */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Card Shadow Depth</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'subtle', label: 'Subtle' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'elevated', label: 'Elevated (Deep)' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(cardStyle.shadow || 'elevated') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('cardStyle.shadow', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ID Badge Style */}
                <div className="control-group">
                  <div className="control-label">
                    <span>KTPD Membership ID Badge Presentation</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'pill', label: 'Rounded Pill' },
                      { id: 'outlined', label: 'Outlined Box' },
                      { id: 'solid', label: 'Solid Color Block' },
                      { id: 'minimal', label: 'Minimal Text' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(idBadge.style || 'pill') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('idBadge.style', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Badge Style */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Membership Status Badge Presentation</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'banner', label: 'Full-Width Banner Bar' },
                      { id: 'pill', label: 'Compact Pulsing Pill' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(statusBadge.style || 'banner') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('statusBadge.style', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo / Photo Shape */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Logo / Emblem Shape</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'circle', label: 'Circle' },
                      { id: 'rounded', label: 'Rounded Square' },
                      { id: 'square', label: 'Square' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(memberPhoto.shape || 'circle') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('memberPhoto.shape', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field Spacing */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Card Padding &amp; Spacing</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'compact', label: 'Compact' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'spacious', label: 'Spacious' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(cardStyle.fieldSpacing || 'normal') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('cardStyle.fieldSpacing', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 7. FIELDS & FOOTER TAB ---------------- */}
            {activeTab === 'fields' && (
              <div>
                {/* Field Layout */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Member Attributes Layout</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'grid', label: '2-Column Grid' },
                      { id: 'list', label: '1-Column Full Width List' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(fieldDisplay.layout || 'grid') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('fieldDisplay.layout', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label Style */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Field Label Capitalization</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'uppercase', label: 'UPPERCASE' },
                      { id: 'normal', label: 'Normal (Sentence Case)' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(fieldDisplay.labelStyle || 'uppercase') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('fieldDisplay.labelStyle', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field Icons Toggle */}
                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={fieldDisplay.showIcons !== false}
                      onChange={(e) => updateDesignField('fieldDisplay.showIcons', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Show Field Icons (Phone, Heart, Company, Pin)</span>
                  </label>
                </div>

                {/* Dividers */}
                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(cardStyle.showDividers)}
                      onChange={(e) => updateDesignField('cardStyle.showDividers', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enable Field Separator Dividers</span>
                  </label>

                  {cardStyle.showDividers && (
                    <div className="pill-options-row">
                      {[
                        { id: 'solid', label: 'Solid Line' },
                        { id: 'dashed', label: 'Dashed Line' },
                        { id: 'accent', label: 'Primary Accent Line' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pill-option-btn ${(cardStyle.dividerStyle || 'solid') === opt.id ? 'selected' : ''}`}
                          onClick={() => updateDesignField('cardStyle.dividerStyle', opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Notice */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Footer Security Notice</span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={footer.text || ''}
                    placeholder="This digital card is cryptographically verified against the KTPD Database."
                    onChange={(e) => {
                      updateDesignField('footer.text', e.target.value);
                      updateTextElement('footerText', 'text', e.target.value);
                    }}
                  />
                </div>

                {/* Footer Toggles */}
                <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={footer.showSecurityBadge !== false}
                      onChange={(e) => {
                        updateDesignField('footer.showSecurityBadge', e.target.checked);
                        updateTextElement('securityBadgeText', 'visible', e.target.checked);
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Show Official Security Badge</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={footer.showLastUpdated !== false}
                      onChange={(e) => updateDesignField('footer.showLastUpdated', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Show Last Updated Verification Timestamp</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT LIVE PREVIEW PANEL ================= */}
        <div className="customizer-preview-panel">
          {/* Topbar of Live Preview */}
          <div className="preview-topbar">
            <div className="preview-topbar-title">
              <Eye size={15} color="var(--primary)" />
              <span>Real-Time Public Profile Preview</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Sample Member Status Switcher */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 30 }}
                onClick={() => setSampleIsActive((prev) => !prev)}
                title="Toggle member active/inactive status to test badge styles"
              >
                <span>Sample: {sampleIsActive ? 'Active' : 'Inactive'}</span>
              </button>

              {/* Viewport switcher */}
              <div className="preview-viewport-controls">
                <button
                  type="button"
                  className={`preview-viewport-btn ${viewport === 'desktop' ? 'active' : ''}`}
                  onClick={() => setViewport('desktop')}
                  title="Desktop View"
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  className={`preview-viewport-btn ${viewport === 'tablet' ? 'active' : ''}`}
                  onClick={() => setViewport('tablet')}
                  title="Tablet View"
                >
                  <Tablet size={15} />
                </button>
                <button
                  type="button"
                  className={`preview-viewport-btn ${viewport === 'mobile' ? 'active' : ''}`}
                  onClick={() => setViewport('mobile')}
                  title="Mobile View (375px Smartphone)"
                >
                  <Smartphone size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Live Render Stage */}
          <div className="preview-stage-container">
            <ProfileCardView
              member={{
                ...SAMPLE_MEMBER,
                status: sampleIsActive ? 'Active' : 'Inactive'
              }}
              design={d}
              isActive={sampleIsActive}
              isPreview={true}
              viewport={viewport}
              selectedElementId={selectedElementId}
              onSelectElement={(elementId) => {
                setSelectedElementId(elementId);
                setActiveTab('texts');
                // Scroll card into view
                setTimeout(() => {
                  const cardEl = document.getElementById(`element-card-${elementId}`);
                  if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }, 100);
              }}
            />
          </div>
        </div>
      </div>

      {/* ================= "+ ADD TEXT" MODAL DIALOG ================= */}
      {showAddTextModal && (
        <div className="text-customizer-modal-overlay" onClick={() => setShowAddTextModal(false)}>
          <div className="text-customizer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="text-modal-header">
              <h3>
                <FolderPlus size={18} color="var(--primary)" />
                <span>Add Text Element to Profile</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowAddTextModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTextSubmit}>
              <div className="text-modal-body">
                {/* 1. Type Selection */}
                <div className="control-group">
                  <label className="control-label" style={{ fontWeight: 600 }}>Element Type</label>
                  <div className="pill-options-row">
                    <button
                      type="button"
                      className={`pill-option-btn ${newTextType === 'custom' ? 'selected' : ''}`}
                      onClick={() => setNewTextType('custom')}
                    >
                      <Type size={14} />
                      <span>Custom Text / Notice / Advisory</span>
                    </button>
                    <button
                      type="button"
                      className={`pill-option-btn ${newTextType === 'field' ? 'selected' : ''}`}
                      onClick={() => setNewTextType('field')}
                    >
                      <Tag size={14} />
                      <span>Member Field (from Manage Fields)</span>
                    </button>
                  </div>
                </div>

                {/* 2A. Field Picker if 'field' */}
                {newTextType === 'field' && (
                  <div className="control-group">
                    <label className="control-label" style={{ fontWeight: 600 }}>Select Member Field</label>
                    <select
                      className="form-input"
                      value={newTextLinkedFieldKey}
                      onChange={(e) => {
                        const k = e.target.value;
                        setNewTextLinkedFieldKey(k);
                        const match = availableFields.find((f) => f.fieldKey === k);
                        if (match && !newTextTitle) {
                          setNewTextTitle(match.fieldLabel);
                        }
                      }}
                      required
                    >
                      <option value="">-- Choose Field from Manage Fields --</option>
                      <optgroup label="Standard Member Fields">
                        <option value="transportCompany">Transport Company / Designation</option>
                        <option value="bloodGroup">Blood Group</option>
                        <option value="mobileNo">Mobile Number</option>
                        <option value="emiratesId">Emirates ID</option>
                        <option value="livingArea">Living Area (UAE)</option>
                        <option value="india">India Hometown</option>
                        <option value="addressInIndia">Address in India</option>
                        <option value="emergencyContact">Emergency Contact</option>
                      </optgroup>
                      {availableFields.filter((f) => !['name', 'memberId', 'transportCompany', 'bloodGroup', 'mobileNo', 'emiratesId', 'livingArea', 'india', 'addressInIndia', 'emergencyContact'].includes(f.fieldKey)).length > 0 && (
                        <optgroup label="Custom Created Fields">
                          {availableFields
                            .filter((f) => !['name', 'memberId', 'transportCompany', 'bloodGroup', 'mobileNo', 'emiratesId', 'livingArea', 'india', 'addressInIndia', 'emergencyContact'].includes(f.fieldKey))
                            .map((f) => (
                              <option key={f.fieldKey} value={f.fieldKey}>
                                {f.fieldLabel} ({f.fieldKey})
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* 3. Title / Label Input */}
                <div className="control-group">
                  <label className="control-label" style={{ fontWeight: 600 }}>
                    Element Display Label / Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTextTitle}
                    placeholder={newTextType === 'field' ? 'e.g. Designation or Transport Company' : 'e.g. Authority Notice / Special Remarks'}
                    onChange={(e) => setNewTextTitle(e.target.value)}
                  />
                  <span className="control-hint">Displayed as the label above or beside this text</span>
                </div>

                {/* 4. Text Content (only for 'custom') */}
                {newTextType === 'custom' && (
                  <div className="control-group">
                    <label className="control-label" style={{ fontWeight: 600 }}>Text Content</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={newTextContent}
                      placeholder="e.g. Authorized Commercial Transport Driver across UAE Emirates under KTPD supervision."
                      onChange={(e) => setNewTextContent(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* 5. Placement Selection */}
                <div className="control-group">
                  <label className="control-label" style={{ fontWeight: 600 }}>Profile Placement Position</label>
                  <div className="pill-options-row">
                    {[
                      { id: 'header', label: 'Header Banner' },
                      { id: 'above_fields', label: 'Above Member Fields' },
                      { id: 'below_fields', label: 'Below Member Fields' },
                      { id: 'footer', label: 'Footer Notice' }
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        className={`pill-option-btn ${newTextPlacement === pos.id ? 'selected' : ''}`}
                        onClick={() => setNewTextPlacement(pos.id)}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Initial Size & Styling */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="control-group">
                    <label className="control-label" style={{ fontWeight: 600 }}>Font Size (px)</label>
                    <input
                      type="number"
                      min="10"
                      max="48"
                      className="form-input"
                      value={newTextFontSize}
                      onChange={(e) => setNewTextFontSize(e.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label className="control-label" style={{ fontWeight: 600 }}>Alignment</label>
                    <select
                      className="form-input"
                      value={newTextAlignment}
                      onChange={(e) => setNewTextAlignment(e.target.value)}
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#EEF2FF',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#3730A3',
                    lineHeight: 1.5
                  }}
                >
                  <ShieldCheck size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                  <strong>Data Safety Rule:</strong> Custom text elements are saved strictly in the Profile Design configuration. They never alter existing member database records.
                </div>
              </div>

              <div className="text-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddTextModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700 }}
                  disabled={newTextType === 'field' && !newTextLinkedFieldKey}
                >
                  <Plus size={14} />
                  <span>Add to Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRProfileDesignPage;

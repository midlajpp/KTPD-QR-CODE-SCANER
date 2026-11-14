import React, { useState, useEffect, useRef } from 'react';
import { designService } from '../services/designService';
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
  Minus,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight
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

const TextElementCustomizerCard = ({
  title,
  textValue,
  onTextChange,
  placeholder,
  fontSize,
  defaultSize,
  minSize,
  maxSize,
  onFontSizeChange,
  fontWeight,
  onFontWeightChange,
  letterSpacing,
  onLetterSpacingChange,
  lineHeight,
  onLineHeightChange
}) => {
  const currentSize = Number(fontSize !== undefined && fontSize !== null ? fontSize : defaultSize);
  const currentWeight = String(fontWeight || '600');
  const currentSpacing = letterSpacing || '0px';
  const currentLineHeight = Number(lineHeight || 1.25);

  return (
    <div className="text-element-card">
      <div className="text-element-header">
        <span className="text-element-title">
          <Type size={15} color="var(--primary)" />
          <span>{title}</span>
        </span>
        <span className="text-element-badge">{currentSize}px</span>
      </div>

      {/* Direct Text String Input */}
      <input
        type="text"
        className="form-input"
        value={textValue || ''}
        placeholder={placeholder}
        onChange={(e) => onTextChange(e.target.value)}
        style={{ marginBottom: '0.875rem' }}
      />

      {/* Font Size Row: Stepper (-) [Input px] (+) & Range Slider */}
      <div className="font-size-control-row">
        <span className="font-size-label">Font Size</span>
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

      {/* Additional Typography Controls */}
      <div className="element-typo-subcontrols">
        {/* Font Weight */}
        <div className="subcontrol-item">
          <span className="subcontrol-label">Font Weight</span>
          <div className="pill-options-row" style={{ gap: '0.25rem' }}>
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
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => onFontWeightChange(w.id)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="subcontrol-item">
          <span className="subcontrol-label">Letter Spacing</span>
          <div className="pill-options-row" style={{ gap: '0.25rem' }}>
            {[
              { id: '-0.5px', label: 'Tight' },
              { id: '0px', label: 'Normal' },
              { id: '0.5px', label: 'Wide' },
              { id: '1px', label: 'Wider' },
              { id: '2px', label: 'Spread' }
            ].map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`pill-option-btn ${currentSpacing === sp.id ? 'selected' : ''}`}
                style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                onClick={() => onLetterSpacingChange(sp.id)}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div className="subcontrol-item" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="subcontrol-label">Line Height ({currentLineHeight})</span>
            <div className="pill-options-row" style={{ gap: '0.25rem' }}>
              {[
                { id: 1.1, label: 'Tight (1.1)' },
                { id: 1.25, label: 'Normal (1.25)' },
                { id: 1.4, label: 'Relaxed (1.4)' },
                { id: 1.6, label: 'Loose (1.6)' }
              ].map((lh) => (
                <button
                  key={lh.id}
                  type="button"
                  className={`pill-option-btn ${currentLineHeight === lh.id ? 'selected' : ''}`}
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                  onClick={() => onLineHeightChange(lh.id)}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QRProfileDesignPage = () => {
  const [activeTab, setActiveTab] = useState('templates');
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

  const logoFileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const { showSuccess, showError } = useToast();

  // Load design on mount
  useEffect(() => {
    fetchDesignSettings();
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

  // Save Draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await designService.saveDraft(design);
      if (res.success) {
        setInitialDraft(JSON.stringify(design));
        setIsDirty(false);
        showSuccess('Draft saved.');
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
        showSuccess('Design published.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to publish design.');
    } finally {
      setPublishing(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm('Reset design settings to default?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await designService.resetDesign();
      if (res.success && res.data) {
        setDesign(res.data.draft || res.data.published);
        setInitialDraft(JSON.stringify(res.data.draft || res.data.published));
        setIsDirty(false);
        setLastPublishedAt(res.data.lastPublishedAt);
        showSuccess('Design reset.');
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

  return (
    <div className="design-customizer-page">
      {/* Top Header */}
      <div className="customizer-header">
        <div className="customizer-title-area">
          <h1>
            <Palette size={26} color="var(--primary)" />
            <span>QR Public Profile Design</span>
          </h1>
          <p>
            Customize the public webpage displayed when someone scans a member's QR code.
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
            title="Reset to default"
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
          {/* Tabs */}
          <div className="customizer-tabs">
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
              className={`customizer-tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
              onClick={() => setActiveTab('typography')}
            >
              <Type size={16} />
              <span>Typography</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
              onClick={() => setActiveTab('card')}
            >
              <Layers size={16} />
              <span>Card & Badges</span>
            </button>
            <button
              type="button"
              className={`customizer-tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
              onClick={() => setActiveTab('fields')}
            >
              <Sliders size={16} />
              <span>Fields & Footer</span>
            </button>
          </div>

          <div className="customizer-tab-content">
            {/* ---------------- 1. TEMPLATES TAB ---------------- */}
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

            {/* ---------------- 2. BRANDING TAB ---------------- */}
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
                    <span>Header Layout & Text Alignment</span>
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

                    {/* Text Alignment (Left, Center, Right) */}
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
                              onClick={() => updateDesignField('branding.headerTextAlign', align.id)}
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

                {/* 1. Organization Name Element Controls */}
                <TextElementCustomizerCard
                  title="Organization Name"
                  textValue={branding.orgName || ''}
                  onTextChange={(val) => updateDesignField('branding.orgName', val)}
                  placeholder="e.g. Kerala Transport Drivers Association (KTPD)"
                  fontSize={branding.orgNameFontSize}
                  defaultSize={24}
                  minSize={12}
                  maxSize={48}
                  onFontSizeChange={(val) => updateDesignField('branding.orgNameFontSize', val)}
                  fontWeight={branding.orgNameFontWeight}
                  onFontWeightChange={(val) => updateDesignField('branding.orgNameFontWeight', val)}
                  letterSpacing={branding.orgNameLetterSpacing}
                  onLetterSpacingChange={(val) => updateDesignField('branding.orgNameLetterSpacing', val)}
                  lineHeight={branding.orgNameLineHeight}
                  onLineHeightChange={(val) => updateDesignField('branding.orgNameLineHeight', val)}
                />

                {/* 2. Profile Page Title Element Controls */}
                <TextElementCustomizerCard
                  title="Profile Page Title"
                  textValue={branding.pageTitle || ''}
                  onTextChange={(val) => updateDesignField('branding.pageTitle', val)}
                  placeholder="e.g. Official Digital Verification"
                  fontSize={branding.pageTitleFontSize}
                  defaultSize={28}
                  minSize={14}
                  maxSize={56}
                  onFontSizeChange={(val) => updateDesignField('branding.pageTitleFontSize', val)}
                  fontWeight={branding.pageTitleFontWeight}
                  onFontWeightChange={(val) => updateDesignField('branding.pageTitleFontWeight', val)}
                  letterSpacing={branding.pageTitleLetterSpacing}
                  onLetterSpacingChange={(val) => updateDesignField('branding.pageTitleLetterSpacing', val)}
                  lineHeight={branding.pageTitleLineHeight}
                  onLineHeightChange={(val) => updateDesignField('branding.pageTitleLineHeight', val)}
                />

                {/* 3. Subtitle / Chapter Tagline Element Controls */}
                <TextElementCustomizerCard
                  title="Subtitle / Chapter Tagline"
                  textValue={branding.subtitle || ''}
                  onTextChange={(val) => updateDesignField('branding.subtitle', val)}
                  placeholder="e.g. UAE Chapter • Registered Transport Drivers"
                  fontSize={branding.subtitleFontSize}
                  defaultSize={16}
                  minSize={10}
                  maxSize={32}
                  onFontSizeChange={(val) => updateDesignField('branding.subtitleFontSize', val)}
                  fontWeight={branding.subtitleFontWeight}
                  onFontWeightChange={(val) => updateDesignField('branding.subtitleFontWeight', val)}
                  letterSpacing={branding.subtitleLetterSpacing}
                  onLetterSpacingChange={(val) => updateDesignField('branding.subtitleLetterSpacing', val)}
                  lineHeight={branding.subtitleLineHeight}
                  onLineHeightChange={(val) => updateDesignField('branding.subtitleLineHeight', val)}
                />
              </div>
            )}

            {/* ---------------- 3. COLORS TAB ---------------- */}
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
                            maxLength={7}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateDesignField(col.key, val);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 4. BACKGROUND TAB ---------------- */}
            {activeTab === 'background' && (
              <div>
                <div className="control-group">
                  <div className="control-label">
                    <span>Page Background Type</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'gradient', label: 'Gradient' },
                      { id: 'solid', label: 'Solid Color' },
                      { id: 'image', label: 'Background Image' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(background.type || 'gradient') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('background.type', opt.id)}
                      >
                        {opt.label}
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

            {/* ---------------- 5. TYPOGRAPHY TAB ---------------- */}
            {activeTab === 'typography' && (
              <div>
                {/* Font Family */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Primary Font Family (Google Fonts)</span>
                  </div>
                  <div className="pill-options-row">
                    {FONT_OPTIONS.map((font) => (
                      <button
                        key={font}
                        type="button"
                        className={`pill-option-btn ${(typography.fontFamily || 'Poppins') === font ? 'selected' : ''}`}
                        onClick={() => updateDesignField('typography.fontFamily', font)}
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Heading Size */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Member Name Font Size</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: '1.125rem', label: 'Medium (1.1rem)' },
                      { id: '1.25rem', label: 'Standard (1.25rem)' },
                      { id: '1.5rem', label: 'Large (1.5rem)' },
                      { id: '1.75rem', label: 'Extra Large (1.75rem)' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(typography.headingSize || '1.25rem') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('typography.headingSize', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Weight */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Heading Font Weight</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: '500', label: 'Medium (500)' },
                      { id: '600', label: 'Semi-Bold (600)' },
                      { id: '700', label: 'Bold (700)' },
                      { id: '800', label: 'Extra Bold (800)' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(typography.fontWeight || '700') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('typography.fontWeight', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Align */}
                <div className="control-group">
                  <div className="control-label">
                    <span>Member Name & Header Alignment</span>
                  </div>
                  <div className="pill-options-row">
                    {[
                      { id: 'center', label: 'Center' },
                      { id: 'left', label: 'Left Aligned' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pill-option-btn ${(typography.textAlign || 'center') === opt.id ? 'selected' : ''}`}
                        onClick={() => updateDesignField('typography.textAlign', opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                    <span>KTPD Membership ID Badge Style</span>
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
                    <span>Card Padding & Spacing</span>
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
                    onChange={(e) => updateDesignField('footer.text', e.target.value)}
                  />
                </div>

                {/* Footer Toggles */}
                <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={footer.showSecurityBadge !== false}
                      onChange={(e) => updateDesignField('footer.showSecurityBadge', e.target.checked)}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRProfileDesignPage;


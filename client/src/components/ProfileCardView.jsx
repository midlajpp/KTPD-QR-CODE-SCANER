import React, { useEffect } from 'react';
import { loadGoogleFont } from '../utils/fontLoader';
import { getAssetUrl } from '../services/api';
import {
  ShieldCheck,
  AlertTriangle,
  Phone,
  Building2,
  Heart,
  MapPin,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import '../styles/profile-templates.css';

export const SAMPLE_MEMBER = {
  memberId: 'KTPD-0001',
  name: 'Sample Member Name',
  emiratesId: '784-1990-1234567-1',
  isEmiratesIdMasked: true,
  mobileNo: '+971 50 000 0001',
  transportCompany: 'Transport Logistics LLC',
  emergencyContact: '+971 50 000 0002',
  isEmergencyContactMasked: false,
  livingArea: 'Dubai, UAE',
  india: 'Kerala, India',
  addressInIndia: 'Residential Address, Kerala, India',
  isAddressHidden: false,
  bloodGroup: 'O+',
  status: 'Active',
  memberSince: new Date().toISOString(),
  lastVerifiedAt: new Date().toISOString(),
  customFields: [
    {
      fieldKey: 'passportNo',
      fieldLabel: 'Passport Number',
      fieldType: 'alphanumeric',
      value: 'P00000000',
      isMasked: false
    }
  ]
};

const ProfileCardView = ({
  member = SAMPLE_MEMBER,
  design = {},
  isActive = true,
  isPreview = false,
  viewport = 'desktop', // 'desktop' | 'tablet' | 'mobile'
  selectedElementId = null,
  onSelectElement = null
}) => {
  const {
    template = 'modern',
    branding = {},
    colors = {},
    background = {},
    typography = {},
    cardStyle = {},
    idBadge = {},
    statusBadge = {},
    memberPhoto = {},
    fieldDisplay = {},
    footer = {},
    textElements = {},
    customTexts = []
  } = design;

  // Dynamically load Google Fonts configured in theme, individual text elements, and custom texts
  useEffect(() => {
    const fontsToLoad = new Set();
    if (typography?.fontFamily) fontsToLoad.add(typography.fontFamily);

    if (textElements) {
      Object.values(textElements).forEach((el) => {
        if (el?.fontFamily && el.fontFamily !== 'inherit') {
          fontsToLoad.add(el.fontFamily);
        }
      });
    }

    if (Array.isArray(customTexts)) {
      customTexts.forEach((ct) => {
        if (ct?.fontFamily && ct.fontFamily !== 'inherit') {
          fontsToLoad.add(ct.fontFamily);
        }
      });
    }

    fontsToLoad.forEach((font) => {
      loadGoogleFont(font);
    });
  }, [typography?.fontFamily, textElements, customTexts]);

  // Compute Page Background Style
  const pageBackgroundStyle = {};
  if (background?.type === 'solid') {
    pageBackgroundStyle.backgroundColor = background.solidColor || '#0F172A';
  } else if (background?.type === 'image' && background.imageUrl) {
    pageBackgroundStyle.backgroundImage = `url(${getAssetUrl(background.imageUrl)})`;
    pageBackgroundStyle.backgroundPosition = background.imagePosition || 'center';
    pageBackgroundStyle.backgroundSize = background.imageSize || 'cover';
    pageBackgroundStyle.backgroundRepeat = background.imageSize === 'auto' ? 'repeat' : 'no-repeat';
  } else {
    // Default gradient
    const dir = background?.gradientDirection || '135deg';
    const start = background?.gradientStart || colors?.secondary || '#0F172A';
    const end = background?.gradientEnd || '#1E293B';
    pageBackgroundStyle.background = `linear-gradient(${dir}, ${start} 0%, ${end} 100%)`;
  }

  // Compute Card CSS Variables
  const cardCustomVars = {
    '--card-primary': colors?.primary || '#1D4ED8',
    '--card-secondary': colors?.secondary || '#0F172A',
    '--card-accent': colors?.accent || '#3B82F6',
    '--card-bg': colors?.cardBg || '#FFFFFF',
    '--card-text-primary': colors?.textPrimary || '#0F172A',
    '--card-text-secondary': colors?.textSecondary || '#64748B',
    '--card-heading': colors?.headingColor || colors?.textPrimary || '#0F172A',
    '--card-label': colors?.labelColor || colors?.textSecondary || '#64748B',
    '--card-border': colors?.borderColor || '#E2E8F0',
    '--card-font': typography?.fontFamily ? `"${typography.fontFamily}", sans-serif` : 'var(--font-sans)',
    '--card-radius': cardStyle?.borderRadius || '16px',
    '--card-heading-size': typography?.headingSize || '1.25rem',
    '--card-body-size': typography?.bodySize || '0.9375rem',
    '--card-label-size': typography?.labelSize || '0.75rem',
    '--card-font-weight': typography?.fontWeight || '600'
  };

  // Card shadow class
  const shadowClass =
    cardStyle?.shadow === 'none'
      ? 'shadow-none'
      : cardStyle?.shadow === 'subtle'
      ? 'shadow-subtle'
      : cardStyle?.shadow === 'medium'
      ? 'shadow-medium'
      : 'shadow-elevated';

  // Card variant class
  const variantClass =
    cardStyle?.variant === 'flat'
      ? 'variant-flat'
      : cardStyle?.variant === 'bordered'
      ? 'variant-bordered'
      : cardStyle?.variant === 'glassmorphic'
      ? 'variant-glassmorphic'
      : 'variant-card';

  // Field spacing class
  const spacingClass =
    cardStyle?.fieldSpacing === 'compact'
      ? 'spacing-compact'
      : cardStyle?.fieldSpacing === 'spacious'
      ? 'spacing-spacious'
      : 'spacing-normal';

  // Dividers class
  const dividerClass = cardStyle?.showDividers
    ? cardStyle?.dividerStyle === 'solid'
      ? 'divider-solid'
      : cardStyle?.dividerStyle === 'accent'
      ? 'divider-accent'
      : 'divider-dashed'
    : 'divider-none';

  // Viewport container width constraint for live preview frame
  const viewportStyles = {
    mobile: { width: '100%', maxWidth: '375px', minHeight: '620px' },
    tablet: { width: '100%', maxWidth: '580px', minHeight: '680px' },
    desktop: { width: '100%', maxWidth: '100%' }
  }[viewport] || { width: '100%' };

  const logoSizePx = branding?.logoSize || 64;
  const logoShapeRadius =
    memberPhoto?.shape === 'square' ? '4px' : memberPhoto?.shape === 'rounded' ? '14px' : '50%';

  const rawLogoUrl = branding?.logoUrl || '/ktpd-logo.svg';
  const logoUrl = getAssetUrl(rawLogoUrl);

  const memberStatus = member?.status || (isActive ? 'Active' : 'Inactive');
  const isMemberActive = memberStatus === 'Active';

  // Hidden fields list check
  const hiddenFieldsList = Array.isArray(fieldDisplay?.hiddenFields) ? fieldDisplay.hiddenFields : [];
  const isFieldHidden = (fieldKey) => hiddenFieldsList.includes(fieldKey);

  // Helper for interactive click selection in preview mode
  const interactiveProps = (elementId) => {
    if (!isPreview || typeof onSelectElement !== 'function') return {};
    const isSelected = selectedElementId === elementId;
    return {
      onClick: (e) => {
        e.stopPropagation();
        onSelectElement(elementId);
      },
      className: `preview-interactive-element ${isSelected ? 'preview-element-selected' : ''}`,
      title: 'Click to customize this element'
    };
  };

  // Helper to build inline styles from a text element definition
  const getTextElementStyle = (elementDef, defaultColor, defaultSizePx, defaultWeight) => {
    const el = elementDef || {};
    return {
      fontSize: el.fontSize ? `${el.fontSize}px` : (defaultSizePx ? `${defaultSizePx}px` : undefined),
      fontWeight: el.fontWeight || defaultWeight || undefined,
      color: el.color || defaultColor || undefined,
      textAlign: el.textAlign || undefined,
      lineHeight: el.lineHeight || undefined,
      letterSpacing: el.letterSpacing || undefined,
      fontFamily: el.fontFamily && el.fontFamily !== 'inherit' ? `"${el.fontFamily}", sans-serif` : undefined
    };
  };

  // Organization Name text element
  const orgNameEl = textElements?.orgName || {};
  const orgNameText = orgNameEl.text !== undefined ? orgNameEl.text : (branding?.orgName || 'KTPD Drivers Association');
  const orgNameVisible = orgNameEl.visible !== false;
  const orgNameStyle = getTextElementStyle(
    orgNameEl,
    template === 'minimal' ? colors?.headingColor : '#FFFFFF',
    branding?.orgNameFontSize || 24,
    branding?.orgNameFontWeight || '700'
  );
  if (!orgNameEl.lineHeight && branding?.orgNameLineHeight) orgNameStyle.lineHeight = branding.orgNameLineHeight;
  if (!orgNameEl.letterSpacing && branding?.orgNameLetterSpacing) orgNameStyle.letterSpacing = branding.orgNameLetterSpacing;

  // Page Title text element
  const pageTitleEl = textElements?.pageTitle || {};
  const pageTitleText = pageTitleEl.text !== undefined ? pageTitleEl.text : (branding?.pageTitle || 'Official Digital Verification');
  const pageTitleVisible = pageTitleEl.visible !== false;
  const pageTitleStyle = getTextElementStyle(
    pageTitleEl,
    template === 'minimal' ? colors?.textSecondary : '#BFDBFE',
    branding?.pageTitleFontSize || 28,
    branding?.pageTitleFontWeight || '600'
  );
  if (!pageTitleEl.lineHeight && branding?.pageTitleLineHeight) pageTitleStyle.lineHeight = branding.pageTitleLineHeight;
  if (!pageTitleEl.letterSpacing && branding?.pageTitleLetterSpacing) pageTitleStyle.letterSpacing = branding.pageTitleLetterSpacing;

  // Subtitle text element
  const subtitleEl = textElements?.subtitle || {};
  const subtitleText = subtitleEl.text !== undefined ? subtitleEl.text : (branding?.subtitle || 'UAE Chapter • Kerala Transport Drivers Association');
  const subtitleVisible = subtitleEl.visible !== false && Boolean(subtitleText);
  const subtitleStyle = getTextElementStyle(
    subtitleEl,
    template === 'minimal' ? colors?.labelColor : '#93C5FD',
    branding?.subtitleFontSize || 16,
    branding?.subtitleFontWeight || '500'
  );
  if (!subtitleEl.lineHeight && branding?.subtitleLineHeight) subtitleStyle.lineHeight = branding.subtitleLineHeight;
  if (!subtitleEl.letterSpacing && branding?.subtitleLetterSpacing) subtitleStyle.letterSpacing = branding.subtitleLetterSpacing;

  // Status Text element
  const statusTextEl = textElements?.statusText || {};
  const statusTextVisible = statusTextEl.visible !== false;
  const defaultStatusColor = isMemberActive ? (colors?.activeStatusText || '#15803D') : (colors?.inactiveStatusText || '#991B1B');
  const statusTextStyle = getTextElementStyle(statusTextEl, defaultStatusColor, 13, '600');

  // Member Name text element
  const memberNameEl = textElements?.memberName || {};
  const memberNameVisible = memberNameEl.visible !== false;
  const memberNameStyle = getTextElementStyle(
    memberNameEl,
    colors?.headingColor || '#0F172A',
    24,
    typography?.fontWeight || '700'
  );

  // Member ID text element
  const memberIdEl = textElements?.memberId || {};
  const memberIdVisible = memberIdEl.visible !== false;
  const memberIdStyle = getTextElementStyle(
    memberIdEl,
    idBadge?.style === 'solid' ? '#FFFFFF' : (colors?.primary || '#1D4ED8'),
    15,
    '700'
  );

  // Section Heading text element
  const sectionHeadingEl = textElements?.sectionHeading || {};
  const sectionHeadingVisible = sectionHeadingEl.visible !== false;
  const sectionHeadingText = sectionHeadingEl.text || 'Member Information';
  const sectionHeadingStyle = getTextElementStyle(
    sectionHeadingEl,
    colors?.headingColor || colors?.primary || '#1D4ED8',
    16,
    '600'
  );

  // Field Labels element
  const fieldLabelsEl = textElements?.fieldLabels || {};
  const fieldLabelsVisible = fieldLabelsEl.visible !== false;
  const fieldLabelStyle = {
    ...getTextElementStyle(fieldLabelsEl, colors?.labelColor || '#64748B', 12, '600'),
    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
  };

  // Field Values element
  const fieldValuesEl = textElements?.fieldValues || {};
  const fieldValuesVisible = fieldValuesEl.visible !== false;
  const fieldValueStyle = getTextElementStyle(fieldValuesEl, colors?.textPrimary || '#0F172A', 14, '500');

  // Footer text element
  const footerTextEl = textElements?.footerText || {};
  const footerTextVisible = footerTextEl.visible !== false;
  const footerNoticeText = footerTextEl.text || footer?.text || 'This digital card is cryptographically verified against the KTPD Database.';
  const footerTextStyle = getTextElementStyle(footerTextEl, colors?.textSecondary || '#64748B', 12, '400');

  // Security Badge text element
  const securityBadgeTextEl = textElements?.securityBadgeText || {};
  const securityBadgeVisible = securityBadgeTextEl.visible !== false && footer?.showSecurityBadge !== false;
  const securityBadgeText = securityBadgeTextEl.text || footer?.securityBadgeText || 'Permanent Dynamic QR Authentication Active';
  const securityBadgeTextStyle = getTextElementStyle(securityBadgeTextEl, '#16A34A', 11, '600');

  // Render a custom text item (or linked field)
  const renderCustomTextItem = (item) => {
    if (!item || item.visible === false) return null;

    let displayContent = item.content || '';
    if (item.linkedFieldKey) {
      const lk = item.linkedFieldKey;
      const directVal = member?.[lk];
      if (directVal !== undefined && directVal !== null && directVal !== '') {
        displayContent = String(directVal);
      } else if (member?.customFields) {
        const match = member.customFields.find((cf) => cf.fieldKey === lk);
        if (match && match.value !== undefined && match.value !== null && match.value !== '') {
          displayContent = String(match.value);
        }
      }
      if (!displayContent && isPreview) {
        displayContent = item.content || `[${item.title || item.linkedFieldKey}]`;
      }
    }

    if (!displayContent && !item.title) return null;

    const itemStyle = {
      fontSize: item.fontSize ? `${item.fontSize}px` : '14px',
      fontWeight: item.fontWeight || '500',
      color: item.color || colors?.textPrimary || '#0F172A',
      textAlign: item.textAlign || 'left',
      lineHeight: item.lineHeight || 1.35,
      letterSpacing: item.letterSpacing || '0px',
      fontFamily: item.fontFamily && item.fontFamily !== 'inherit' ? `"${item.fontFamily}", sans-serif` : undefined
    };

    const isClickable = isPreview && typeof onSelectElement === 'function';

    return (
      <div
        key={item.id}
        className={`custom-profile-text-block ${isClickable ? 'preview-interactive-element' : ''} ${selectedElementId === item.id ? 'preview-element-selected' : ''}`}
        onClick={(e) => {
          if (isClickable) {
            e.stopPropagation();
            onSelectElement(item.id);
          }
        }}
        title={isClickable ? `Click to customize ${item.title || 'Text'}` : undefined}
        style={{
          margin: '0.625rem 0',
          width: '100%',
          textAlign: itemStyle.textAlign
        }}
      >
        {item.title && (
          <span
            className="custom-text-title-label"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: colors?.labelColor || '#64748B',
              marginBottom: '0.2rem',
              letterSpacing: '0.5px'
            }}
          >
            {item.title}
          </span>
        )}
        <div style={itemStyle}>{displayContent}</div>
      </div>
    );
  };

  const headerTextAlign = branding?.headerTextAlign || (branding?.headerLayout === 'left' ? 'left' : 'center');

  return (
    <div
      className={`profile-card-viewport viewport-${viewport}`}
      style={{
        ...pageBackgroundStyle,
        ...viewportStyles,
        fontFamily: cardCustomVars['--card-font']
      }}
    >
      {isPreview && (
        <div className="preview-indicator-badge">
          <Sparkles size={13} />
          <span>Live Design Preview &bull; Click any text element to customize</span>
        </div>
      )}

      <div
        className={`ktpd-profile-card template-${template} ${shadowClass} ${variantClass} ${spacingClass} ${dividerClass}`}
        style={cardCustomVars}
      >
        {/* ================= HEADER BRANDING ================= */}
        <header
          className={`card-header layout-${branding?.headerLayout || 'center'}`}
          style={{
            backgroundColor: template === 'minimal' ? 'transparent' : colors?.secondary || '#0F172A',
            background:
              template === 'gradient'
                ? `linear-gradient(${background?.gradientDirection || '135deg'}, ${colors?.primary || '#1D4ED8'}, ${colors?.secondary || '#0F172A'})`
                : undefined
          }}
        >
          {logoUrl && (
            <div
              className="card-logo-wrapper"
              style={{
                width: `${logoSizePx}px`,
                height: `${logoSizePx}px`,
                borderRadius: logoShapeRadius
              }}
            >
              <img src={logoUrl} alt={`${orgNameText} Logo`} />
            </div>
          )}

          <div className="header-text-block" style={{ textAlign: headerTextAlign }}>
            {orgNameVisible && (
              <h1
                {...interactiveProps('orgName')}
                className="org-name"
                style={{
                  ...orgNameStyle,
                  textAlign: orgNameStyle.textAlign || headerTextAlign
                }}
              >
                {orgNameText}
              </h1>
            )}

            {pageTitleVisible && (
              <p
                {...interactiveProps('pageTitle')}
                className="page-title"
                style={{
                  ...pageTitleStyle,
                  textAlign: pageTitleStyle.textAlign || headerTextAlign
                }}
              >
                {pageTitleText}
              </p>
            )}

            {subtitleVisible && (
              <p
                {...interactiveProps('subtitle')}
                className="page-subtitle"
                style={{
                  ...subtitleStyle,
                  textAlign: subtitleStyle.textAlign || headerTextAlign
                }}
              >
                {subtitleText}
              </p>
            )}

            {/* Custom text items placed in Header */}
            {customTexts.filter((t) => t.placement === 'header').map(renderCustomTextItem)}
          </div>
        </header>

        {/* ================= STATUS BADGE ================= */}
        {statusTextVisible && (
          statusBadge?.style === 'banner' ? (
            <div
              {...interactiveProps('statusText')}
              className={`status-banner-bar ${isMemberActive ? 'status-active' : 'status-inactive'}`}
              style={{
                backgroundColor: isMemberActive
                  ? colors?.activeStatusBg || '#DCFCE7'
                  : colors?.inactiveStatusBg || '#FEE2E2',
                color: statusTextStyle.color || defaultStatusColor,
                fontSize: statusTextStyle.fontSize,
                fontWeight: statusTextStyle.fontWeight,
                letterSpacing: statusTextStyle.letterSpacing,
                lineHeight: statusTextStyle.lineHeight,
                fontFamily: statusTextStyle.fontFamily
              }}
            >
              {isMemberActive ? (
                <>
                  <ShieldCheck size={18} />
                  <span>Official Active Membership Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} />
                  <span>Notice: Membership Inactive</span>
                </>
              )}
            </div>
          ) : (
            <div className="status-pill-container" {...interactiveProps('statusText')}>
              <span
                className={`status-pill ${isMemberActive ? 'pill-active' : 'pill-inactive'}`}
                style={{
                  backgroundColor: isMemberActive
                    ? colors?.activeStatusBg || '#DCFCE7'
                    : colors?.inactiveStatusBg || '#FEE2E2',
                  color: statusTextStyle.color || defaultStatusColor,
                  fontSize: statusTextStyle.fontSize,
                  fontWeight: statusTextStyle.fontWeight,
                  letterSpacing: statusTextStyle.letterSpacing,
                  lineHeight: statusTextStyle.lineHeight,
                  fontFamily: statusTextStyle.fontFamily
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    backgroundColor: statusTextStyle.color || defaultStatusColor
                  }}
                />
                <span>{isMemberActive ? 'Active Member' : 'Inactive Record'}</span>
              </span>
            </div>
          )
        )}

        {/* ================= CARD BODY ================= */}
        <main className="card-body">
          {/* Member Name & ID Badge Block */}
          <div className="member-hero-block" style={{ textAlign: memberNameStyle.textAlign || typography?.textAlign || 'center' }}>
            {memberNameVisible && (
              <h2
                {...interactiveProps('memberName')}
                className="member-display-name"
                style={memberNameStyle}
              >
                {member?.name || 'KTPD Member'}
              </h2>
            )}

            {/* Authoritative KTPD NO (ID Badge) */}
            {memberIdVisible && (
              <div
                {...interactiveProps('memberId')}
                className={`member-id-badge badge-style-${idBadge?.style || 'pill'}`}
              >
                <span
                  className="id-badge-content"
                  style={{
                    ...memberIdStyle,
                    backgroundColor:
                      idBadge?.style === 'solid'
                        ? colors?.primary || '#1D4ED8'
                        : idBadge?.style === 'outlined'
                        ? 'transparent'
                        : '#EEF2FF',
                    color:
                      memberIdStyle.color ||
                      (idBadge?.style === 'solid'
                        ? '#FFFFFF'
                        : colors?.primary || '#1D4ED8'),
                    borderColor: colors?.primary || '#1D4ED8'
                  }}
                >
                  {member?.memberId || 'No ID Assigned'}
                </span>
              </div>
            )}
          </div>

          {/* Custom text items placed Above Fields */}
          {customTexts.filter((t) => t.placement === 'above_fields').map(renderCustomTextItem)}

          {/* Section Heading */}
          {sectionHeadingVisible && (
            <div
              {...interactiveProps('sectionHeading')}
              className="section-heading-block"
              style={{
                margin: '1.25rem 0 0.75rem',
                textAlign: sectionHeadingStyle.textAlign || 'left'
              }}
            >
              <h3
                style={{
                  ...sectionHeadingStyle,
                  margin: 0
                }}
              >
                {sectionHeadingText}
              </h3>
            </div>
          )}

          {/* Emergency Contact Highlight Box */}
          {member?.emergencyContact && !isFieldHidden('emergencyContact') && (
            <div className="emergency-alert-card">
              <AlertCircle size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="emergency-label"
                    style={fieldLabelStyle}
                  >
                    Emergency Contact
                  </span>
                )}
                {fieldValuesVisible && (
                  <p
                    {...interactiveProps('fieldValues')}
                    className="emergency-value"
                    style={fieldValueStyle}
                  >
                    {member.emergencyContact}
                  </p>
                )}
                <a
                  href={`tel:${member.emergencyContact.replace(/[^\d+]/g, '')}`}
                  className="emergency-call-btn"
                  style={{ color: colors?.primary || '#1D4ED8' }}
                >
                  <Phone size={13} />
                  <span>Call Emergency Contact</span>
                </a>
              </div>
            </div>
          )}

          {/* Attributes Grid */}
          <div className={`fields-container layout-${fieldDisplay?.layout || 'grid'}`}>
            {member?.transportCompany && !isFieldHidden('transportCompany') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    {fieldDisplay?.showIcons !== false && <Building2 size={13} />}
                    <span>Transport Company / Designation</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value"
                    style={fieldValueStyle}
                  >
                    {member.transportCompany}
                  </span>
                )}
              </div>
            )}

            {member?.bloodGroup && !isFieldHidden('bloodGroup') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    {fieldDisplay?.showIcons !== false && <Heart size={13} color="#DC2626" />}
                    <span>Blood Group</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value blood-value"
                    style={fieldValueStyle}
                  >
                    {member.bloodGroup}
                  </span>
                )}
              </div>
            )}

            {member?.mobileNo && !isFieldHidden('mobileNo') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    {fieldDisplay?.showIcons !== false && <Phone size={13} />}
                    <span>Mobile Number</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <a
                    {...interactiveProps('fieldValues')}
                    href={`tel:${member.mobileNo.replace(/[^\d+]/g, '')}`}
                    className="field-tile-value tel-link"
                    style={{ ...fieldValueStyle, color: colors?.primary || '#1D4ED8' }}
                  >
                    {member.mobileNo}
                  </a>
                )}
              </div>
            )}

            {member?.emiratesId && !isFieldHidden('emiratesId') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    <span>Emirates ID</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value mono-val"
                    style={fieldValueStyle}
                  >
                    {member.emiratesId}
                  </span>
                )}
                {member.isEmiratesIdMasked && <span className="masked-indicator">(Masked for privacy)</span>}
              </div>
            )}

            {member?.livingArea && !isFieldHidden('livingArea') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    {fieldDisplay?.showIcons !== false && <MapPin size={13} />}
                    <span>Living Area (UAE)</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value"
                    style={fieldValueStyle}
                  >
                    {member.livingArea}
                  </span>
                )}
              </div>
            )}

            {member?.india && !isFieldHidden('india') && (
              <div className="field-tile">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    <span>India Hometown</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value"
                    style={fieldValueStyle}
                  >
                    {member.india}
                  </span>
                )}
              </div>
            )}

            {!member?.isAddressHidden && member?.addressInIndia && !isFieldHidden('addressInIndia') && (
              <div className="field-tile tile-full-width">
                {fieldLabelsVisible && (
                  <span
                    {...interactiveProps('fieldLabels')}
                    className="field-tile-label"
                    style={fieldLabelStyle}
                  >
                    <span>Address in India</span>
                  </span>
                )}
                {fieldValuesVisible && (
                  <span
                    {...interactiveProps('fieldValues')}
                    className="field-tile-value"
                    style={fieldValueStyle}
                  >
                    {member.addressInIndia}
                  </span>
                )}
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {member?.customFields &&
              member.customFields.map((cf) => {
                if (isFieldHidden(cf.fieldKey)) return null;

                if (cf.isGroup && cf.children && cf.children.length > 0) {
                  return (
                    <div key={cf.fieldKey} className="field-tile tile-full-width group-tile">
                      {fieldLabelsVisible && (
                        <span
                          {...interactiveProps('fieldLabels')}
                          className="group-title"
                          style={{ ...fieldLabelStyle, color: colors?.primary || '#1D4ED8' }}
                        >
                          {cf.fieldLabel}
                        </span>
                      )}
                      <div className="group-grid">
                        {cf.children.map((child) => {
                          if (isFieldHidden(child.fieldKey)) return null;
                          return (
                            <div key={child.fieldKey} className="field-tile">
                              {fieldLabelsVisible && (
                                <span
                                  {...interactiveProps('fieldLabels')}
                                  className="field-tile-label"
                                  style={fieldLabelStyle}
                                >
                                  {child.fieldLabel}
                                </span>
                              )}
                              {fieldValuesVisible && (
                                <span
                                  {...interactiveProps('fieldValues')}
                                  className="field-tile-value"
                                  style={fieldValueStyle}
                                >
                                  {child.value}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (cf.selectedOptions && cf.selectedOptions.length > 0) {
                  return (
                    <div key={cf.fieldKey} className="field-tile tile-full-width">
                      {fieldLabelsVisible && (
                        <span
                          {...interactiveProps('fieldLabels')}
                          className="field-tile-label"
                          style={fieldLabelStyle}
                        >
                          {cf.fieldLabel}
                        </span>
                      )}
                      {fieldValuesVisible && (
                        <div className="badge-options-row">
                          {cf.selectedOptions.map((opt, idx) => (
                            <span
                              key={idx}
                              className="custom-choice-badge"
                              style={{
                                backgroundColor: '#EEF2FF',
                                color: colors?.primary || '#1D4ED8',
                                fontSize: fieldValueStyle.fontSize
                              }}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={cf.fieldKey}
                    className={`field-tile ${cf.fieldType === 'textarea' ? 'tile-full-width' : ''}`}
                  >
                    {fieldLabelsVisible && (
                      <span
                        {...interactiveProps('fieldLabels')}
                        className="field-tile-label"
                        style={fieldLabelStyle}
                      >
                        {cf.fieldLabel}
                      </span>
                    )}
                    {fieldValuesVisible && (
                      cf.fieldType === 'url' ? (
                        <a
                          {...interactiveProps('fieldValues')}
                          href={cf.value.startsWith('http') ? cf.value : `https://${cf.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="field-tile-value tel-link"
                          style={{ ...fieldValueStyle, color: colors?.primary || '#1D4ED8' }}
                        >
                          <ExternalLink size={13} />
                          <span>{cf.value}</span>
                        </a>
                      ) : cf.fieldType === 'phone' && !cf.isMasked ? (
                        <a
                          {...interactiveProps('fieldValues')}
                          href={`tel:${cf.value.replace(/[^\d+]/g, '')}`}
                          className="field-tile-value tel-link"
                          style={{ ...fieldValueStyle, color: colors?.primary || '#1D4ED8' }}
                        >
                          {cf.value}
                        </a>
                      ) : (
                        <span
                          {...interactiveProps('fieldValues')}
                          className="field-tile-value"
                          style={fieldValueStyle}
                        >
                          {cf.value}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
          </div>

          {/* Custom text items placed Below Fields */}
          {customTexts.filter((t) => t.placement === 'below_fields').map(renderCustomTextItem)}
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="card-footer" style={{ borderTopColor: colors?.borderColor || '#E2E8F0' }}>
          {/* Custom text items placed in Footer */}
          {customTexts.filter((t) => t.placement === 'footer').map(renderCustomTextItem)}

          {footerTextVisible && (
            <p
              {...interactiveProps('footerText')}
              className="footer-notice"
              style={footerTextStyle}
            >
              {footerNoticeText}
            </p>
          )}

          {securityBadgeVisible && (
            <div
              {...interactiveProps('securityBadgeText')}
              className="footer-security-pill"
              style={{
                color: securityBadgeTextStyle.color || '#16A34A',
                fontSize: securityBadgeTextStyle.fontSize,
                fontWeight: securityBadgeTextStyle.fontWeight,
                fontFamily: securityBadgeTextStyle.fontFamily
              }}
            >
              <ShieldCheck size={15} />
              <span>{securityBadgeText}</span>
            </div>
          )}

          {footer?.showLastUpdated !== false && (
            <p className="footer-last-updated">
              Last updated: {new Date(member?.lastVerifiedAt || Date.now()).toLocaleDateString()}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ProfileCardView;

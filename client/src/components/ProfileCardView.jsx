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
  viewport = 'desktop' // 'desktop' | 'tablet' | 'mobile'
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
    footer = {}
  } = design;

  // Dynamically load chosen Google Font
  useEffect(() => {
    if (typography?.fontFamily) {
      loadGoogleFont(typography.fontFamily);
    }
  }, [typography?.fontFamily]);

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
  const orgName = branding?.orgName || 'KTPD Drivers Association';
  const pageTitle = branding?.pageTitle || 'Official Digital Verification';
  const subtitle = branding?.subtitle || 'UAE Chapter • Kerala Transport Drivers Association';

  const memberStatus = member?.status || (isActive ? 'Active' : 'Inactive');
  const isMemberActive = memberStatus === 'Active';

  // Header Typography Settings (Branding)
  const orgNameFontSize = branding?.orgNameFontSize ? `${branding.orgNameFontSize}px` : '24px';
  const orgNameFontWeight = branding?.orgNameFontWeight || '700';
  const orgNameLetterSpacing = branding?.orgNameLetterSpacing || 'normal';
  const orgNameLineHeight = branding?.orgNameLineHeight || 1.25;

  const pageTitleFontSize = branding?.pageTitleFontSize ? `${branding.pageTitleFontSize}px` : '28px';
  const pageTitleFontWeight = branding?.pageTitleFontWeight || '600';
  const pageTitleLetterSpacing = branding?.pageTitleLetterSpacing || 'normal';
  const pageTitleLineHeight = branding?.pageTitleLineHeight || 1.25;

  const subtitleFontSize = branding?.subtitleFontSize ? `${branding.subtitleFontSize}px` : '16px';
  const subtitleFontWeight = branding?.subtitleFontWeight || '500';
  const subtitleLetterSpacing = branding?.subtitleLetterSpacing || '0.04em';
  const subtitleLineHeight = branding?.subtitleLineHeight || 1.35;

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
          <span>Live Design Preview &bull; Realistic Sample Member</span>
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
              <img src={logoUrl} alt={`${orgName} Logo`} />
            </div>
          )}

          <div className="header-text-block" style={{ textAlign: headerTextAlign }}>
            <h1
              className="org-name"
              style={{
                fontSize: orgNameFontSize,
                fontWeight: orgNameFontWeight,
                letterSpacing: orgNameLetterSpacing,
                lineHeight: orgNameLineHeight,
                textAlign: headerTextAlign,
                color: template === 'minimal' ? colors?.headingColor : '#FFFFFF'
              }}
            >
              {orgName}
            </h1>
            <p
              className="page-title"
              style={{
                fontSize: pageTitleFontSize,
                fontWeight: pageTitleFontWeight,
                letterSpacing: pageTitleLetterSpacing,
                lineHeight: pageTitleLineHeight,
                textAlign: headerTextAlign,
                color: template === 'minimal' ? colors?.textSecondary : '#BFDBFE'
              }}
            >
              {pageTitle}
            </p>
            {subtitle && (
              <p
                className="page-subtitle"
                style={{
                  fontSize: subtitleFontSize,
                  fontWeight: subtitleFontWeight,
                  letterSpacing: subtitleLetterSpacing,
                  lineHeight: subtitleLineHeight,
                  textAlign: headerTextAlign,
                  color: template === 'minimal' ? colors?.labelColor : '#93C5FD'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </header>

        {/* ================= STATUS BADGE ================= */}
        {statusBadge?.style === 'banner' ? (
          <div
            className={`status-banner-bar ${isMemberActive ? 'status-active' : 'status-inactive'}`}
            style={{
              backgroundColor: isMemberActive
                ? colors?.activeStatusBg || '#DCFCE7'
                : colors?.inactiveStatusBg || '#FEE2E2',
              color: isMemberActive
                ? colors?.activeStatusText || '#15803D'
                : colors?.inactiveStatusText || '#991B1B'
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
          <div className="status-pill-container">
            <span
              className={`status-pill ${isMemberActive ? 'pill-active' : 'pill-inactive'}`}
              style={{
                backgroundColor: isMemberActive
                  ? colors?.activeStatusBg || '#DCFCE7'
                  : colors?.inactiveStatusBg || '#FEE2E2',
                color: isMemberActive
                  ? colors?.activeStatusText || '#15803D'
                  : colors?.inactiveStatusText || '#991B1B'
              }}
            >
              <span
                className="status-dot"
                style={{
                  backgroundColor: isMemberActive
                    ? colors?.activeStatusText || '#15803D'
                    : colors?.inactiveStatusText || '#991B1B'
                }}
              />
              <span>{isMemberActive ? 'Active Member' : 'Inactive Record'}</span>
            </span>
          </div>
        )}

        {/* ================= CARD BODY ================= */}
        <main className="card-body">
          {/* Member Name & ID Badge Block */}
          <div className="member-hero-block" style={{ textAlign: typography?.textAlign || 'center' }}>
            <h2 className="member-display-name" style={{ color: colors?.headingColor || '#0F172A' }}>
              {member?.name || 'KTPD Member'}
            </h2>

            {/* Authoritative KTPD NO (ID Badge) */}
            <div className={`member-id-badge badge-style-${idBadge?.style || 'pill'}`}>
              <span
                className="id-badge-content"
                style={{
                  backgroundColor:
                    idBadge?.style === 'solid'
                      ? colors?.primary || '#1D4ED8'
                      : idBadge?.style === 'outlined'
                      ? 'transparent'
                      : '#EEF2FF',
                  color:
                    idBadge?.style === 'solid'
                      ? '#FFFFFF'
                      : colors?.primary || '#1D4ED8',
                  borderColor: colors?.primary || '#1D4ED8'
                }}
              >
                {member?.memberId || 'No ID Assigned'}
              </span>
            </div>
          </div>

          {/* Emergency Contact Highlight Box */}
          {member?.emergencyContact && (
            <div className="emergency-alert-card">
              <AlertCircle size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span className="emergency-label">Emergency Contact</span>
                <p className="emergency-value">{member.emergencyContact}</p>
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
            {member?.transportCompany && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  {fieldDisplay?.showIcons !== false && <Building2 size={13} />}
                  <span>Transport Company</span>
                </span>
                <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                  {member.transportCompany}
                </span>
              </div>
            )}

            {member?.bloodGroup && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  {fieldDisplay?.showIcons !== false && <Heart size={13} color="#DC2626" />}
                  <span>Blood Group</span>
                </span>
                <span className="field-tile-value blood-value">{member.bloodGroup}</span>
              </div>
            )}

            {member?.mobileNo && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  {fieldDisplay?.showIcons !== false && <Phone size={13} />}
                  <span>Mobile Number</span>
                </span>
                <a
                  href={`tel:${member.mobileNo.replace(/[^\d+]/g, '')}`}
                  className="field-tile-value tel-link"
                  style={{ color: colors?.primary || '#1D4ED8' }}
                >
                  {member.mobileNo}
                </a>
              </div>
            )}

            {member?.emiratesId && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  <span>Emirates ID</span>
                </span>
                <span className="field-tile-value mono-val" style={{ color: colors?.textPrimary || '#0F172A' }}>
                  {member.emiratesId}
                </span>
                {member.isEmiratesIdMasked && <span className="masked-indicator">(Masked for privacy)</span>}
              </div>
            )}

            {member?.livingArea && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  {fieldDisplay?.showIcons !== false && <MapPin size={13} />}
                  <span>Living Area (UAE)</span>
                </span>
                <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                  {member.livingArea}
                </span>
              </div>
            )}

            {member?.india && (
              <div className="field-tile">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  <span>India Hometown</span>
                </span>
                <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                  {member.india}
                </span>
              </div>
            )}

            {!member?.isAddressHidden && member?.addressInIndia && (
              <div className="field-tile tile-full-width">
                <span
                  className="field-tile-label"
                  style={{
                    color: colors?.labelColor || '#64748B',
                    textTransform: fieldDisplay?.labelStyle === 'normal' ? 'none' : 'uppercase'
                  }}
                >
                  <span>Address in India</span>
                </span>
                <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                  {member.addressInIndia}
                </span>
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {member?.customFields &&
              member.customFields.map((cf) => {
                if (cf.isGroup && cf.children && cf.children.length > 0) {
                  return (
                    <div key={cf.fieldKey} className="field-tile tile-full-width group-tile">
                      <span className="group-title" style={{ color: colors?.primary || '#1D4ED8' }}>
                        {cf.fieldLabel}
                      </span>
                      <div className="group-grid">
                        {cf.children.map((child) => (
                          <div key={child.fieldKey} className="field-tile">
                            <span className="field-tile-label" style={{ color: colors?.labelColor || '#64748B' }}>
                              {child.fieldLabel}
                            </span>
                            <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                              {child.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (cf.selectedOptions && cf.selectedOptions.length > 0) {
                  return (
                    <div key={cf.fieldKey} className="field-tile tile-full-width">
                      <span className="field-tile-label" style={{ color: colors?.labelColor || '#64748B' }}>
                        {cf.fieldLabel}
                      </span>
                      <div className="badge-options-row">
                        {cf.selectedOptions.map((opt, idx) => (
                          <span
                            key={idx}
                            className="custom-choice-badge"
                            style={{
                              backgroundColor: '#EEF2FF',
                              color: colors?.primary || '#1D4ED8'
                            }}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cf.fieldKey}
                    className={`field-tile ${cf.fieldType === 'textarea' ? 'tile-full-width' : ''}`}
                  >
                    <span className="field-tile-label" style={{ color: colors?.labelColor || '#64748B' }}>
                      {cf.fieldLabel}
                    </span>
                    {cf.fieldType === 'url' ? (
                      <a
                        href={cf.value.startsWith('http') ? cf.value : `https://${cf.value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="field-tile-value tel-link"
                        style={{ color: colors?.primary || '#1D4ED8' }}
                      >
                        <ExternalLink size={13} />
                        <span>{cf.value}</span>
                      </a>
                    ) : cf.fieldType === 'phone' && !cf.isMasked ? (
                      <a
                        href={`tel:${cf.value.replace(/[^\d+]/g, '')}`}
                        className="field-tile-value tel-link"
                        style={{ color: colors?.primary || '#1D4ED8' }}
                      >
                        {cf.value}
                      </a>
                    ) : (
                      <span className="field-tile-value" style={{ color: colors?.textPrimary || '#0F172A' }}>
                        {cf.value}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="card-footer" style={{ borderTopColor: colors?.borderColor || '#E2E8F0' }}>
          <p className="footer-notice">{footer?.text || 'This digital card is cryptographically verified against the KTPD Database.'}</p>
          {footer?.showSecurityBadge !== false && (
            <div className="footer-security-pill" style={{ color: '#16A34A' }}>
              <ShieldCheck size={15} />
              <span>{footer?.securityBadgeText || 'Permanent Dynamic QR Authentication Active'}</span>
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


import mongoose from 'mongoose';

export const DEFAULT_TEXT_ELEMENTS = {
  orgName: {
    id: 'orgName',
    name: 'Organization Name',
    visible: true,
    text: 'KTPD Drivers Association',
    fontSize: 24,
    minSize: 12,
    maxSize: 48,
    fontWeight: '700',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.25,
    fontFamily: '',
    placement: 'header'
  },
  pageTitle: {
    id: 'pageTitle',
    name: 'Profile Page Title',
    visible: true,
    text: 'Official Digital Verification',
    fontSize: 28,
    minSize: 14,
    maxSize: 56,
    fontWeight: '600',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.25,
    fontFamily: '',
    placement: 'header'
  },
  subtitle: {
    id: 'subtitle',
    name: 'Subtitle / Tagline',
    visible: true,
    text: 'UAE Chapter • Kerala Transport Drivers Association',
    fontSize: 16,
    minSize: 10,
    maxSize: 32,
    fontWeight: '500',
    color: '',
    textAlign: 'center',
    letterSpacing: '0.5px',
    lineHeight: 1.35,
    fontFamily: '',
    placement: 'header'
  },
  memberName: {
    id: 'memberName',
    name: 'Member Name',
    visible: true,
    fontSize: 24,
    minSize: 14,
    maxSize: 48,
    fontWeight: '700',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.25,
    fontFamily: '',
    placement: 'hero'
  },
  memberId: {
    id: 'memberId',
    name: 'KTPD Number (ID Badge)',
    visible: true,
    fontSize: 15,
    minSize: 11,
    maxSize: 32,
    fontWeight: '700',
    color: '',
    textAlign: 'center',
    letterSpacing: '0.5px',
    lineHeight: 1.2,
    fontFamily: '',
    placement: 'hero'
  },
  statusText: {
    id: 'statusText',
    name: 'Status Banner / Pill',
    visible: true,
    fontSize: 13,
    minSize: 10,
    maxSize: 24,
    fontWeight: '600',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.2,
    fontFamily: '',
    placement: 'status'
  },
  sectionHeading: {
    id: 'sectionHeading',
    name: 'Section Heading',
    visible: true,
    text: 'Member Information',
    fontSize: 16,
    minSize: 12,
    maxSize: 32,
    fontWeight: '600',
    color: '',
    textAlign: 'left',
    letterSpacing: '0px',
    lineHeight: 1.3,
    fontFamily: '',
    placement: 'above_fields'
  },
  fieldLabels: {
    id: 'fieldLabels',
    name: 'Field Labels',
    visible: true,
    fontSize: 12,
    minSize: 10,
    maxSize: 22,
    fontWeight: '600',
    color: '',
    textAlign: 'left',
    letterSpacing: '0.5px',
    lineHeight: 1.2,
    fontFamily: '',
    placement: 'fields'
  },
  fieldValues: {
    id: 'fieldValues',
    name: 'Field Values',
    visible: true,
    fontSize: 14,
    minSize: 11,
    maxSize: 26,
    fontWeight: '500',
    color: '',
    textAlign: 'left',
    letterSpacing: '0px',
    lineHeight: 1.35,
    fontFamily: '',
    placement: 'fields'
  },
  footerText: {
    id: 'footerText',
    name: 'Footer Notice',
    visible: true,
    text: 'This digital card is cryptographically verified against the KTPD Database.',
    fontSize: 12,
    minSize: 9,
    maxSize: 22,
    fontWeight: '400',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.4,
    fontFamily: '',
    placement: 'footer'
  },
  securityBadgeText: {
    id: 'securityBadgeText',
    name: 'Security Badge Text',
    visible: true,
    text: 'Permanent Dynamic QR Authentication Active',
    fontSize: 11,
    minSize: 9,
    maxSize: 20,
    fontWeight: '600',
    color: '',
    textAlign: 'center',
    letterSpacing: '0.25px',
    lineHeight: 1.2,
    fontFamily: '',
    placement: 'footer'
  }
};

export const DEFAULT_BRANDING_TEXT_ELEMENTS = [
  {
    id: 'orgName',
    name: 'Organization Name',
    content: 'KTPD Drivers Association',
    visible: true,
    fontSize: 24,
    minSize: 12,
    maxSize: 48,
    fontWeight: '700',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.25,
    fontFamily: '',
    marginTop: 0,
    marginBottom: 4,
    isDefault: true
  },
  {
    id: 'pageTitle',
    name: 'Profile Page Title',
    content: 'Official Digital Verification',
    visible: true,
    fontSize: 28,
    minSize: 14,
    maxSize: 56,
    fontWeight: '600',
    color: '',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: 1.25,
    fontFamily: '',
    marginTop: 2,
    marginBottom: 4,
    isDefault: true
  },
  {
    id: 'subtitle',
    name: 'Subtitle / Tagline',
    content: 'UAE Chapter • Kerala Transport Drivers Association',
    visible: true,
    fontSize: 16,
    minSize: 10,
    maxSize: 36,
    fontWeight: '500',
    color: '',
    textAlign: 'center',
    letterSpacing: '0.5px',
    lineHeight: 1.35,
    fontFamily: '',
    marginTop: 2,
    marginBottom: 0,
    isDefault: true
  }
];

export const DEFAULT_DESIGN = {
  template: 'modern', // 'modern' | 'minimal' | 'corporate' | 'gradient' | 'compact'
  branding: {
    orgName: 'KTPD Drivers Association',
    pageTitle: 'Official Digital Verification',
    subtitle: 'UAE Chapter • Kerala Transport Drivers Association',
    logoUrl: '/ktpd-logo.svg',
    logoSize: 64, // 40px to 120px
    headerLayout: 'center', // 'center' | 'left' | 'split'
    headerTextAlign: 'center', // 'center' | 'left' | 'right'
    orgNameFontSize: 24, // 12px to 48px
    orgNameFontWeight: '700', // '400' | '500' | '600' | '700'
    orgNameLetterSpacing: '0px',
    orgNameLineHeight: 1.25,
    pageTitleFontSize: 28, // 14px to 56px
    pageTitleFontWeight: '600', // '400' | '500' | '600' | '700'
    pageTitleLetterSpacing: '0px',
    pageTitleLineHeight: 1.25,
    subtitleFontSize: 16, // 10px to 32px
    subtitleFontWeight: '500', // '400' | '500' | '600' | '700'
    subtitleLetterSpacing: '0.5px',
    subtitleLineHeight: 1.35,
    textElements: DEFAULT_BRANDING_TEXT_ELEMENTS
  },
  colors: {
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
    inactiveStatusText: '#991B1B',
  },
  background: {
    type: 'gradient', // 'solid' | 'gradient' | 'image'
    solidColor: '#0F172A',
    gradientStart: '#0F172A',
    gradientEnd: '#1E293B',
    gradientDirection: '135deg',
    imageUrl: '',
    imagePosition: 'center', // 'center' | 'top' | 'bottom'
    imageSize: 'cover', // 'cover' | 'contain' | 'auto'
  },
  typography: {
    fontFamily: 'Inter', // 'Inter' | 'Poppins' | 'Nunito' | 'Montserrat' | 'Roboto'
    headingSize: '1.25rem',
    bodySize: '0.9375rem',
    labelSize: '0.75rem',
    fontWeight: '600',
    textAlign: 'center',
  },
  cardStyle: {
    borderRadius: '16px', // '0px', '8px', '16px', '24px', '32px'
    shadow: 'elevated', // 'none', 'subtle', 'medium', 'elevated'
    variant: 'card', // 'card', 'flat', 'bordered', 'glassmorphic'
    fieldSpacing: 'normal', // 'compact', 'normal', 'spacious'
    showDividers: true,
    dividerStyle: 'dashed', // 'solid', 'dashed', 'none'
  },
  idBadge: {
    style: 'pill', // 'pill' | 'outlined' | 'solid' | 'minimal'
  },
  statusBadge: {
    style: 'banner', // 'banner' | 'pill' | 'minimal'
  },
  memberPhoto: {
    shape: 'circle', // 'circle' | 'rounded' | 'square'
    size: 'medium', // 'small' (48px) | 'medium' (64px) | 'large' (80px)
  },
  fieldDisplay: {
    layout: 'grid', // 'grid' (2 columns) | 'list' (1 column)
    labelStyle: 'uppercase', // 'uppercase' | 'capitalize' | 'muted'
    showIcons: true,
    hiddenFields: [], // Array of field keys to hide from public profile (e.g. ['transportCompany'])
  },
  footer: {
    text: 'This digital card is cryptographically verified against the KTPD Database.',
    showSecurityBadge: true,
    securityBadgeText: 'Permanent Dynamic QR Authentication Active',
    showLastUpdated: true,
  },
  textElements: DEFAULT_TEXT_ELEMENTS,
  customTexts: [] // Array of { id, title, content, linkedFieldKey, placement, visible, fontSize, minSize, maxSize, fontWeight, color, textAlign, lineHeight, letterSpacing, fontFamily }
};

const profileDesignSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global_profile_design',
      unique: true,
      index: true
    },
    draft: {
      type: mongoose.Schema.Types.Mixed,
      default: () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))
    },
    published: {
      type: mongoose.Schema.Types.Mixed,
      default: () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Get or create the singleton global profile design document
 */
profileDesignSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'global_profile_design' });
  if (!doc) {
    doc = await this.create({
      key: 'global_profile_design',
      draft: JSON.parse(JSON.stringify(DEFAULT_DESIGN)),
      published: JSON.parse(JSON.stringify(DEFAULT_DESIGN)),
      isPublished: true,
      publishedAt: new Date(),
      updatedBy: 'system'
    });
  }
  return doc;
};

/**
 * Returns effective published design (merges defaults for any missing properties)
 */
profileDesignSchema.statics.getEffectivePublished = async function () {
  const doc = await this.getSingleton();
  const pub = doc.published || {};

  const mergedTextElements = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_TEXT_ELEMENTS)) {
    mergedTextElements[key] = {
      ...defaultVal,
      ...(pub.textElements?.[key] || {})
    };
  }
  if (pub.textElements) {
    for (const [k, v] of Object.entries(pub.textElements)) {
      if (!mergedTextElements[k]) {
        mergedTextElements[k] = v;
      }
    }
  }

  // Handle branding text elements (reorderable, removable, hideable array)
  const pubBranding = pub.branding || {};
  let brandingTextElements;
  if (Array.isArray(pubBranding.textElements)) {
    brandingTextElements = pubBranding.textElements;
  } else {
    brandingTextElements = DEFAULT_BRANDING_TEXT_ELEMENTS.map((el) => {
      const copy = { ...el };
      if (copy.id === 'orgName') {
        if (pubBranding.orgName) copy.content = pubBranding.orgName;
        if (pubBranding.orgNameFontSize) copy.fontSize = pubBranding.orgNameFontSize;
        if (pubBranding.orgNameFontWeight) copy.fontWeight = pubBranding.orgNameFontWeight;
        if (pubBranding.orgNameLetterSpacing) copy.letterSpacing = pubBranding.orgNameLetterSpacing;
        if (pubBranding.orgNameLineHeight) copy.lineHeight = pubBranding.orgNameLineHeight;
      } else if (copy.id === 'pageTitle') {
        if (pubBranding.pageTitle) copy.content = pubBranding.pageTitle;
        if (pubBranding.pageTitleFontSize) copy.fontSize = pubBranding.pageTitleFontSize;
        if (pubBranding.pageTitleFontWeight) copy.fontWeight = pubBranding.pageTitleFontWeight;
        if (pubBranding.pageTitleLetterSpacing) copy.letterSpacing = pubBranding.pageTitleLetterSpacing;
        if (pubBranding.pageTitleLineHeight) copy.lineHeight = pubBranding.pageTitleLineHeight;
      } else if (copy.id === 'subtitle') {
        if (pubBranding.subtitle !== undefined) copy.content = pubBranding.subtitle;
        if (pubBranding.subtitleFontSize) copy.fontSize = pubBranding.subtitleFontSize;
        if (pubBranding.subtitleFontWeight) copy.fontWeight = pubBranding.subtitleFontWeight;
        if (pubBranding.subtitleLetterSpacing) copy.letterSpacing = pubBranding.subtitleLetterSpacing;
        if (pubBranding.subtitleLineHeight) copy.lineHeight = pubBranding.subtitleLineHeight;
      }
      return copy;
    });
  }

  const orgNameEl = brandingTextElements.find((e) => e.id === 'orgName');
  const pageTitleEl = brandingTextElements.find((e) => e.id === 'pageTitle');
  const subtitleEl = brandingTextElements.find((e) => e.id === 'subtitle');

  const effectiveBranding = {
    ...DEFAULT_DESIGN.branding,
    ...pubBranding,
    orgName: orgNameEl ? orgNameEl.content : (Array.isArray(pubBranding.textElements) ? '' : (pubBranding.orgName || DEFAULT_DESIGN.branding.orgName)),
    pageTitle: pageTitleEl ? pageTitleEl.content : (Array.isArray(pubBranding.textElements) ? '' : (pubBranding.pageTitle || DEFAULT_DESIGN.branding.pageTitle)),
    subtitle: subtitleEl ? subtitleEl.content : (Array.isArray(pubBranding.textElements) ? '' : (pubBranding.subtitle || DEFAULT_DESIGN.branding.subtitle)),
    textElements: brandingTextElements
  };

  return {
    ...DEFAULT_DESIGN,
    ...pub,
    branding: effectiveBranding,
    colors: { ...DEFAULT_DESIGN.colors, ...(pub.colors || {}) },
    background: { ...DEFAULT_DESIGN.background, ...(pub.background || {}) },
    typography: { ...DEFAULT_DESIGN.typography, ...(pub.typography || {}) },
    cardStyle: { ...DEFAULT_DESIGN.cardStyle, ...(pub.cardStyle || {}) },
    idBadge: { ...DEFAULT_DESIGN.idBadge, ...(pub.idBadge || {}) },
    statusBadge: { ...DEFAULT_DESIGN.statusBadge, ...(pub.statusBadge || {}) },
    memberPhoto: { ...DEFAULT_DESIGN.memberPhoto, ...(pub.memberPhoto || {}) },
    fieldDisplay: { ...DEFAULT_DESIGN.fieldDisplay, ...(pub.fieldDisplay || {}) },
    footer: { ...DEFAULT_DESIGN.footer, ...(pub.footer || {}) },
    textElements: mergedTextElements,
    customTexts: Array.isArray(pub.customTexts) ? pub.customTexts : []
  };
};

const ProfileDesign = mongoose.model('ProfileDesign', profileDesignSchema);

export default ProfileDesign;


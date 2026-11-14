import mongoose from 'mongoose';

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
  },
  footer: {
    text: 'This digital card is cryptographically verified against the KTPD Database.',
    showSecurityBadge: true,
    securityBadgeText: 'Permanent Dynamic QR Authentication Active',
    showLastUpdated: true,
  }
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
  return {
    ...DEFAULT_DESIGN,
    ...(doc.published || {}),
    branding: { ...DEFAULT_DESIGN.branding, ...(doc.published?.branding || {}) },
    colors: { ...DEFAULT_DESIGN.colors, ...(doc.published?.colors || {}) },
    background: { ...DEFAULT_DESIGN.background, ...(doc.published?.background || {}) },
    typography: { ...DEFAULT_DESIGN.typography, ...(doc.published?.typography || {}) },
    cardStyle: { ...DEFAULT_DESIGN.cardStyle, ...(doc.published?.cardStyle || {}) },
    idBadge: { ...DEFAULT_DESIGN.idBadge, ...(doc.published?.idBadge || {}) },
    statusBadge: { ...DEFAULT_DESIGN.statusBadge, ...(doc.published?.statusBadge || {}) },
    memberPhoto: { ...DEFAULT_DESIGN.memberPhoto, ...(doc.published?.memberPhoto || {}) },
    fieldDisplay: { ...DEFAULT_DESIGN.fieldDisplay, ...(doc.published?.fieldDisplay || {}) },
    footer: { ...DEFAULT_DESIGN.footer, ...(doc.published?.footer || {}) }
  };
};

const ProfileDesign = mongoose.model('ProfileDesign', profileDesignSchema);

export default ProfileDesign;


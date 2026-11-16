import ProfileDesign, { DEFAULT_DESIGN, DEFAULT_TEXT_ELEMENTS, DEFAULT_BRANDING_TEXT_ELEMENTS } from '../models/ProfileDesign.js';
import AuditLog from '../models/AuditLog.js';

const mergeTextElements = (source) => {
  const merged = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_TEXT_ELEMENTS)) {
    merged[key] = {
      ...defaultVal,
      ...(source?.textElements?.[key] || {})
    };
  }
  if (source?.textElements) {
    for (const [k, v] of Object.entries(source.textElements)) {
      if (!merged[k]) {
        merged[k] = v;
      }
    }
  }
  return merged;
};

const mergeBranding = (sourceBranding) => {
  const merged = {
    ...DEFAULT_DESIGN.branding,
    ...(sourceBranding || {})
  };

  if (Array.isArray(sourceBranding?.textElements)) {
    merged.textElements = sourceBranding.textElements;
    const org = sourceBranding.textElements.find((e) => e.id === 'orgName');
    const title = sourceBranding.textElements.find((e) => e.id === 'pageTitle');
    const sub = sourceBranding.textElements.find((e) => e.id === 'subtitle');
    merged.orgName = (org && org.content !== undefined) ? org.content : '';
    merged.pageTitle = (title && title.content !== undefined) ? title.content : '';
    merged.subtitle = (sub && sub.content !== undefined) ? sub.content : '';
  } else if (!merged.textElements) {
    merged.textElements = DEFAULT_BRANDING_TEXT_ELEMENTS;
  }

  return merged;
};

/**
 * @route   GET /api/design
 * @desc    Get current profile design settings (both draft and published)
 * @access  Private (Admin)
 */
export const getDesignSettings = async (req, res, next) => {
  try {
    const doc = await ProfileDesign.getSingleton();

    res.json({
      success: true,
      data: {
        draft: doc.draft || DEFAULT_DESIGN,
        published: doc.published || DEFAULT_DESIGN,
        isPublished: doc.isPublished,
        publishedAt: doc.publishedAt,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/design/draft
 * @desc    Save working draft of profile design settings without affecting published profile
 * @access  Private (Admin)
 */
export const saveDraftSettings = async (req, res, next) => {
  try {
    const { draft } = req.body;

    if (!draft || typeof draft !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid design draft settings payload.'
      });
    }

    const doc = await ProfileDesign.getSingleton();
    doc.draft = {
      ...DEFAULT_DESIGN,
      ...draft,
      branding: mergeBranding(draft.branding),
      colors: { ...DEFAULT_DESIGN.colors, ...(draft.colors || {}) },
      background: { ...DEFAULT_DESIGN.background, ...(draft.background || {}) },
      typography: { ...DEFAULT_DESIGN.typography, ...(draft.typography || {}) },
      cardStyle: { ...DEFAULT_DESIGN.cardStyle, ...(draft.cardStyle || {}) },
      idBadge: { ...DEFAULT_DESIGN.idBadge, ...(draft.idBadge || {}) },
      statusBadge: { ...DEFAULT_DESIGN.statusBadge, ...(draft.statusBadge || {}) },
      memberPhoto: { ...DEFAULT_DESIGN.memberPhoto, ...(draft.memberPhoto || {}) },
      fieldDisplay: { ...DEFAULT_DESIGN.fieldDisplay, ...(draft.fieldDisplay || {}) },
      footer: { ...DEFAULT_DESIGN.footer, ...(draft.footer || {}) },
      textElements: mergeTextElements(draft),
      customTexts: Array.isArray(draft.customTexts) ? draft.customTexts : []
    };
    doc.updatedBy = req.admin?.username || 'admin';
    doc.markModified('draft');

    await doc.save();

    await AuditLog.create({
      action: 'UPDATE_PROFILE_DESIGN_DRAFT',
      performedBy: req.admin?.username || 'admin',
      details: { template: doc.draft.template, primaryColor: doc.draft.colors?.primary },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: 'Design draft saved successfully. (Live QR profiles remain unchanged until published)',
      data: {
        draft: doc.draft,
        published: doc.published,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/design/publish
 * @desc    Publish design settings live to all existing and new QR code public profiles
 * @access  Private (Admin)
 */
export const publishDesignSettings = async (req, res, next) => {
  try {
    const doc = await ProfileDesign.getSingleton();
    const settingsToPublish = req.body.settings || doc.draft || DEFAULT_DESIGN;

    const merged = {
      ...DEFAULT_DESIGN,
      ...settingsToPublish,
      branding: mergeBranding(settingsToPublish.branding),
      colors: { ...DEFAULT_DESIGN.colors, ...(settingsToPublish.colors || {}) },
      background: { ...DEFAULT_DESIGN.background, ...(settingsToPublish.background || {}) },
      typography: { ...DEFAULT_DESIGN.typography, ...(settingsToPublish.typography || {}) },
      cardStyle: { ...DEFAULT_DESIGN.cardStyle, ...(settingsToPublish.cardStyle || {}) },
      idBadge: { ...DEFAULT_DESIGN.idBadge, ...(settingsToPublish.idBadge || {}) },
      statusBadge: { ...DEFAULT_DESIGN.statusBadge, ...(settingsToPublish.statusBadge || {}) },
      memberPhoto: { ...DEFAULT_DESIGN.memberPhoto, ...(settingsToPublish.memberPhoto || {}) },
      fieldDisplay: { ...DEFAULT_DESIGN.fieldDisplay, ...(settingsToPublish.fieldDisplay || {}) },
      footer: { ...DEFAULT_DESIGN.footer, ...(settingsToPublish.footer || {}) },
      textElements: mergeTextElements(settingsToPublish),
      customTexts: Array.isArray(settingsToPublish.customTexts) ? settingsToPublish.customTexts : []
    };

    doc.published = merged;
    doc.draft = JSON.parse(JSON.stringify(merged));
    doc.isPublished = true;
    doc.publishedAt = new Date();
    doc.updatedBy = req.admin?.username || 'admin';
    doc.markModified('published');
    doc.markModified('draft');

    await doc.save();

    await AuditLog.create({
      action: 'PUBLISH_PROFILE_DESIGN',
      performedBy: req.admin?.username || 'admin',
      details: { template: merged.template, primaryColor: merged.colors?.primary },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: 'Design successfully published! All existing member QR profiles are now using this design.',
      data: {
        published: doc.published,
        draft: doc.draft,
        isPublished: true,
        lastPublishedAt: doc.publishedAt,
        publishedAt: doc.publishedAt,
        updatedBy: doc.updatedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/design/reset
 * @desc    Reset design settings to default KTPD profile appearance
 * @access  Private (Admin)
 */
export const resetDesignSettings = async (req, res, next) => {
  try {
    const doc = await ProfileDesign.getSingleton();

    doc.draft = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    doc.published = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    doc.isPublished = true;
    doc.publishedAt = new Date();
    doc.updatedBy = req.admin?.username || 'admin';
    doc.markModified('draft');
    doc.markModified('published');

    await doc.save();

    await AuditLog.create({
      action: 'RESET_PROFILE_DESIGN',
      performedBy: req.admin?.username || 'admin',
      details: { action: 'Full reset to default KTPD theme' },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: 'Profile design has been reset to the default KTPD theme.',
      data: {
        draft: doc.draft,
        published: doc.published,
        updatedAt: doc.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/design/upload
 * @desc    Upload logo or background image for profile design
 * @access  Private (Admin)
 */
export const uploadDesignImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    const relativeUrl = `/uploads/design/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully.',
      fileUrl: relativeUrl,
      filename: req.file.filename,
      data: {
        url: relativeUrl,
        fileUrl: relativeUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/public/profile-design
 * @desc    Get published public profile design for QR scans (No auth required)
 * @access  Public
 */
export const getPublicProfileDesign = async (req, res, next) => {
  try {
    const publishedDesign = await ProfileDesign.getEffectivePublished();
    res.json({
      success: true,
      data: publishedDesign
    });
  } catch (error) {
    next(error);
  }
};

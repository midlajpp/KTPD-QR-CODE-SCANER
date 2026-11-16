import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import app from '../server.js';
import Admin from '../models/Admin.js';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import ProfileDesign, { DEFAULT_DESIGN } from '../models/ProfileDesign.js';

let mongoServer;
let adminToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-profile-design-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  const passwordHash = await Admin.hashPassword('AdminPass2026!');
  await Admin.create({
    username: 'designadmin',
    email: 'admin@ktpd.org',
    passwordHash,
    role: 'superadmin'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'designadmin', password: 'AdminPass2026!' });
  adminToken = loginRes.body.token;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('QR PUBLIC PROFILE DESIGN CUSTOMIZER TESTS', () => {
  let sampleMemberQrToken = '';
  let sampleMemberId = '';

  // Seed sample member
  beforeAll(async () => {
    const memberRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rashid Khan',
        ktpdNo: 'D343',
        emiratesId: '784-1990-1234567-1',
        mobileNo: '+971 50 123 4567',
        transportCompany: 'Gulf Express Logistics',
        bloodGroup: 'O+',
        status: 'Active'
      });
    sampleMemberId = memberRes.body.data.memberId;
    sampleMemberQrToken = memberRes.body.data.qrToken;
  });

  // 1. Unauthenticated admin requests are rejected
  test('1. GET /api/design rejects requests without admin token', async () => {
    const res = await request(app).get('/api/design');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 2. Authenticated admin fetches initial design settings
  test('2. GET /api/design returns initialized default draft and published designs', async () => {
    const res = await request(app)
      .get('/api/design')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.draft).toBeDefined();
    expect(res.body.data.published).toBeDefined();
    expect(res.body.data.draft.template).toBe('modern');
    expect(res.body.data.draft.branding.orgName).toBe(DEFAULT_DESIGN.branding.orgName);
  });

  // 3. Admin saves a draft - Draft is updated, but published remains unchanged!
  test('3. PUT /api/design/draft updates draft without altering published live design', async () => {
    const updatedDraft = {
      ...DEFAULT_DESIGN,
      template: 'minimal',
      branding: {
        ...DEFAULT_DESIGN.branding,
        orgName: 'KTPD Drivers UAE Custom Org'
      },
      colors: {
        ...DEFAULT_DESIGN.colors,
        primary: '#059669' // Emerald Green
      }
    };

    const res = await request(app)
      .put('/api/design/draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ draft: updatedDraft });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.draft.template).toBe('minimal');
    expect(res.body.data.draft.branding.orgName).toBe('KTPD Drivers UAE Custom Org');
    expect(res.body.data.draft.colors.primary).toBe('#059669');

    // Verify published is still default
    const fetchRes = await request(app)
      .get('/api/design')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.body.data.draft.template).toBe('minimal');
    expect(fetchRes.body.data.published.template).toBe('modern'); // Still default!
  });

  // 4. Public member profile still returns published design (isolation check)
  test('4. GET /api/public/members/:token returns published design, not draft', async () => {
    const res = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.design).toBeDefined();
    expect(res.body.design.template).toBe('modern'); // Still published 'modern'
  });

  // 5. Publish Design - Promotes draft to published
  test('5. POST /api/design/publish promotes draft to published live', async () => {
    const res = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.published.template).toBe('minimal');
    expect(res.body.data.published.branding.orgName).toBe('KTPD Drivers UAE Custom Org');
    expect(res.body.data.published.colors.primary).toBe('#059669');
    expect(res.body.data.lastPublishedAt).toBeDefined();
  });

  // 6. Public QR profile scan immediately receives newly published design without changing token
  test('6. GET /api/public/members/:token automatically serves updated published design with unchanged qrToken', async () => {
    const res = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.design.template).toBe('minimal');
    expect(res.body.design.branding.orgName).toBe('KTPD Drivers UAE Custom Org');
    expect(res.body.design.colors.primary).toBe('#059669');
  });

  // 7. GET /api/public/profile-design returns published design publicly
  test('7. GET /api/public/profile-design returns published design without authentication', async () => {
    const res = await request(app).get('/api/public/profile-design');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.template).toBe('minimal');
    expect(res.body.data.branding.orgName).toBe('KTPD Drivers UAE Custom Org');
  });

  // 8. Upload Design Image
  test('8. POST /api/design/upload accepts valid PNG/JPEG image upload', async () => {
    // Create a temporary 1x1 test image buffer
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/design/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', testImageBuffer, 'test-logo.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileUrl).toMatch(/^\/uploads\/design\//);
  });

  // 9. Reset Design to Default
  test('9. POST /api/design/reset restores official default KTPD theme', async () => {
    const res = await request(app)
      .post('/api/design/reset')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.draft.template).toBe('modern');
    expect(res.body.data.published.template).toBe('modern');
    expect(res.body.data.published.branding.orgName).toBe(DEFAULT_DESIGN.branding.orgName);
    expect(res.body.data.published.branding.orgNameFontSize).toBe(24);
    expect(res.body.data.published.branding.pageTitleFontSize).toBe(28);
    expect(res.body.data.published.branding.subtitleFontSize).toBe(16);

    // Verify public profile now has default modern template and default sizes
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.body.design.template).toBe('modern');
    expect(publicRes.body.design.branding.orgNameFontSize).toBe(24);
    expect(publicRes.body.design.branding.pageTitleFontSize).toBe(28);
    expect(publicRes.body.design.branding.subtitleFontSize).toBe(16);
  });

  // 10. Independent Text Size Customization and Live Publishing
  test('10. Independent text size customization (orgNameFontSize, pageTitleFontSize, subtitleFontSize) saves, publishes, and applies to public QR scan', async () => {
    const customTypographyDraft = {
      ...DEFAULT_DESIGN,
      branding: {
        ...DEFAULT_DESIGN.branding,
        orgName: 'Kerala Transport Drivers Association',
        orgNameFontSize: 34,
        orgNameFontWeight: '700',
        orgNameLetterSpacing: '1px',
        orgNameLineHeight: 1.4,
        pageTitle: 'Official Verified Member',
        pageTitleFontSize: 42,
        pageTitleFontWeight: '600',
        pageTitleLetterSpacing: '0.5px',
        pageTitleLineHeight: 1.3,
        subtitle: 'Government Registered UAE Transport Chapter',
        subtitleFontSize: 22,
        subtitleFontWeight: '500',
        subtitleLetterSpacing: '2px',
        subtitleLineHeight: 1.5,
        headerTextAlign: 'left'
      }
    };

    // Save as draft
    const draftRes = await request(app)
      .put('/api/design/draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ draft: customTypographyDraft });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.draft.branding.orgNameFontSize).toBe(34);
    expect(draftRes.body.data.draft.branding.pageTitleFontSize).toBe(42);
    expect(draftRes.body.data.draft.branding.subtitleFontSize).toBe(22);
    expect(draftRes.body.data.draft.branding.headerTextAlign).toBe('left');

    // Verify draft is isolated from live public scan before publishing
    const unpubRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(unpubRes.body.design.branding.orgNameFontSize).toBe(24); // Still default!

    // Publish custom typography live
    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.published.branding.orgNameFontSize).toBe(34);
    expect(pubRes.body.data.published.branding.pageTitleFontSize).toBe(42);
    expect(pubRes.body.data.published.branding.subtitleFontSize).toBe(22);
    expect(pubRes.body.data.published.branding.headerTextAlign).toBe('left');

    // Verify live public member QR scan receives published font sizes immediately
    const livePublicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(livePublicRes.status).toBe(200);
    expect(livePublicRes.body.data.memberId).toBe('D343'); // Permanent ID preserved
    expect(livePublicRes.body.design.branding.orgNameFontSize).toBe(34);
    expect(livePublicRes.body.design.branding.pageTitleFontSize).toBe(42);
    expect(livePublicRes.body.design.branding.subtitleFontSize).toBe(22);
    expect(livePublicRes.body.design.branding.headerTextAlign).toBe('left');
    expect(livePublicRes.body.design.branding.orgNameLetterSpacing).toBe('1px');
  });

  // 11. Full textElements customization and individual show/hide visibility
  test('11. textElements customization (memberName, memberId, sectionHeading, fieldLabels, etc.) saves, publishes, and applies to public QR scans', async () => {
    const textCustomizationDraft = {
      ...DEFAULT_DESIGN,
      textElements: {
        ...DEFAULT_DESIGN.textElements,
        orgName: {
          ...DEFAULT_DESIGN.textElements.orgName,
          text: 'KTPD Drivers Union UAE',
          fontSize: 30,
          fontWeight: '700',
          color: '#10B981',
          textAlign: 'center'
        },
        memberName: {
          ...DEFAULT_DESIGN.textElements.memberName,
          fontSize: 28,
          fontWeight: '700',
          color: '#1E293B',
          textAlign: 'center'
        },
        memberId: {
          ...DEFAULT_DESIGN.textElements.memberId,
          fontSize: 18,
          fontWeight: '700',
          color: '#3B82F6',
          textAlign: 'center'
        },
        sectionHeading: {
          ...DEFAULT_DESIGN.textElements.sectionHeading,
          text: 'Official Driver Credentials',
          fontSize: 18,
          fontWeight: '600',
          color: '#1D4ED8',
          textAlign: 'left'
        },
        fieldLabels: {
          ...DEFAULT_DESIGN.textElements.fieldLabels,
          fontSize: 13,
          fontWeight: '600',
          color: '#475569'
        },
        fieldValues: {
          ...DEFAULT_DESIGN.textElements.fieldValues,
          fontSize: 15,
          fontWeight: '500',
          color: '#0F172A'
        },
        footerText: {
          ...DEFAULT_DESIGN.textElements.footerText,
          text: 'Cryptographically authenticated by KTPD Authority.',
          fontSize: 13,
          color: '#64748B'
        }
      },
      fieldDisplay: {
        ...DEFAULT_DESIGN.fieldDisplay,
        hiddenFields: ['emergencyContact'] // Individually hidden field
      }
    };

    // Save Draft
    const draftRes = await request(app)
      .put('/api/design/draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ draft: textCustomizationDraft });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.draft.textElements.orgName.text).toBe('KTPD Drivers Union UAE');
    expect(draftRes.body.data.draft.textElements.orgName.fontSize).toBe(30);
    expect(draftRes.body.data.draft.textElements.memberName.fontSize).toBe(28);
    expect(draftRes.body.data.draft.textElements.sectionHeading.text).toBe('Official Driver Credentials');
    expect(draftRes.body.data.draft.fieldDisplay.hiddenFields).toContain('emergencyContact');

    // Publish
    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.published.textElements.orgName.text).toBe('KTPD Drivers Union UAE');
    expect(pubRes.body.data.published.textElements.sectionHeading.text).toBe('Official Driver Credentials');

    // Verify Public Scan delivers the published text elements
    const liveRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.design.textElements.orgName.text).toBe('KTPD Drivers Union UAE');
    expect(liveRes.body.design.textElements.orgName.fontSize).toBe(30);
    expect(liveRes.body.design.textElements.memberName.fontSize).toBe(28);
    expect(liveRes.body.design.textElements.sectionHeading.text).toBe('Official Driver Credentials');
    expect(liveRes.body.design.fieldDisplay.hiddenFields).toContain('emergencyContact');
  });

  // 12. Custom text elements (customTexts) and linked member fields
  test('12. Custom text elements (customTexts) save, publish, and render on public QR scan without modifying Member records', async () => {
    const customTextItem = {
      id: 'ct_test_123',
      title: 'Disciplinary Advisory',
      content: 'Authorized to operate heavy commercial vehicles in all UAE emirates.',
      linkedFieldKey: '',
      placement: 'above_fields',
      visible: true,
      fontSize: 14,
      minSize: 10,
      maxSize: 48,
      fontWeight: '500',
      color: '#1E293B',
      textAlign: 'left',
      lineHeight: 1.35,
      letterSpacing: '0px'
    };

    const linkedFieldItem = {
      id: 'ct_field_transport',
      title: 'Transport Company Designation',
      content: '',
      linkedFieldKey: 'transportCompany',
      placement: 'header',
      visible: true,
      fontSize: 15,
      minSize: 10,
      maxSize: 48,
      fontWeight: '600',
      color: '#0284C7',
      textAlign: 'center',
      lineHeight: 1.25,
      letterSpacing: '0.5px'
    };

    // Save Draft with custom texts
    const draftRes = await request(app)
      .put('/api/design/draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        draft: {
          ...DEFAULT_DESIGN,
          customTexts: [customTextItem, linkedFieldItem]
        }
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.draft.customTexts).toHaveLength(2);
    expect(draftRes.body.data.draft.customTexts[0].title).toBe('Disciplinary Advisory');
    expect(draftRes.body.data.draft.customTexts[1].linkedFieldKey).toBe('transportCompany');

    // Publish
    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.published.customTexts).toHaveLength(2);

    // Verify Public QR scan serves custom texts
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.design.customTexts).toHaveLength(2);
    expect(publicRes.body.design.customTexts[0].title).toBe('Disciplinary Advisory');
    expect(publicRes.body.design.customTexts[0].content).toBe('Authorized to operate heavy commercial vehicles in all UAE emirates.');
    expect(publicRes.body.design.customTexts[1].linkedFieldKey).toBe('transportCompany');
  });

  // 13. Safety Rule: Removing text from design does not alter member records in MongoDB
  test('13. Safety Rule: Hiding or deleting text elements never modifies or deletes Member records in MongoDB', async () => {
    // Member record before
    const memberBefore = await Member.findOne({ qrToken: sampleMemberQrToken });
    expect(memberBefore).toBeDefined();
    expect(memberBefore.name).toBe('Rashid Khan');
    expect(memberBefore.transportCompany).toBe('Gulf Express Logistics');

    // Hide everything in design draft & publish
    const emptyDesignDraft = {
      ...DEFAULT_DESIGN,
      textElements: {
        ...DEFAULT_DESIGN.textElements,
        orgName: { ...DEFAULT_DESIGN.textElements.orgName, visible: false },
        memberName: { ...DEFAULT_DESIGN.textElements.memberName, visible: false },
        memberId: { ...DEFAULT_DESIGN.textElements.memberId, visible: false }
      },
      customTexts: [] // Empty custom texts
    };

    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ settings: emptyDesignDraft });

    expect(pubRes.status).toBe(200);

    // Member record in MongoDB remains completely intact and unaltered
    const memberAfter = await Member.findOne({ qrToken: sampleMemberQrToken });
    expect(memberAfter).toBeDefined();
    expect(memberAfter.name).toBe('Rashid Khan');
    expect(memberAfter.transportCompany).toBe('Gulf Express Logistics');
    expect(memberAfter.memberId).toBe('D343');
    expect(memberAfter.qrToken).toBe(sampleMemberQrToken); // Permanent QR token unchanged
  });

  // 14. Branding Text Elements: Add custom branding element with typography, color, and spacing
  test('14. Branding Text Elements: Can add custom branding element with full styling and publish live', async () => {
    const customBrandingElement = {
      id: 'brand_chapter_tag',
      name: 'Chapter Tagline',
      content: 'UAE Central Operations Division • Dubai Chapter',
      visible: true,
      fontSize: 15,
      fontWeight: '600',
      color: '#38BDF8',
      fontFamily: 'Montserrat',
      textAlign: 'center',
      marginTop: 2,
      marginBottom: 6,
      lineHeight: '1.3',
      letterSpacing: '0.5px'
    };

    const brandingWithCustom = {
      ...DEFAULT_DESIGN.branding,
      textElements: [
        ...DEFAULT_DESIGN.branding.textElements,
        customBrandingElement
      ]
    };

    const draftRes = await request(app)
      .put('/api/design/draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        draft: {
          ...DEFAULT_DESIGN,
          branding: brandingWithCustom
        }
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.draft.branding.textElements).toHaveLength(4);
    const addedDraftEl = draftRes.body.data.draft.branding.textElements.find((e) => e.id === 'brand_chapter_tag');
    expect(addedDraftEl).toBeDefined();
    expect(addedDraftEl.content).toBe('UAE Central Operations Division • Dubai Chapter');
    expect(addedDraftEl.fontFamily).toBe('Montserrat');

    // Publish
    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          ...DEFAULT_DESIGN,
          branding: brandingWithCustom
        }
      });

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.published.branding.textElements).toHaveLength(4);

    // Verify Public Scan
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.status).toBe(200);
    const pubBrandingEls = publicRes.body.design.branding.textElements;
    expect(pubBrandingEls).toHaveLength(4);
    const pubAddedEl = pubBrandingEls.find((e) => e.id === 'brand_chapter_tag');
    expect(pubAddedEl).toBeDefined();
    expect(pubAddedEl.content).toBe('UAE Central Operations Division • Dubai Chapter');
    expect(pubAddedEl.color).toBe('#38BDF8');
  });

  // 15. Branding Text Elements: Reorder elements and verify exact sequence in public profile
  test('15. Branding Text Elements: Reordered sequence is preserved in live preview and published public profile', async () => {
    // Reorder: subtitle first, then pageTitle, then orgName
    const reorderedElements = [
      {
        id: 'subtitle',
        name: 'Subtitle',
        content: 'Official UAE Chapter',
        visible: true,
        fontSize: 14,
        fontWeight: '500',
        color: '#93C5FD',
        fontFamily: 'inherit',
        textAlign: 'center'
      },
      {
        id: 'pageTitle',
        name: 'Page Title',
        content: 'Driver Identity Verification',
        visible: true,
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'inherit',
        textAlign: 'center'
      },
      {
        id: 'orgName',
        name: 'Organization Name',
        content: 'Kerala Transport Drivers Association (KTPD)',
        visible: true,
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'inherit',
        textAlign: 'center'
      }
    ];

    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          ...DEFAULT_DESIGN,
          branding: {
            ...DEFAULT_DESIGN.branding,
            textElements: reorderedElements
          }
        }
      });

    expect(pubRes.status).toBe(200);
    const publishedElements = pubRes.body.data.published.branding.textElements;
    expect(publishedElements[0].id).toBe('subtitle');
    expect(publishedElements[1].id).toBe('pageTitle');
    expect(publishedElements[2].id).toBe('orgName');

    // Verify Public Scan reflects exact reordered sequence
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.status).toBe(200);
    const publicElements = publicRes.body.design.branding.textElements;
    expect(publicElements[0].id).toBe('subtitle');
    expect(publicElements[1].id).toBe('pageTitle');
    expect(publicElements[2].id).toBe('orgName');
  });

  // 16. Branding Text Elements: Hide toggle and empty text handling
  test('16. Branding Text Elements: Hidden elements and empty text are cleanly handled', async () => {
    const mixedElements = [
      {
        id: 'orgName',
        name: 'Organization Name',
        content: 'KTPD Drivers Association',
        visible: true
      },
      {
        id: 'pageTitle',
        name: 'Page Title',
        content: 'Driver Verification',
        visible: false // Hidden by admin toggle
      },
      {
        id: 'subtitle',
        name: 'Subtitle',
        content: '', // Empty text - auto-hidden
        visible: true
      }
    ];

    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          ...DEFAULT_DESIGN,
          branding: {
            ...DEFAULT_DESIGN.branding,
            textElements: mixedElements
          }
        }
      });

    expect(pubRes.status).toBe(200);
    const pubElements = pubRes.body.data.published.branding.textElements;
    expect(pubElements.find((e) => e.id === 'pageTitle').visible).toBe(false);
    expect(pubElements.find((e) => e.id === 'subtitle').content).toBe('');

    // Public QR scan
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.status).toBe(200);
    const scanElements = publicRes.body.design.branding.textElements;
    const pageTitleItem = scanElements.find((e) => e.id === 'pageTitle');
    expect(pageTitleItem.visible).toBe(false);
  });

  // 17. Branding Text Elements: Remove default elements (e.g. orgName or subtitle) permanently
  test('17. Branding Text Elements: Can remove default branding elements completely from configuration', async () => {
    // Keep only pageTitle and a custom element, deleting orgName and subtitle
    const remainingElements = [
      {
        id: 'pageTitle',
        name: 'Page Title',
        content: 'KTPD Digital Card',
        visible: true,
        fontSize: 24
      },
      {
        id: 'brand_custom_id',
        name: 'Govt Reg Number',
        content: 'Reg No: KTPD/UAE/2026/001',
        visible: true,
        fontSize: 14
      }
    ];

    const pubRes = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          ...DEFAULT_DESIGN,
          branding: {
            ...DEFAULT_DESIGN.branding,
            textElements: remainingElements
          }
        }
      });

    expect(pubRes.status).toBe(200);
    const publishedElements = pubRes.body.data.published.branding.textElements;
    expect(publishedElements).toHaveLength(2);
    expect(publishedElements.some((e) => e.id === 'orgName')).toBe(false);
    expect(publishedElements.some((e) => e.id === 'subtitle')).toBe(false);

    // Verify Public Scan does NOT contain orgName or subtitle
    const publicRes = await request(app).get(`/api/public/members/${sampleMemberQrToken}`);
    expect(publicRes.status).toBe(200);
    const publicElements = publicRes.body.design.branding.textElements;
    expect(publicElements).toHaveLength(2);
    expect(publicElements.some((e) => e.id === 'orgName')).toBe(false);
    expect(publicElements.some((e) => e.id === 'subtitle')).toBe(false);
    expect(publicElements[0].id).toBe('pageTitle');
    expect(publicElements[1].id).toBe('brand_custom_id');
  });
});


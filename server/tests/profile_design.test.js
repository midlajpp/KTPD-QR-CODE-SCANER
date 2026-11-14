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
});


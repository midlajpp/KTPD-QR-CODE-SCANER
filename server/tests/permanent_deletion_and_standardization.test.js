import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import MemberField from '../models/MemberField.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { generateSecureToken } from '../utils/crypto.js';
import { getMemberDisplayId } from '../services/exportService.js';
import { exportMembersToCsv } from '../services/csvService.js';

let mongoServer;
let adminToken = '';
let superAdminToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-perm-delete-standardization-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create Super Admin
  const superHash = await Admin.hashPassword('SuperAdminPass123!');
  await Admin.create({
    fullName: 'Master Super Admin',
    username: 'superadmin_perm',
    email: 'superadmin_perm@ktpd.org',
    passwordHash: superHash,
    role: 'superadmin',
    status: 'active'
  });

  const superLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'superadmin_perm@ktpd.org', password: 'SuperAdminPass123!' });
  superAdminToken = superLogin.body.token;

  // Create Regular Admin
  const adminHash = await Admin.hashPassword('AdminPass123!');
  await Admin.create({
    fullName: 'Operational Admin',
    username: 'admin_perm',
    email: 'admin_perm@ktpd.org',
    passwordHash: adminHash,
    role: 'admin',
    status: 'active'
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin_perm@ktpd.org', password: 'AdminPass123!' });
  adminToken = adminLogin.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Permanent Deletion and Membership ID Standardization Tests', () => {
  let memberA001, memberD343, member00125, memberUnrelated;

  beforeEach(async () => {
    await Member.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Member A001
    memberA001 = await Member.create({
      memberId: 'A001',
      qrToken: generateSecureToken(32),
      name: 'Ahmed Al-Mansoori',
      emiratesId: '784-1985-1111111-1',
      mobileNo: '+971501111111',
      transportCompany: 'Gulf Haulage LLC',
      bloodGroup: 'O+',
      status: 'Active',
      isDeleted: false
    });

    // 2. Member D343
    memberD343 = await Member.create({
      memberId: 'D343',
      qrToken: generateSecureToken(32),
      name: 'Deepak Kumar',
      emiratesId: '784-1988-2222222-2',
      mobileNo: '+971502222222',
      transportCompany: 'Oasis Transport LLC',
      bloodGroup: 'B+',
      status: 'Active',
      isDeleted: false
    });

    // 3. Member with leading zeros: 00125
    member00125 = await Member.create({
      memberId: '00125',
      qrToken: generateSecureToken(32),
      name: 'Rashid Khan',
      emiratesId: '784-1992-3333333-3',
      mobileNo: '+971503333333',
      transportCompany: 'Emirates Freight Co',
      bloodGroup: 'A+',
      status: 'Active',
      isDeleted: false
    });

    // 4. Unrelated Member that should remain protected
    memberUnrelated = await Member.create({
      memberId: 'D999',
      qrToken: generateSecureToken(32),
      name: 'Suresh Menon',
      emiratesId: '784-1980-4444444-4',
      mobileNo: '+971504444444',
      transportCompany: 'Kerala Logistics',
      bloodGroup: 'AB+',
      status: 'Active',
      isDeleted: false
    });
  });

  // -------------------------------------------------------------
  // Requirement 1 & 2: Single Member Permanent Deletion
  // -------------------------------------------------------------
  test('DELETE /api/members/:id permanently deletes member from MongoDB (not soft delete)', async () => {
    const tokenA001 = memberA001.qrToken;
    const docIdA001 = memberA001._id;

    const res = await request(app)
      .delete(`/api/members/${memberA001.memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/permanently deleted/i);

    // Verify document is completely removed from MongoDB
    const docById = await Member.findById(docIdA001);
    expect(docById).toBeNull();

    const docByMemberId = await Member.findOne({ memberId: 'A001' });
    expect(docByMemberId).toBeNull();

    // Verify directory count decreased
    const dirRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dirRes.body.pagination.total).toBe(3);
    const memberIds = dirRes.body.data.map((m) => m.memberId);
    expect(memberIds).not.toContain('A001');

    // Verify dashboard count reflects deletion
    const dashRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.body.data.totalMembers).toBe(3);

    // Verify public QR profile returns 404 for deleted member
    const qrRes = await request(app).get(`/api/public/members/${tokenA001}`);
    expect(qrRes.status).toBe(404);
    expect(qrRes.body.isFound).toBe(false);

    // Verify audit log
    const log = await AuditLog.findOne({ targetMemberId: 'A001', action: 'DELETE_MEMBER' });
    expect(log).toBeDefined();
    expect(log.details.permanentlyDeleted).toBe(true);
  });

  // -------------------------------------------------------------
  // Requirement 3: Bulk Member Permanent Deletion
  // -------------------------------------------------------------
  test('POST /api/members/bulk-delete permanently deletes selected members from MongoDB', async () => {
    const docIdD343 = memberD343._id;
    const docId00125 = member00125._id;
    const tokenD343 = memberD343.qrToken;
    const token00125 = member00125.qrToken;

    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343', '00125'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(2);
    expect(res.body.failedCount).toBe(0);

    // Verify records are completely removed from MongoDB
    expect(await Member.findById(docIdD343)).toBeNull();
    expect(await Member.findById(docId00125)).toBeNull();

    // Verify unrelated member D999 and A001 are still intact
    const remaining = await Member.find({});
    expect(remaining.length).toBe(2);
    const remainingIds = remaining.map((m) => m.memberId);
    expect(remainingIds).toContain('A001');
    expect(remainingIds).toContain('D999');

    // Verify QR scan returns 404 for deleted members
    const qrResD343 = await request(app).get(`/api/public/members/${tokenD343}`);
    expect(qrResD343.status).toBe(404);

    const qrRes00125 = await request(app).get(`/api/public/members/${token00125}`);
    expect(qrRes00125.status).toBe(404);

    // Verify QR scan returns 200 for surviving member
    const qrResA001 = await request(app).get(`/api/public/members/${memberA001.qrToken}`);
    expect(qrResA001.status).toBe(200);
    expect(qrResA001.body.data.memberId).toBe('A001');
  });

  // -------------------------------------------------------------
  // Requirement 4: Data Protection - Admins, Roles, Fields
  // -------------------------------------------------------------
  test('Deleting members leaves Admin accounts and MemberFields completely protected', async () => {
    const adminCountBefore = await Admin.countDocuments();
    const fieldsCountBefore = await MemberField.countDocuments();

    await request(app)
      .delete(`/api/members/${memberD343.memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['A001'] });

    const adminCountAfter = await Admin.countDocuments();
    const fieldsCountAfter = await MemberField.countDocuments();

    expect(adminCountAfter).toBe(adminCountBefore);
    expect(fieldsCountAfter).toBe(fieldsCountBefore);
  });

  // -------------------------------------------------------------
  // Requirement 5: Membership ID Standardization
  // -------------------------------------------------------------
  test('Preserves exact string format for A001, D343, and 00125 with leading zeros', async () => {
    // 1. In getMemberDisplayId service
    expect(getMemberDisplayId(memberA001)).toBe('A001');
    expect(getMemberDisplayId(memberD343)).toBe('D343');
    expect(getMemberDisplayId(member00125)).toBe('00125'); // Leading zeros strictly preserved!

    // 2. In public QR profile response
    const pubRes00125 = await request(app).get(`/api/public/members/${member00125.qrToken}`);
    expect(pubRes00125.status).toBe(200);
    expect(pubRes00125.body.data.memberId).toBe('00125');

    const pubResA001 = await request(app).get(`/api/public/members/${memberA001.qrToken}`);
    expect(pubResA001.status).toBe(200);
    expect(pubResA001.body.data.memberId).toBe('A001');

    // 3. In CSV Export
    const csvContent = await exportMembersToCsv([memberA001, memberD343, member00125]);
    expect(csvContent).toContain('"A001"');
    expect(csvContent).toContain('"D343"');
    expect(csvContent).toContain('"00125"'); // Must be quoted string with leading zero preserved
    expect(csvContent).toContain('"A001.png"');
    expect(csvContent).toContain('"D343.png"');
    expect(csvContent).toContain('"00125.png"'); // QR filename matches memberId

    // 4. In single QR PNG download
    const qrPngRes = await request(app)
      .get(`/api/members/${member00125.memberId}/qr?download=true`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(qrPngRes.status).toBe(200);
    expect(qrPngRes.headers['content-disposition']).toContain('00125.png');
  });
});

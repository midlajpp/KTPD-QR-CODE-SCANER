import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import MemberField from '../models/MemberField.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { generateSecureToken } from '../utils/crypto.js';

let mongoServer;
let superAdminToken = '';
let adminToken = '';
let staffToken = '';

let member1, member2, member3, member4, member5;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-bulk-delete-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create Super Admin
  const superHash = await Admin.hashPassword('SuperSecret123!');
  await Admin.create({
    fullName: 'Master Super Admin',
    username: 'superadmin_bulk',
    email: 'superadmin@ktpd.org',
    passwordHash: superHash,
    role: 'superadmin',
    status: 'active'
  });

  const superLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'superadmin_bulk', password: 'SuperSecret123!' });
  superAdminToken = superLogin.body.token;

  // Create Regular Admin
  const adminHash = await Admin.hashPassword('AdminSecret123!');
  await Admin.create({
    fullName: 'Operational Admin',
    username: 'admin_bulk',
    email: 'admin@ktpd.org',
    passwordHash: adminHash,
    role: 'admin',
    status: 'active'
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin_bulk', password: 'AdminSecret123!' });
  adminToken = adminLogin.body.token;

  // Create Staff
  const staffHash = await Admin.hashPassword('StaffSecret123!');
  await Admin.create({
    fullName: 'Desk Staff User',
    username: 'staff_bulk',
    email: 'staff@ktpd.org',
    passwordHash: staffHash,
    role: 'staff',
    status: 'active'
  });

  const staffLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'staff_bulk', password: 'StaffSecret123!' });
  staffToken = staffLogin.body.token;
});

beforeEach(async () => {
  // Clean members before each test block
  await Member.deleteMany({});

  // Seed 5 active members
  member1 = await Member.create({
    memberId: 'D343',
    qrToken: generateSecureToken(),
    name: 'Muhammad Midlaj',
    mobileNo: '+971501112233',
    bloodGroup: 'B+',
    status: 'Active',
    customFields: { ktpdNo: 'D343', company: 'Logistics Co' }
  });

  member2 = await Member.create({
    memberId: 'D344',
    qrToken: generateSecureToken(),
    name: 'Abdul Rahman',
    mobileNo: '+971502223344',
    bloodGroup: 'O+',
    status: 'Active',
    customFields: { ktpdNo: 'D344', company: 'Fleet Trans' }
  });

  member3 = await Member.create({
    memberId: 'D345',
    qrToken: generateSecureToken(),
    name: 'Suresh Kumar',
    mobileNo: '+971503334455',
    bloodGroup: 'A+',
    status: 'Active',
    customFields: { ktpdNo: 'D345', company: 'Fast Express' }
  });

  member4 = await Member.create({
    memberId: 'D346',
    qrToken: generateSecureToken(),
    name: 'Faisal Mohammed',
    mobileNo: '+971504445566',
    bloodGroup: 'AB+',
    status: 'Active',
    customFields: { ktpdNo: 'D346', company: 'Dubai Cargo' }
  });

  member5 = await Member.create({
    memberId: 'D347',
    qrToken: generateSecureToken(),
    name: 'Vineeth Nair',
    mobileNo: '+971505556677',
    bloodGroup: 'O-',
    status: 'Active',
    customFields: { ktpdNo: 'D347', company: 'Prime Transit' }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Bulk Delete Members - Security & Authorization', () => {
  test('rejects unauthenticated bulk delete request with 401', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .send({ ids: ['D343', 'D344'] });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects staff role from performing bulk delete with 403', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ ids: ['D343', 'D344'] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('allows admin role to perform bulk delete', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: ['D343'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(1);
  });

  test('allows superadmin role to perform bulk delete', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D344'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(1);
  });
});

describe('Bulk Delete Members - Request Validation', () => {
  test('rejects missing or empty ids array with 400', async () => {
    const res1 = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    expect(res1.status).toBe(400);
    expect(res1.body.success).toBe(false);

    const res2 = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: [] });

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
  });

  test('rejects array containing only whitespace or invalid items with 400', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['   ', ''] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Bulk Delete Members - Functional Deletion & Data Protection', () => {
  test('deletes a single member selected from list', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(1);
    expect(res.body.failedCount).toBe(0);

    // Verify member in DB is permanently deleted
    const m1 = await Member.findOne({ memberId: 'D343' });
    expect(m1).toBeNull();

    // Verify directory does not return deleted member
    const listRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.body.pagination.total).toBe(4);
    const listedIds = listRes.body.data.map((m) => m.memberId);
    expect(listedIds).not.toContain('D343');

    // Verify public profile is no longer active
    const pubRes = await request(app).get(`/api/public/members/${member1.qrToken}`);
    expect(pubRes.status).toBe(404);
  });

  test('deletes multiple selected members simultaneously', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343', 'D344', 'D345'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(3);
    expect(res.body.failedCount).toBe(0);

    // Verify deleted members are completely gone from MongoDB
    const countInDb = await Member.countDocuments({
      memberId: { $in: ['D343', 'D344', 'D345'] }
    });
    expect(countInDb).toBe(0);

    // Verify remaining unselected members are completely intact
    const remainingMembers = await Member.find({ isDeleted: false });
    expect(remainingMembers.length).toBe(2);
    const remainingIds = remainingMembers.map((m) => m.memberId);
    expect(remainingIds).toContain('D346');
    expect(remainingIds).toContain('D347');
  });

  test('supports deleting by MongoDB _id or string memberId interchangeably', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: [member1._id.toString(), 'D344'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(2);

    const checkM1 = await Member.findById(member1._id);
    const checkM2 = await Member.findById(member2._id);
    expect(checkM1).toBeNull();
    expect(checkM2).toBeNull();
  });

  test('supports Select All (all 5 members)', async () => {
    const allIds = ['D343', 'D344', 'D345', 'D346', 'D347'];
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: allIds });

    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(5);

    const activeCount = await Member.countDocuments({ isDeleted: false });
    expect(activeCount).toBe(0);
  });

  test('reports failed IDs when non-existent IDs are supplied', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343', 'NON_EXISTENT_999'] });

    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(1);
    expect(res.body.failedCount).toBe(1);
    expect(res.body.failedIds).toContain('NON_EXISTENT_999');
  });

  test('returns 404 if all supplied IDs are non-existent', async () => {
    const res = await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['FAKE_1', 'FAKE_2'] });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.deletedCount).toBe(0);
    expect(res.body.failedIds).toEqual(['FAKE_1', 'FAKE_2']);
  });

  test('supports DELETE /api/members/bulk route alias', async () => {
    const res = await request(app)
      .delete('/api/members/bulk')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deletedCount).toBe(1);
  });

  test('preserves Admin accounts, custom fields, and audit log entries', async () => {
    // Perform bulk delete
    await request(app)
      .post('/api/members/bulk-delete')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ids: ['D343', 'D344'] });

    // 1. Verify Admin accounts are untouched
    const adminCount = await Admin.countDocuments();
    expect(adminCount).toBe(3);

    // 2. Verify MemberField definitions are intact
    const fieldsCount = await MemberField.countDocuments();
    expect(fieldsCount).toBeGreaterThan(0);

    // 3. Verify AuditLog recorded BULK_DELETE_MEMBERS action
    const log = await AuditLog.findOne({ action: 'BULK_DELETE_MEMBERS' }).sort({ createdAt: -1 });
    expect(log).toBeDefined();
    expect(log.details.deletedCount).toBe(2);
    expect(log.details.deletedMemberIds).toContain('D343');
    expect(log.details.deletedMemberIds).toContain('D344');
  });
});

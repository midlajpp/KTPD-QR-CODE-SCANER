import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import MemberField from '../models/MemberField.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { generateSecureToken } from '../utils/crypto.js';
import { getProfileUrl } from '../services/qrService.js';

let mongoServer;
let adminToken = '';
let staffToken = '';

let memberA001, memberD343, member00125, memberD999;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-advanced-bulk-export-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create an Admin user
  const adminHash = await Admin.hashPassword('AdminPass123!');
  await Admin.create({
    fullName: 'Operational Admin',
    username: 'admin_export',
    email: 'admin_export@ktpd.org',
    passwordHash: adminHash,
    role: 'admin',
    status: 'active'
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin_export@ktpd.org', password: 'AdminPass123!' });
  adminToken = adminLogin.body.token;

  // Create a Staff user (should be restricted from export)
  const staffHash = await Admin.hashPassword('StaffPass123!');
  await Admin.create({
    fullName: 'Staff Viewer',
    username: 'staff_export',
    email: 'staff_export@ktpd.org',
    passwordHash: staffHash,
    role: 'staff',
    status: 'active'
  });

  const staffLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'staff_export@ktpd.org', password: 'StaffPass123!' });
  staffToken = staffLogin.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Advanced Bulk Export with QR Codes Tests', () => {
  beforeEach(async () => {
    await Member.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Alphanumeric ID A001
    memberA001 = await Member.create({
      memberId: 'A001',
      qrToken: generateSecureToken(32),
      name: 'Ahmed Al-Mansoori',
      emiratesId: '784-1985-1111111-1',
      mobileNo: '+971501111111',
      transportCompany: 'Gulf Haulage LLC',
      bloodGroup: 'O+',
      livingArea: 'Dubai, UAE',
      india: 'Kerala, India',
      status: 'Active',
      isDeleted: false,
      customFields: {
        drivingLicenseNo: 'DL-UAE-88821'
      }
    });

    // 2. Alphanumeric ID D343
    memberD343 = await Member.create({
      memberId: 'D343',
      qrToken: generateSecureToken(32),
      name: 'Deepak Kumar',
      emiratesId: '784-1988-2222222-2',
      mobileNo: '+971502222222',
      transportCompany: 'Oasis Transport LLC',
      bloodGroup: 'B+',
      livingArea: 'Sharjah, UAE',
      status: 'Active',
      isDeleted: false
    });

    // 3. Leading zero ID 00125
    member00125 = await Member.create({
      memberId: '00125',
      qrToken: generateSecureToken(32),
      name: 'Rashid Khan',
      emiratesId: '784-1992-3333333-3',
      mobileNo: '+971503333333',
      transportCompany: 'Emirates Freight Co',
      bloodGroup: 'A+',
      livingArea: 'Ajman, UAE',
      status: 'Active',
      isDeleted: false
    });

    // 4. Inactive member D999
    memberD999 = await Member.create({
      memberId: 'D999',
      qrToken: generateSecureToken(32),
      name: 'Suresh Menon',
      emiratesId: '784-1980-4444444-4',
      mobileNo: '+971504444444',
      transportCompany: 'Kerala Logistics',
      bloodGroup: 'AB+',
      status: 'Inactive',
      isDeleted: false
    });
  });

  // Helper for binary stream parsing in supertest
  const binaryParser = (res, callback) => {
    const data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(data)));
  };

  // -------------------------------------------------------------------------
  // 1. Export Members + QR Codes (A4 PDF Document)
  // -------------------------------------------------------------------------
  test('Option 1A: GET /api/members/export/pdf generates valid A4 PDF document containing member info and QR codes', async () => {
    const res = await request(app)
      .get('/api/members/export/pdf?ids=A001,00125')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('KTPD-Members-with-QR.pdf');

    // PDF magic bytes verification: starts with %PDF
    expect(Buffer.isBuffer(res.body)).toBe(true);
    const isPdf = res.body.slice(0, 4).toString('utf-8') === '%PDF';
    expect(isPdf).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000); // Has contents

    // Check AuditLog
    const log = await AuditLog.findOne({ action: 'EXPORT_PDF' });
    expect(log).toBeDefined();
    expect(log.details.exportedCount).toBe(2);
  });

  test('Option 1A: Export all members as A4 PDF when no IDs are filtered', async () => {
    const res = await request(app)
      .get('/api/members/export/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.slice(0, 4).toString('utf-8')).toBe('%PDF');

    const log = await AuditLog.findOne({ action: 'EXPORT_PDF' });
    expect(log.details.exportedCount).toBe(4);
  });

  // -------------------------------------------------------------------------
  // 2. Export Members + QR Codes (Complete ZIP Package)
  // -------------------------------------------------------------------------
  test('Option 1B: GET /api/members/export/all generates ZIP containing Members.csv, Member-Details/, and QR-Codes/', async () => {
    const res = await request(app)
      .get('/api/members/export/all?ids=A001,D343,00125')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toMatch(/KTPD-(Members-and-QR|Export)\.zip/);

    // ZIP magic bytes verification: starts with PK
    expect(Buffer.isBuffer(res.body)).toBe(true);
    const isZip = res.body[0] === 0x50 && res.body[1] === 0x4b;
    expect(isZip).toBe(true);
    expect(res.body.length).toBeGreaterThan(500);

    const log = await AuditLog.findOne({ action: 'EXPORT_ALL' });
    expect(log).toBeDefined();
    expect(log.details.exportedCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 3. Export Members Data Only (CSV)
  // -------------------------------------------------------------------------
  test('Option 2: GET /api/members/export?dataOnly=true generates pure CSV without QR image column', async () => {
    const res = await request(app)
      .get('/api/members/export?dataOnly=true&ids=A001,D343,00125')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('KTPD-Members-Data.csv');

    const csvText = res.text;
    // Must contain official IDs preserving exact format
    expect(csvText).toContain('"A001"');
    expect(csvText).toContain('"D343"');
    expect(csvText).toContain('"00125"'); // Leading zero strictly preserved!
    expect(csvText).toContain('Ahmed Al-Mansoori');
    expect(csvText).toContain('784-1985-1111111-1');

    // Must NOT contain QR image reference column
    expect(csvText).not.toContain('"qrImage"');
    expect(csvText).not.toContain('A001.png');

    const log = await AuditLog.findOne({ action: 'EXPORT_CSV_DATA_ONLY' });
    expect(log).toBeDefined();
    expect(log.details.exportedCount).toBe(3);
    expect(log.details.dataOnly).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. Export QR Codes Only (ZIP)
  // -------------------------------------------------------------------------
  test('Option 3: GET /api/members/export/qr-zip generates ZIP with individual PNGs named by Member ID', async () => {
    const res = await request(app)
      .get('/api/members/export/qr-zip?ids=A001,D343,00125')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('KTPD-QR-Codes.zip');

    // ZIP magic bytes verification
    expect(Buffer.isBuffer(res.body)).toBe(true);
    const isZip = res.body[0] === 0x50 && res.body[1] === 0x4b;
    expect(isZip).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);

    const log = await AuditLog.findOne({ action: 'EXPORT_QR' });
    expect(log).toBeDefined();
    expect(log.details.exportedCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 5. Security & Authorization
  // -------------------------------------------------------------------------
  test('Rejects unauthenticated export requests with 401', async () => {
    const resPdf = await request(app).get('/api/members/export/pdf');
    expect(resPdf.status).toBe(401);

    const resCsv = await request(app).get('/api/members/export?dataOnly=true');
    expect(resCsv.status).toBe(401);

    const resZip = await request(app).get('/api/members/export/qr-zip');
    expect(resZip.status).toBe(401);
  });

  test('Rejects staff role from performing bulk exports with 403', async () => {
    const resPdf = await request(app)
      .get('/api/members/export/pdf')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resPdf.status).toBe(403);

    const resCsv = await request(app)
      .get('/api/members/export?dataOnly=true')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resCsv.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // 6. QR Code Integrity & Database Immutability
  // -------------------------------------------------------------------------
  test('Export operations strictly preserve existing QR tokens and MongoDB records', async () => {
    const tokenA001Before = memberA001.qrToken;
    const tokenD343Before = memberD343.qrToken;
    const token00125Before = member00125.qrToken;

    // Run multiple exports
    await request(app).get('/api/members/export/pdf').set('Authorization', `Bearer ${adminToken}`);
    await request(app).get('/api/members/export?dataOnly=true').set('Authorization', `Bearer ${adminToken}`);
    await request(app).get('/api/members/export/qr-zip').set('Authorization', `Bearer ${adminToken}`);
    await request(app).get('/api/members/export/all').set('Authorization', `Bearer ${adminToken}`);

    // Fetch members from MongoDB again
    const m1 = await Member.findOne({ memberId: 'A001' });
    const m2 = await Member.findOne({ memberId: 'D343' });
    const m3 = await Member.findOne({ memberId: '00125' });

    expect(m1.qrToken).toBe(tokenA001Before);
    expect(m2.qrToken).toBe(tokenD343Before);
    expect(m3.qrToken).toBe(token00125Before);

    // Profile URLs still resolve to identical permanent targets
    expect(getProfileUrl(m1.qrToken)).toBe(getProfileUrl(tokenA001Before));
    expect(getProfileUrl(m3.qrToken)).toBe(getProfileUrl(token00125Before));
  });
});

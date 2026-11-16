import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import MemberField from '../models/MemberField.js';
import Member from '../models/Member.js';

let mongoServer;
let adminToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-duplicate-member-fix-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'duplicate_member_test'
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create Admin user for authenticated import testing
  const hash = await Admin.hashPassword('Password@123');
  await Admin.create({
    fullName: 'Test Super Admin',
    username: 'superadmin_dup_test',
    email: 'admin_dup@ktpd.com',
    passwordHash: hash,
    role: 'superadmin',
    status: 'active'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      usernameOrEmail: 'admin_dup@ktpd.com',
      password: 'Password@123'
    });

  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('CSV Import Duplicate Membership ID Fix Tests', () => {
  let existingA001QrToken = '';
  let existingA001MongoId = '';

  // -------------------------------------------------------------
  // Test 1: Import a completely new member
  // -------------------------------------------------------------
  test('Test 1: Import a completely new member (A001)', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company,Blood Group,Emirates ID
A001,Midlaj Driver,971501234567,Gulf Express,B+,784-1990-1234567-1`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'new_member.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(1);
    expect(res.body.summary.updatedCount).toBe(0);
    expect(res.body.summary.skippedCount).toBe(0);

    const memberInDb = await Member.findOne({ memberId: 'A001' });
    expect(memberInDb).not.toBeNull();
    expect(memberInDb.memberId).toBe('A001');
    expect(memberInDb.name).toBe('Midlaj Driver');
    expect(memberInDb.mobileNo).toBe('971501234567');
    expect(memberInDb.qrToken).toBeDefined();
    expect(memberInDb.qrToken.length).toBeGreaterThan(16);

    existingA001QrToken = memberInDb.qrToken;
    existingA001MongoId = String(memberInDb._id);
  });

  // -------------------------------------------------------------
  // Test 2: Import an existing member with Skip
  // -------------------------------------------------------------
  test('Test 2: Import an existing member (A001) with Skip policy', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company,Blood Group
A001,Midlaj Altered,971509999999,Different Cargo,O+`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'skip_member.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(0);
    expect(res.body.summary.updatedCount).toBe(0);
    expect(res.body.summary.skippedCount).toBe(1);

    // Verify existing record was untouched
    const memberInDb = await Member.findOne({ memberId: 'A001' });
    expect(memberInDb.name).toBe('Midlaj Driver');
    expect(memberInDb.mobileNo).toBe('971501234567');
    expect(memberInDb.transportCompany).toBe('Gulf Express');
    expect(memberInDb.bloodGroup).toBe('B+');
    expect(memberInDb.qrToken).toBe(existingA001QrToken);
    expect(String(memberInDb._id)).toBe(existingA001MongoId);
  });

  // -------------------------------------------------------------
  // Test 3: Import an existing member with Update
  // -------------------------------------------------------------
  test('Test 3: Import an existing member (A001) with Update policy', async () => {
    // Only updates Mobile No and Transport Company; Emirates ID is absent from CSV and must be preserved
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company
A001,Midlaj Updated,971509999999,Al Naboodah Transport`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'update')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'update_member.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(0);
    expect(res.body.summary.updatedCount).toBe(1);
    expect(res.body.summary.skippedCount).toBe(0);

    const memberInDb = await Member.findOne({ memberId: 'A001' });
    expect(memberInDb.name).toBe('Midlaj Updated');
    expect(memberInDb.mobileNo).toBe('971509999999');
    expect(memberInDb.transportCompany).toBe('Al Naboodah Transport');
    // Field absent from CSV must be preserved!
    expect(memberInDb.emiratesId).toBe('784-1990-1234567-1');
    expect(memberInDb.bloodGroup).toBe('B+');

    // CRITICAL: qrToken and _id must remain strictly identical
    expect(memberInDb.qrToken).toBe(existingA001QrToken);
    expect(String(memberInDb._id)).toBe(existingA001MongoId);

    // Total count of members in database must still be exactly 1
    const totalCount = await Member.countDocuments({ isDeleted: false });
    expect(totalCount).toBe(1);
  });

  // -------------------------------------------------------------
  // Test 4: Cancel an import containing duplicate IDs
  // -------------------------------------------------------------
  test('Test 4: Cancel an import containing duplicate IDs (A001)', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company
A001,Should Not Import,971500000000,Should Not Exist
A999,Brand New Person,971501112222,New Lines Cargo`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'cancel')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'cancel_import.csv');

    // Must cleanly abort without modifying the database
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Import cancelled|Duplicate Membership ID/i);

    // Ensure A999 was NOT inserted into MongoDB
    const a999 = await Member.findOne({ memberId: 'A999' });
    expect(a999).toBeNull();

    // Ensure A001 was NOT modified
    const a001 = await Member.findOne({ memberId: 'A001' });
    expect(a001.name).toBe('Midlaj Updated');
  });

  // -------------------------------------------------------------
  // Test 5: Import a CSV with both new and existing members
  // -------------------------------------------------------------
  test('Test 5: Import a CSV with both new (A002) and existing (A001) members', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company
A001,Midlaj Driver,971501234567,Gulf Express
A002,Second Member,971502223333,Emirates Logistics`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'mixed_members.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(1);
    expect(res.body.summary.skippedCount).toBe(1);

    const a002 = await Member.findOne({ memberId: 'A002' });
    expect(a002).not.toBeNull();
    expect(a002.name).toBe('Second Member');

    const totalCount = await Member.countDocuments({ isDeleted: false });
    expect(totalCount).toBe(2);
  });

  // -------------------------------------------------------------
  // Test 6: Import a CSV with duplicate IDs within the same file
  // -------------------------------------------------------------
  test('Test 6: Import a CSV with duplicate IDs within the same file', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company
DUP_01,First Occurrence,971503334444,Alpha Cargo
NEW_03,Different Member,971504445555,Beta Transit
DUP_01,Second Occurrence,971506667777,Gamma Logistics`;

    // 6a. Preview must detect the intra-file duplicate and report row numbers
    const previewRes = await request(app)
      .post('/api/members/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'intra_duplicates.csv');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    expect(previewRes.body.intraFileDuplicates).toBeDefined();
    expect(previewRes.body.intraFileDuplicates.length).toBeGreaterThanOrEqual(1);

    const dupReport = previewRes.body.intraFileDuplicates.find((d) => d.memberId === 'DUP_01');
    expect(dupReport).toBeDefined();
    expect(dupReport.firstRowNumber).toBe(2);
    expect(dupReport.currentRowNumber).toBe(4);

    // 6b. Import with 'skip' policy: First occurrence imported, duplicate occurrence skipped
    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'intra_duplicates.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    // DUP_01 (first) and NEW_03 imported; DUP_01 (second) skipped
    expect(importRes.body.summary.importedCount).toBe(2);
    expect(importRes.body.summary.skippedCount).toBe(1);

    const dup01 = await Member.findOne({ memberId: 'DUP_01' });
    expect(dup01).not.toBeNull();
    expect(dup01.name).toBe('First Occurrence');
  });

  // -------------------------------------------------------------
  // Test 7: Verify existing QR tokens and URLs remain unchanged
  // -------------------------------------------------------------
  test('Test 7: Verify existing QR tokens and URLs remain strictly unchanged across multiple operations', async () => {
    const a001Initial = await Member.findOne({ memberId: 'A001' });
    const initialQrToken = a001Initial.qrToken;
    const initialId = String(a001Initial._id);

    // Perform an update import
    const csvContent = `KTPD NO,Name,Mobile No
A001,Midlaj Final Name,971507778888`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'update')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'qr_check.csv');

    const a001AfterImport = await Member.findOne({ memberId: 'A001' });
    expect(a001AfterImport.name).toBe('Midlaj Final Name');
    expect(a001AfterImport.qrToken).toBe(initialQrToken);
    expect(String(a001AfterImport._id)).toBe(initialId);

    // Perform a manual update via REST API
    await request(app)
      .put(`/api/members/${initialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Midlaj Rest API Updated',
        livingArea: 'Deira, Dubai'
      });

    const a001AfterManual = await Member.findOne({ memberId: 'A001' });
    expect(a001AfterManual.name).toBe('Midlaj Rest API Updated');
    expect(a001AfterManual.livingArea).toBe('Deira, Dubai');
    expect(a001AfterManual.qrToken).toBe(initialQrToken);
    expect(String(a001AfterManual._id)).toBe(initialId);
  });

  // -------------------------------------------------------------
  // Test 8: Verify all imported data persists after refresh and login
  // -------------------------------------------------------------
  test('Test 8: Verify all imported data persists after refresh and login', async () => {
    // 8a. Perform a fresh login
    const freshLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'admin_dup@ktpd.com',
        password: 'Password@123'
      });

    expect(freshLoginRes.status).toBe(200);
    const freshToken = freshLoginRes.body.token;
    expect(freshToken).toBeDefined();

    // 8b. Fetch member directory
    const directoryRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${freshToken}`);

    expect(directoryRes.status).toBe(200);
    expect(directoryRes.body.success).toBe(true);

    const members = directoryRes.body.data;
    const memberIds = members.map((m) => m.memberId);

    // Verify all created members persist
    expect(memberIds).toContain('A001');
    expect(memberIds).toContain('A002');
    expect(memberIds).toContain('DUP_01');
    expect(memberIds).toContain('NEW_03');

    // 8c. Fetch individual member profile and verify fields
    const a001Profile = members.find((m) => m.memberId === 'A001');
    expect(a001Profile).toBeDefined();
    expect(a001Profile.name).toBe('Midlaj Rest API Updated');
    expect(a001Profile.mobileNo).toBe('971507778888');
    expect(a001Profile.qrToken).toBe(existingA001QrToken);

    // Ensure zero duplicate key errors ever occurred
    const allMembersInDb = await Member.find({});
    const uniqueIds = new Set(allMembersInDb.map((m) => m.memberId));
    expect(uniqueIds.size).toBe(allMembersInDb.length);
  });
});

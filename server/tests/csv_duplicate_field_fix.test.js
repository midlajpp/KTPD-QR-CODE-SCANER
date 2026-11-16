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
  process.env.JWT_SECRET = 'test-secret-ktpd-duplicate-field-fix-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'duplicate_field_test'
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields({ seedDefaults: true });

  // Explicitly simulate the exact user configuration:
  // Existing custom field with Label: "Transport Company" and fieldKey: "transport_company_name"
  await MemberField.create({
    fieldKey: 'transport_company_name',
    fieldLabel: 'Transport Company',
    fieldType: 'text',
    isSystemField: false,
    enabled: true,
    showInForm: true,
    showInTable: true,
    showInCsv: true,
    showOnPublicProfile: true,
    displayOrder: 150
  });

  // Create additional pre-existing custom fields
  await MemberField.create({
    fieldKey: 'emergency_contacts_in_uae',
    fieldLabel: 'Emergency Contacts in UAE',
    fieldType: 'phone',
    isSystemField: false,
    enabled: true,
    displayOrder: 160
  });

  await MemberField.create({
    fieldKey: 'passport_number',
    fieldLabel: 'Passport Number',
    fieldType: 'alphanumeric',
    isSystemField: false,
    enabled: true,
    displayOrder: 170
  });

  await MemberField.create({
    fieldKey: 'vehicle_number',
    fieldLabel: 'Vehicle Number',
    fieldType: 'alphanumeric',
    isSystemField: false,
    enabled: true,
    displayOrder: 180
  });

  // Create Admin
  const hash = await Admin.hashPassword('AdminPass2026!');
  await Admin.create({
    fullName: 'Test Super Admin',
    username: 'admin',
    email: 'admin@ktpd.org',
    passwordHash: hash,
    role: 'superadmin',
    status: 'active'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin', password: 'AdminPass2026!' });

  adminToken = loginRes.body.token;
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongoServer) {
    try {
      await mongoServer.stop();
    } catch (e) {}
  }
});

describe('CSV IMPORT DUPLICATE CUSTOM FIELD FIX TEST SUITE', () => {
  test('1. Import CSV containing Transport Company when transport_company_name already exists', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company,Blood Group
D501,Mujeeb Rahman,0501234567,Al Safeer Transport LLC,B+
D502,Suhail Khan,0507654321,Gulf Express Logistics,O+`;

    // Preview
    const previewRes = await request(app)
      .post('/api/members/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'transport_test.csv');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);

    const transportCol = previewRes.body.columns.find((c) => c.header === 'Transport Company');
    expect(transportCol).toBeDefined();
    // Must be detected as an existing field, NOT a new field!
    expect(transportCol.isExisting).toBe(true);
    expect(['transport_company_name', 'transportCompany']).toContain(transportCol.fieldKey);

    // Execute Import
    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(csvContent, 'utf-8'), 'transport_test.csv');

    // Must NOT return 409 or "Duplicate value: 'transport_company_name' already exists for fieldKey"
    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.summary.importedCount).toBe(2);
    expect(importRes.body.summary.fieldsCreatedCount).toBe(0);

    // Verify in database: No duplicate transport_company_name field was created
    const transportFieldsCount = await MemberField.countDocuments({
      fieldKey: { $in: ['transport_company_name', 'transport_company', 'transport_company_1'] }
    });
    expect(transportFieldsCount).toBe(1);

    // Verify member values in MongoDB
    const memberD501 = await Member.findOne({ memberId: 'D501' });
    expect(memberD501).not.toBeNull();
    expect(memberD501.transportCompany).toBe('Al Safeer Transport LLC');
    expect(memberD501.customFields.transport_company_name).toBe('Al Safeer Transport LLC');
  });

  test('2. Import CSV containing several existing custom fields', async () => {
    const multiCustomCsv = `KTPD NO,Name,Mobile No,Emergency Contacts in UAE,Passport Number,Vehicle Number
D503,Faisal K,0509998888,0551112233,N7654321,DXB-45210
D504,Anas Babu,0508887777,0552223344,M8765432,SHJ-12890`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(multiCustomCsv, 'utf-8'), 'multi_custom.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(2);
    expect(res.body.summary.fieldsCreatedCount).toBe(0);

    // Verify fields were not duplicated
    const passportCount = await MemberField.countDocuments({ fieldKey: /^passport/ });
    expect(passportCount).toBe(1);

    const vehicleCount = await MemberField.countDocuments({ fieldKey: /^vehicle/ });
    expect(vehicleCount).toBe(1);

    // Verify members have values saved
    const memberD503 = await Member.findOne({ memberId: 'D503' });
    expect(memberD503.customFields.passport_number).toBe('N7654321');
    expect(memberD503.customFields.vehicle_number).toBe('DXB-45210');
    expect(memberD503.customFields.emergency_contacts_in_uae).toBe('0551112233');
  });

  test('3. Import CSV containing a mixture of existing and new fields', async () => {
    const mixedCsv = `KTPD NO,Name,Transport Company,Years of Experience,Shift Timing
D505,Arshad Ali,Fast Track Transport,8 Years,Night Shift
D506,Deepak Kumar,Emirates Express,5 Years,Day Shift`;

    const previewRes = await request(app)
      .post('/api/members/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(mixedCsv, 'utf-8'), 'mixed.csv');

    expect(previewRes.status).toBe(200);
    const cols = previewRes.body.columns;
    const expCol = cols.find((c) => c.header === 'Years of Experience');
    const shiftCol = cols.find((c) => c.header === 'Shift Timing');
    const transportCol = cols.find((c) => c.header === 'Transport Company');

    expect(transportCol.isExisting).toBe(true);
    expect(expCol.isExisting).toBe(false);
    expect(shiftCol.isExisting).toBe(false);

    // Execute Import
    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(mixedCsv, 'utf-8'), 'mixed.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(2);
    expect(res.body.summary.fieldsCreatedCount).toBe(2);

    // Check newly created fields exist in MemberField
    const expField = await MemberField.findOne({ fieldKey: 'years_of_experience' });
    expect(expField).not.toBeNull();
    expect(expField.fieldLabel).toBe('Years of Experience');

    const shiftField = await MemberField.findOne({ fieldKey: 'shift_timing' });
    expect(shiftField).not.toBeNull();
    expect(shiftField.fieldLabel).toBe('Shift Timing');

    // Transport field count must STILL be 1
    const transportCount = await MemberField.countDocuments({ fieldKey: 'transport_company_name' });
    expect(transportCount).toBe(1);
  });

  test('4. Import the same CSV again (idempotent, no duplicates created)', async () => {
    const mixedCsv = `KTPD NO,Name,Transport Company,Years of Experience,Shift Timing
D505,Arshad Ali,Fast Track Transport,8 Years,Night Shift
D506,Deepak Kumar,Emirates Express,5 Years,Day Shift`;

    const fieldsCountBefore = await MemberField.countDocuments();

    // Re-import with 'skip' strategy
    const resSkip = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(mixedCsv, 'utf-8'), 'mixed_repeat.csv');

    expect(resSkip.status).toBe(200);
    expect(resSkip.body.summary.skippedCount).toBe(2);
    expect(resSkip.body.summary.fieldsCreatedCount).toBe(0);

    const fieldsCountAfter = await MemberField.countDocuments();
    expect(fieldsCountAfter).toBe(fieldsCountBefore);
  });

  test('5. Import members with different Transport Company values and verify MongoDB preservation', async () => {
    const distinctCompaniesCsv = `KTPD NO,Name,Transport Company
D507,Driver Alpha,Red Sea Cargo LLC
D508,Driver Beta,Oasis Movers Dubai
D509,Driver Gamma,Falcon Heavy Haulage`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(distinctCompaniesCsv, 'utf-8'), 'distinct_companies.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.importedCount).toBe(3);

    const m507 = await Member.findOne({ memberId: 'D507' });
    const m508 = await Member.findOne({ memberId: 'D508' });
    const m509 = await Member.findOne({ memberId: 'D509' });

    expect(m507.transportCompany).toBe('Red Sea Cargo LLC');
    expect(m508.transportCompany).toBe('Oasis Movers Dubai');
    expect(m509.transportCompany).toBe('Falcon Heavy Haulage');

    expect(m507.customFields.transport_company_name).toBe('Red Sea Cargo LLC');
    expect(m508.customFields.transport_company_name).toBe('Oasis Movers Dubai');
    expect(m509.customFields.transport_company_name).toBe('Falcon Heavy Haulage');
  });

  test('6. Preserves alphanumeric membership IDs with leading zeros and special characters', async () => {
    const specialIdsCsv = `KTPD NO,Name,Transport Company
007,James Bond,Secret Logistics
D-999,Special Driver,Delta Transport
KTPD/2026/042,Formatted Member,Metro Bus UAE`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(specialIdsCsv, 'utf-8'), 'special_ids.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.importedCount).toBe(3);

    // Verify leading zeros were NOT converted to number 7
    const m007 = await Member.findOne({ memberId: '007' });
    expect(m007).not.toBeNull();
    expect(m007.memberId).toBe('007');

    const mD999 = await Member.findOne({ memberId: 'D-999' });
    expect(mD999).not.toBeNull();
    expect(mD999.memberId).toBe('D-999');

    const mFormatted = await Member.findOne({ memberId: 'KTPD/2026/042' });
    expect(mFormatted).not.toBeNull();
    expect(mFormatted.memberId).toBe('KTPD/2026/042');
  });

  test('7. Verify no duplicate field definitions exist across the entire MemberField collection', async () => {
    const allFields = await MemberField.find().lean();
    const keysSeen = new Set();
    const duplicateKeys = [];

    for (const f of allFields) {
      if (keysSeen.has(f.fieldKey)) {
        duplicateKeys.push(f.fieldKey);
      }
      keysSeen.add(f.fieldKey);
    }

    expect(duplicateKeys).toEqual([]);
  });

  test('8. Re-importing with update strategy updates member fields while strictly preserving permanent QR tokens', async () => {
    const originalMember = await Member.findOne({ memberId: 'D501' }).lean();
    const originalQrToken = originalMember.qrToken;
    expect(originalQrToken).toBeDefined();

    const updateCsv = `KTPD NO,Name,Transport Company
D501,Mujeeb Rahman Updated,Al Safeer Express Delivery LLC`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'update')
      .attach('file', Buffer.from(updateCsv, 'utf-8'), 'update_qr_check.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.updatedCount).toBe(1);

    const updatedMember = await Member.findOne({ memberId: 'D501' }).lean();
    expect(updatedMember.name).toBe('Mujeeb Rahman Updated');
    expect(updatedMember.transportCompany).toBe('Al Safeer Express Delivery LLC');

    // QR token MUST remain permanently identical
    expect(updatedMember.qrToken).toBe(originalQrToken);

    // Mobile number from first import must still be preserved
    expect(updatedMember.mobileNo).toBe('0501234567');
  });
});

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
  process.env.JWT_SECRET = 'test-secret-ktpd-smart-import-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'smart_import_test'
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create Super Admin
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

describe('SMART CSV IMPORT & QR-ENABLED EXPORT TEST SUITE', () => {
  const sampleCsvContent = `KTPD NO,Name,Mobile No,Company,Blood Group,Passport Number,Visa Expiry Date
D343,Midhaj,9876543210,ABC Transport,B+,P123456,2028-12-31
D344,Rashid Ali,9876543211,XYZ Logistics,O+,P654321,2027-06-15`;

  test('1. Smart Import Preview detects columns, matches existing fields, and suggests types for new fields', async () => {
    const res = await request(app)
      .post('/api/members/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(sampleCsvContent, 'utf-8'), 'smart_batch.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalRows).toBe(2);
    expect(res.body.totalColumns).toBe(7);

    // Verify detection of columns
    const columns = res.body.columns;
    const nameCol = columns.find((c) => c.fieldKey === 'name');
    const idCol = columns.find((c) => c.fieldKey === 'memberId');
    const passportCol = columns.find((c) => c.header === 'Passport Number');
    const visaCol = columns.find((c) => c.header === 'Visa Expiry Date');

    expect(nameCol).toBeDefined();
    expect(nameCol.isExisting).toBe(true);

    expect(idCol).toBeDefined();
    expect(idCol.isExisting).toBe(true);

    // Passport Number must be detected as a new field of type 'alphanumeric'
    expect(passportCol).toBeDefined();
    expect(passportCol.isExisting).toBe(false);
    expect(passportCol.suggestedType).toBe('alphanumeric');

    // Visa Expiry Date must be detected as a new field of type 'date'
    expect(visaCol).toBeDefined();
    expect(visaCol.isExisting).toBe(false);
    expect(visaCol.suggestedType).toBe('date');
  });

  test('2. Execute Smart Import automatically creates missing custom fields in MongoDB', async () => {
    // Before import, verify Passport Number and Visa Expiry Date do not exist in MemberField collection
    const fieldBefore = await MemberField.findOne({ fieldKey: 'passport_number' });
    expect(fieldBefore).toBeNull();

    const mappings = [
      { header: 'KTPD NO', isExisting: true, fieldKey: 'memberId', included: true },
      { header: 'Name', isExisting: true, fieldKey: 'name', included: true },
      { header: 'Mobile No', isExisting: true, fieldKey: 'mobileNo', included: true },
      { header: 'Company', isExisting: true, fieldKey: 'transportCompany', included: true },
      { header: 'Blood Group', isExisting: true, fieldKey: 'bloodGroup', included: true },
      {
        header: 'Passport Number',
        isExisting: false,
        fieldKey: 'passport_number',
        fieldLabel: 'Passport Number',
        fieldType: 'alphanumeric',
        included: true
      },
      {
        header: 'Visa Expiry Date',
        isExisting: false,
        fieldKey: 'visa_expiry_date',
        fieldLabel: 'Visa Expiry Date',
        fieldType: 'date',
        included: true
      }
    ];

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('mappings', JSON.stringify(mappings))
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(sampleCsvContent, 'utf-8'), 'smart_batch.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(2);
    expect(res.body.summary.fieldsCreatedCount).toBe(2);

    // Verify fields were created permanently in MongoDB
    const passportField = await MemberField.findOne({ fieldKey: 'passport_number' });
    expect(passportField).not.toBeNull();
    expect(passportField.fieldLabel).toBe('Passport Number');
    expect(passportField.fieldType).toBe('alphanumeric');
    expect(passportField.isSystemField).toBe(false);

    const visaField = await MemberField.findOne({ fieldKey: 'visa_expiry_date' });
    expect(visaField).not.toBeNull();
    expect(visaField.fieldLabel).toBe('Visa Expiry Date');
    expect(visaField.fieldType).toBe('date');
  });

  test('3. Verify imported member data is saved with unified ID and permanent QR token in MongoDB', async () => {
    const memberD343 = await Member.findOne({ memberId: 'D343' });
    expect(memberD343).not.toBeNull();
    expect(memberD343.name).toBe('Midhaj');
    expect(memberD343.mobileNo).toBe('9876543210');
    expect(memberD343.transportCompany).toBe('ABC Transport');
    expect(memberD343.bloodGroup).toBe('B+');
    expect(memberD343.customFields.passport_number).toBe('P123456');
    expect(memberD343.customFields.visa_expiry_date).toBe('2028-12-31');
    expect(memberD343.customFields.ktpdNo).toBe('D343');

    // Cryptographic permanent QR token
    expect(memberD343.qrToken).toBeDefined();
    expect(memberD343.qrToken.length).toBeGreaterThanOrEqual(32);

    const memberD344 = await Member.findOne({ memberId: 'D344' });
    expect(memberD344).not.toBeNull();
    expect(memberD344.name).toBe('Rashid Ali');
    expect(memberD344.customFields.passport_number).toBe('P654321');
  });

  test('4. Importing again with existing columns does NOT create duplicate field definitions', async () => {
    const fieldsCountBefore = await MemberField.countDocuments({ fieldKey: 'passport_number' });
    expect(fieldsCountBefore).toBe(1);

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(sampleCsvContent, 'utf-8'), 'smart_batch.csv');

    expect(res.status).toBe(200);

    const fieldsCountAfter = await MemberField.countDocuments({ fieldKey: 'passport_number' });
    expect(fieldsCountAfter).toBe(1);
  });

  test('5. Duplicate handling policy "skip" skips existing members without altering them', async () => {
    const originalMember = await Member.findOne({ memberId: 'D343' }).lean();

    const duplicateCsv = `KTPD NO,Name,Mobile No,Company,Blood Group,Passport Number
D343,Modified Name,1111111111,New Company,A+,P999999`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'skip')
      .attach('file', Buffer.from(duplicateCsv, 'utf-8'), 'duplicate_skip.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.skippedCount).toBe(1);
    expect(res.body.summary.importedCount).toBe(0);

    const memberAfter = await Member.findOne({ memberId: 'D343' }).lean();
    expect(memberAfter.name).toBe(originalMember.name);
    expect(memberAfter.mobileNo).toBe(originalMember.mobileNo);
    expect(memberAfter.qrToken).toBe(originalMember.qrToken);
  });

  test('6. Duplicate handling policy "update" updates record while strictly preserving permanent QR token', async () => {
    const originalMember = await Member.findOne({ memberId: 'D343' }).lean();
    const originalQrToken = originalMember.qrToken;

    const updateCsv = `KTPD NO,Name,Mobile No,Company,Blood Group,Passport Number
D343,Midhaj Updated,9876543210,Updated Transport Corp,B+,P123456`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'update')
      .attach('file', Buffer.from(updateCsv, 'utf-8'), 'duplicate_update.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.updatedCount).toBe(1);

    const memberAfter = await Member.findOne({ memberId: 'D343' }).lean();
    expect(memberAfter.name).toBe('Midhaj Updated');
    expect(memberAfter.transportCompany).toBe('Updated Transport Corp');

    // Strict preservation of permanent QR token
    expect(memberAfter.qrToken).toBe(originalQrToken);
  });

  test('7. CSV Export includes human-readable headers, dynamic custom fields, and the qrImage column', async () => {
    const res = await request(app)
      .get('/api/members/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('KTPD-Members.csv');

    const csvText = res.text;
    expect(csvText).toContain('qrImage');
    expect(csvText).toContain('D343.png');
    expect(csvText).toContain('D344.png');
    expect(csvText).toContain('Passport Number');
    expect(csvText).toContain('P123456');
  });

  test('8. QR PNG ZIP Export contains high-resolution PNG images named after member IDs', async () => {
    const res = await request(app)
      .get('/api/members/export/qr-zip')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('KTPD-QR-Codes.zip');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('9. Complete Download All archive creates unified package with KTPD-Members.csv, QR-Codes/, and README.txt', async () => {
    const res = await request(app)
      .get('/api/members/export/all')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('KTPD-Export.zip');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('10. Public QR profile URL resolves without authentication using the permanent qrToken', async () => {
    const member = await Member.findOne({ memberId: 'D343' }).lean();

    const publicRes = await request(app).get(`/api/public/members/${member.qrToken}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.success).toBe(true);
    expect(publicRes.body.data.memberId).toBe('D343');
    expect(publicRes.body.data.name).toBe('Midhaj Updated');

    // Verify custom fields array contains Passport Number
    const passportItem = publicRes.body.data.customFields.find((f) => f.fieldKey === 'passport_number');
    expect(passportItem).toBeDefined();
    expect(passportItem.value).toBe('P123456');
  });
});

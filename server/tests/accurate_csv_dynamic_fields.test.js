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
  process.env.JWT_SECRET = 'test-secret-dynamic-fields-2026';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const adminHash = await Admin.hashPassword('AdminPass123!');
  await Admin.create({
    fullName: 'Test Superadmin',
    username: 'superadmin_dynamic',
    email: 'admin_dynamic@ktpd.org',
    passwordHash: adminHash,
    role: 'superadmin',
    status: 'active'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin_dynamic@ktpd.org', password: 'AdminPass123!' });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Accurate CSV-Based Dynamic Field Creation Tests', () => {
  beforeEach(async () => {
    await Member.deleteMany({});
    await MemberField.deleteMany({});
  });

  /**
   * Scenario 1: A CSV with only five columns (KTPD NO, NAME, EMIRATES ID, MOBILE NO, TRANSPORT COMPANY).
   * Verify that Manage Fields contains only these five fields (no developer-seeded fields).
   */
  test('Scenario 1: CSV with only five columns creates exactly those five fields and no unrequested fields', async () => {
    const csvFiveColumns = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY
A001,Rashid Al-Nuaimi,784-1988-1111111-1,+971501111111,Nuaimi Logistics LLC
A002,Hamad Al-Kaabi,784-1990-2222222-2,+971502222222,Kaabi Freight LLC`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvFiveColumns, 'utf-8'), 'five_columns.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.summary.importedCount).toBe(2);

    // Verify fields in Manage Fields endpoint (GET /api/fields)
    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fieldsRes.status).toBe(200);
    expect(fieldsRes.body.success).toBe(true);

    const fields = fieldsRes.body.data;
    // Exactly 5 fields must exist!
    expect(fields.length).toBe(5);

    const fieldLabels = fields.map((f) => f.fieldLabel);
    expect(fieldLabels).toContain('KTPD NO');
    expect(fieldLabels).toContain('NAME');
    expect(fieldLabels).toContain('EMIRATES ID');
    expect(fieldLabels).toContain('MOBILE NO');
    expect(fieldLabels).toContain('TRANSPORT COMPANY');

    // Strictly verify absent developer-seeded fields were NOT created
    expect(fieldLabels).not.toContain('Passport Number');
    expect(fieldLabels).not.toContain('Date of Birth');
    expect(fieldLabels).not.toContain('Nationality');
    expect(fieldLabels).not.toContain('Address');
    expect(fieldLabels).not.toContain('Address in India');
    expect(fieldLabels).not.toContain('Emergency Contact');
    expect(fieldLabels).not.toContain('Living Area (UAE)');
    expect(fieldLabels).not.toContain('UAE Contact / City');
    expect(fieldLabels).not.toContain('India Hometown / District');

    // Verify display order matches the CSV column order
    expect(fields[0].fieldLabel).toBe('KTPD NO');
    expect(fields[1].fieldLabel).toBe('NAME');
    expect(fields[2].fieldLabel).toBe('EMIRATES ID');
    expect(fields[3].fieldLabel).toBe('MOBILE NO');
    expect(fields[4].fieldLabel).toBe('TRANSPORT COMPANY');

    // Verify intelligent field types
    expect(fields[0].fieldType).toBe('alphanumeric');
    expect(fields[1].fieldType).toBe('text');
    expect(fields[2].fieldType).toBe('alphanumeric');
    expect(fields[3].fieldType).toBe('phone');
    expect(fields[4].fieldType).toBe('text');
  });

  /**
   * Scenario 2: A CSV with many columns (adding BLOOD GROUP, DATE OF BIRTH, ADDRESS, etc.).
   * Verify that all columns become corresponding fields with intelligent types.
   */
  test('Scenario 2: CSV with many columns creates all columns with correct intelligent types', async () => {
    const csvManyColumns = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY,BLOOD GROUP,DATE OF BIRTH,ADDRESS,NOTES
B101,Saeed Salem,784-1992-3333333-3,+971503333333,Salem Cargo LLC,O+,1992-05-15,"Building 4, Al Quoz, Dubai",Experienced driver`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvManyColumns, 'utf-8'), 'many_columns.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);

    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fieldsRes.status).toBe(200);
    const fields = fieldsRes.body.data;
    expect(fields.length).toBe(9);

    const fieldMap = new Map(fields.map((f) => [f.fieldLabel, f]));
    expect(fieldMap.get('KTPD NO').fieldType).toBe('alphanumeric');
    expect(fieldMap.get('NAME').fieldType).toBe('text');
    expect(fieldMap.get('EMIRATES ID').fieldType).toBe('alphanumeric');
    expect(fieldMap.get('MOBILE NO').fieldType).toBe('phone');
    expect(fieldMap.get('TRANSPORT COMPANY').fieldType).toBe('text');
    expect(fieldMap.get('BLOOD GROUP').fieldType).toBe('dropdown');
    expect(fieldMap.get('DATE OF BIRTH').fieldType).toBe('date');
    expect(fieldMap.get('ADDRESS').fieldType).toBe('textarea');
    expect(fieldMap.get('NOTES').fieldType).toBe('textarea');
  });

  /**
   * Scenario 3: Uploading a CSV where some columns match existing fields.
   * Verify that existing fields are reused and no duplicates are created.
   */
  test('Scenario 3: Uploading a CSV where columns match existing fields reuses fields without duplicate key errors', async () => {
    // Initial import of 5 fields
    const csvFirst = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY
C001,Tariq Mansoor,784-1987-4444444-4,+971504444444,Mansoor Express`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvFirst, 'utf-8'), 'first_batch.csv');

    const fieldsAfterFirst = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fieldsAfterFirst.body.data.length).toBe(5);

    // Second import with matching columns + new member
    const csvSecond = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY
C002,Fahad Bin Ali,784-1989-5555555-5,+971505555555,Mansoor Express`;

    const secondImportRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvSecond, 'utf-8'), 'second_batch.csv');

    expect(secondImportRes.status).toBe(200);
    expect(secondImportRes.body.success).toBe(true);
    expect(secondImportRes.body.summary.newFieldsCreated.length).toBe(0);

    const fieldsAfterSecond = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);
    // Still exactly 5 fields - no duplicates!
    expect(fieldsAfterSecond.body.data.length).toBe(5);

    // Ensure no duplicate fieldKeys in database
    const keys = fieldsAfterSecond.body.data.map((f) => f.fieldKey);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  /**
   * Scenario 4: Uploading a CSV where new columns are added.
   * Verify that only the new columns become new fields.
   */
  test('Scenario 4: Adding new columns creates only the new columns as fields', async () => {
    // First import: 5 fields
    const csv1 = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY
D001,Sultan Al-Shamsi,784-1984-6666666-6,+971506666666,Shamsi Transport`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv1, 'utf-8'), 'batch1.csv');

    // Second import: adds BLOOD GROUP and DRIVING LICENSE
    const csv2 = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY,BLOOD GROUP,DRIVING LICENSE
D002,Majid Al-Ketbi,784-1986-7777777-7,+971507777777,Shamsi Transport,A+,DL-UAE-99214`;

    const importRes2 = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv2, 'utf-8'), 'batch2.csv');

    expect(importRes2.status).toBe(200);
    expect(importRes2.body.success).toBe(true);

    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);

    // Total should be 5 + 2 = 7 fields
    expect(fieldsRes.body.data.length).toBe(7);

    const labels = fieldsRes.body.data.map((f) => f.fieldLabel);
    expect(labels).toContain('BLOOD GROUP');
    expect(labels).toContain('DRIVING LICENSE');
  });

  /**
   * Scenario 5: CSV headers with uppercase, lowercase, mixed case (e.g., "ktpd no", "NAME", "Emirates Id").
   * Verify that original headers are preserved as fieldLabel.
   */
  test('Scenario 5: Preserves exact header casing (uppercase, lowercase, mixed case) as fieldLabel', async () => {
    const csvMixedCase = `ktpd no,NAME,Emirates Id,mObiLe No,Transport Company
E001,Adel Al-Falasi,784-1991-8888888-8,+971508888888,Falasi Fleet LLC`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvMixedCase, 'utf-8'), 'mixed_case.csv');

    expect(importRes.status).toBe(200);

    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);

    const labels = fieldsRes.body.data.map((f) => f.fieldLabel);
    expect(labels).toContain('ktpd no');
    expect(labels).toContain('NAME');
    expect(labels).toContain('Emirates Id');
    expect(labels).toContain('mObiLe No');
    expect(labels).toContain('Transport Company');
  });

  /**
   * Scenario 6: CSV headers with accidental whitespace (e.g., "  MOBILE NO  ").
   * Verify that whitespace is trimmed cleanly.
   */
  test('Scenario 6: CSV headers with accidental whitespace are trimmed cleanly', async () => {
    const csvWhitespace = `  KTPD NO  ,  NAME  ,  EMIRATES ID  ,  MOBILE NO  ,  TRANSPORT COMPANY  
F001,Nasser Al-Marri,784-1983-9999999-9,+971509999999,Marri Haulage LLC`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvWhitespace, 'utf-8'), 'whitespace.csv');

    expect(importRes.status).toBe(200);

    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`);

    const labels = fieldsRes.body.data.map((f) => f.fieldLabel);
    expect(labels).toContain('KTPD NO');
    expect(labels).toContain('NAME');
    expect(labels).toContain('EMIRATES ID');
    expect(labels).toContain('MOBILE NO');
    expect(labels).toContain('TRANSPORT COMPANY');

    // Confirm no labels have leading or trailing whitespace
    labels.forEach((label) => {
      expect(label).toBe(label.trim());
    });
  });

  /**
   * Scenario 7: Alphanumeric IDs with leading zeros (e.g., "00142", "A-0023").
   * Verify that leading zeros and formatting are preserved strictly as strings.
   */
  test('Scenario 7: Alphanumeric IDs with leading zeros are preserved as strings', async () => {
    const csvLeadingZeros = `KTPD NO,NAME,EMIRATES ID,MOBILE NO,TRANSPORT COMPANY
00142,Yousef Al-Zahmi,784-1994-0000001-1,+971500000001,Zahmi Cargo
A-0023,Khalid Al-Dhaheri,784-1995-0000002-2,+971500000002,Dhaheri Cargo`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvLeadingZeros, 'utf-8'), 'leading_zeros.csv');

    expect(importRes.status).toBe(200);

    // Verify records in database
    const member1 = await Member.findOne({ name: 'Yousef Al-Zahmi' });
    expect(member1).not.toBeNull();
    expect(member1.memberId).toBe('00142');
    expect(typeof member1.memberId).toBe('string');

    const member2 = await Member.findOne({ name: 'Khalid Al-Dhaheri' });
    expect(member2).not.toBeNull();
    expect(member2.memberId).toBe('A-0023');
    expect(typeof member2.memberId).toBe('string');

    // Verify in Member Directory API
    const dirRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${adminToken}`);

    const dirMembers = dirRes.body.data;
    const found1 = dirMembers.find((m) => m.name === 'Yousef Al-Zahmi');
    const found2 = dirMembers.find((m) => m.name === 'Khalid Al-Dhaheri');

    expect(found1.memberId).toBe('00142');
    expect(found2.memberId).toBe('A-0023');
  });

  /**
   * Scenario 8: CSV with obvious spelling mistakes (e.g., "Moble No", "Trnsport Cmpany").
   * Verify that the system handles them gracefully and allows admin mapping in preview.
   */
  test('Scenario 8: CSV with spelling mistakes is handled gracefully with fuzzy matching', async () => {
    const csvTypos = `KTPD NO,NAME,Emirates ID,Moble No,Trnsport Cmpany
G001,Ibrahim Al-Balooshi,784-1981-1234567-8,+971501234567,Balooshi Fast Freight`;

    // Preview should detect and handle typos via fuzzy matching
    const previewRes = await request(app)
      .post('/api/members/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvTypos, 'utf-8'), 'typos.csv');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);

    const cols = previewRes.body.columns;
    const mobleCol = cols.find((c) => c.header === 'Moble No');
    expect(mobleCol).toBeDefined();
    // Inferred or mapped to phone
    expect(mobleCol.fieldType).toBe('phone');

    const transportCol = cols.find((c) => c.header === 'Trnsport Cmpany');
    expect(transportCol).toBeDefined();
    expect(transportCol.fieldKey).toBe('transportCompany');

    // Executing the import succeeds without crash
    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvTypos, 'utf-8'), 'typos.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);

    const member = await Member.findOne({ memberId: 'G001' });
    expect(member).not.toBeNull();
    expect(member.name).toBe('Ibrahim Al-Balooshi');
    expect(member.mobileNo).toBe('+971501234567');
    expect(member.transportCompany).toBe('Balooshi Fast Freight');
  });
});

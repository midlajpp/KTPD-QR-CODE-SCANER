import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';

let mongoServer;
let adminToken = '';
let memberId = '';
let qrToken = '';
let parentFieldId = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-persistence-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  const passwordHash = await Admin.hashPassword('AdminPass2026!');
  await Admin.create({
    username: 'superadmin',
    email: 'admin@ktpd.org',
    passwordHash,
    role: 'superadmin'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'superadmin', password: 'AdminPass2026!' });
  adminToken = loginRes.body.token;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('PART 9: Comprehensive Persistence & Validation Verification', () => {
  // TEST 1: Add a new member and verify that MongoDB contains the record
  test('TEST 1: Add a new member and verify that MongoDB contains the record', async () => {
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ziyad Ali',
        emiratesId: '784-1995-1234567-9',
        mobileNo: '+971 50 999 8888',
        transportCompany: 'KTPD Fleet Logistics',
        emergencyContact: '+971 55 111 2222 (Brother)',
        bloodGroup: 'O+',
        status: 'Active'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    memberId = res.body.data.memberId;
    qrToken = res.body.data.qrToken;
    expect(memberId).toBeDefined();
    expect(qrToken).toBeDefined();

    // Direct MongoDB verification
    const dbRecord = await Member.findOne({ memberId });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.name).toBe('Ziyad Ali');
    expect(dbRecord.qrToken).toBe(qrToken);
  });

  // TEST 2: Edit the member and verify that updated information is saved
  test('TEST 2: Edit the member and verify that updated information is saved', async () => {
    const res = await request(app)
      .put(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ziyad Ali Updated',
        transportCompany: 'KTPD Premium Transit'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Ziyad Ali Updated');

    // Direct MongoDB check
    const dbRecord = await Member.findOne({ memberId });
    expect(dbRecord.name).toBe('Ziyad Ali Updated');
    expect(dbRecord.transportCompany).toBe('KTPD Premium Transit');
    expect(dbRecord.qrToken).toBe(qrToken); // Permanent token untouched
  });

  // TEST 3: Create a custom field and verify that it persists in MongoDB
  test('TEST 3: Create a custom field and verify that it persists in MongoDB', async () => {
    const res = await request(app)
      .post('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fieldLabel: 'Security Clearance No',
        fieldType: 'alphanumeric',
        showOnPublicProfile: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const fieldKey = res.body.data.fieldKey;

    const dbField = await MemberField.findOne({ fieldKey });
    expect(dbField).not.toBeNull();
    expect(dbField.fieldLabel).toBe('Security Clearance No');
    expect(dbField.fieldType).toBe('alphanumeric');
  });

  // TEST 4: Add multiple sub-fields and verify persistence
  test('TEST 4: Add multiple sub-fields and verify persistence', async () => {
    // Create parent group
    const parentRes = await request(app)
      .post('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fieldLabel: 'Vehicle Pass Details',
        fieldType: 'group'
      });

    expect(parentRes.status).toBe(201);
    parentFieldId = parentRes.body.data._id;

    // Add sub-field 1: Alphanumeric Pass ID
    const sub1Res = await request(app)
      .post(`/api/fields/${parentFieldId}/children`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fieldLabel: 'Pass ID No',
        fieldType: 'alphanumeric'
      });
    expect(sub1Res.status).toBe(201);

    // Add sub-field 2: Date
    const sub2Res = await request(app)
      .post(`/api/fields/${parentFieldId}/children`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fieldLabel: 'Pass Expiry',
        fieldType: 'date'
      });
    expect(sub2Res.status).toBe(201);

    // Verify in MongoDB
    const dbParent = await MemberField.findById(parentFieldId);
    expect(dbParent.children.length).toBe(2);
    expect(dbParent.children[0].fieldType).toBe('alphanumeric');
    expect(dbParent.children[1].fieldType).toBe('date');
  });

  // TEST 5: Add checkbox questions and answers and verify persistence
  test('TEST 5: Add checkbox questions and answers and verify persistence', async () => {
    const cbFieldRes = await request(app)
      .post('/api/fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fieldLabel: 'Authorized Zones',
        fieldType: 'checkbox',
        options: ['Zone A', 'Zone B', 'Zone C']
      });

    expect(cbFieldRes.status).toBe(201);
    const cbKey = cbFieldRes.body.data.fieldKey;

    // Update member with checkbox answers
    const updateRes = await request(app)
      .put(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customFields: {
          [cbKey]: ['Zone A', 'Zone C']
        }
      });

    expect(updateRes.status).toBe(200);

    // Verify in MongoDB
    const memberInDb = await Member.findOne({ memberId });
    expect(memberInDb.customFields[cbKey]).toEqual(['Zone A', 'Zone C']);
  });

  // TEST 6: Logout and login again. Verify all members and fields are still present
  test('TEST 6: Logout and login again. Verify all members and fields are still present', async () => {
    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logoutRes.status).toBe(200);

    // Login again
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'superadmin', password: 'AdminPass2026!' });
    expect(loginRes.status).toBe(200);
    const newToken = loginRes.body.token;

    // Verify member still present via API
    const membersRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${newToken}`);
    expect(membersRes.status).toBe(200);
    const foundMember = membersRes.body.data.find((m) => m.memberId === memberId);
    expect(foundMember).toBeDefined();
    expect(foundMember.name).toBe('Ziyad Ali Updated');

    // Verify custom fields still present via API
    const fieldsRes = await request(app)
      .get('/api/fields')
      .set('Authorization', `Bearer ${newToken}`);
    expect(fieldsRes.status).toBe(200);
    const foundField = fieldsRes.body.data.find((f) => f.fieldLabel === 'Security Clearance No');
    expect(foundField).toBeDefined();

    adminToken = newToken; // Update active token
  });

  // TEST 7: Refresh the browser simulation. Verify all saved information is loaded from MongoDB
  test('TEST 7: Refresh the browser simulation. Verify all saved information is loaded from MongoDB', async () => {
    // /auth/me checks session token
    const authMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(authMeRes.status).toBe(200);
    expect(authMeRes.body.admin.username).toBe('superadmin');

    // Single member view loads complete member data including custom fields
    const memberRes = await request(app)
      .get(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.memberId).toBe(memberId);
    expect(memberRes.body.data.customFields).toBeDefined();
  });

  // TEST 8: Update an existing member after relogin
  test('TEST 8: Update an existing member after relogin', async () => {
    const updateRes = await request(app)
      .put(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        livingArea: 'Al Barsha, Dubai'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.livingArea).toBe('Al Barsha, Dubai');

    // Check MongoDB
    const dbRecord = await Member.findOne({ memberId });
    expect(dbRecord.livingArea).toBe('Al Barsha, Dubai');
  });

  // TEST 9: Export members to CSV and verify that saved data is correct
  test('TEST 9: Export members to CSV and verify that saved data is correct', async () => {
    const csvRes = await request(app)
      .get('/api/members/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.header['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain(memberId);
    expect(csvRes.text).toContain('Ziyad Ali Updated');
    expect(csvRes.text).toContain('Al Barsha, Dubai');
  });

  // TEST 10: Scan an existing QR code and verify that latest member information is displayed
  test('TEST 10: Scan an existing QR code and verify that latest member information is displayed', async () => {
    const publicScanRes = await request(app).get(`/api/public/members/${qrToken}`);
    expect(publicScanRes.status).toBe(200);
    expect(publicScanRes.body.success).toBe(true);
    expect(publicScanRes.body.isActive).toBe(true);
    expect(publicScanRes.body.data.name).toBe('Ziyad Ali Updated');
    expect(publicScanRes.body.data.memberId).toBe(memberId);
  });

  // TEST 11: Verify that member IDs and permanent QR tokens have not changed
  test('TEST 11: Verify that member IDs and permanent QR tokens have not changed', async () => {
    const finalRecord = await Member.findOne({ memberId });
    expect(finalRecord.memberId).toBe(memberId);
    expect(finalRecord.qrToken).toBe(qrToken);
  });
});


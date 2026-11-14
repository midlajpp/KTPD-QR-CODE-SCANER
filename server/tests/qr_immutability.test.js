import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import Admin from '../models/Admin.js';
import { generateQrBuffer, getProfileUrl } from '../services/qrService.js';
import { executeSmartImport } from '../services/smartImportService.js';

let mongoServer;
let adminToken;
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_ktpd_permanent_qr_12345';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  const testAdmin = await Admin.create({
    username: 'superadmin_qr_test',
    email: 'superadmin_qr@ktpd.org',
    passwordHash: '$2a$10$wTf7m0D7Gz0v1s7W7Z.hUeG1Q9t.lK6x8Y3jY2m0y5hV9m5Y2s8qy',
    role: 'superadmin',
    status: 'active'
  });

  adminToken = jwt.sign(
    {
      id: testAdmin._id,
      username: testAdmin.username,
      role: testAdmin.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Initialize standard member fields
  await MemberField.create([
    { fieldKey: 'name', fieldLabel: 'Full Name', fieldType: 'text', enabled: true, isSystemField: true },
    { fieldKey: 'mobileNo', fieldLabel: 'Mobile No', fieldType: 'phone', enabled: true, isSystemField: true },
    { fieldKey: 'addressInIndia', fieldLabel: 'Address in India', fieldType: 'textarea', enabled: true, isSystemField: true },
    { fieldKey: 'bloodGroup', fieldLabel: 'Blood Group', fieldType: 'dropdown', enabled: true, isSystemField: true },
    { fieldKey: 'transportCompany', fieldLabel: 'Transport Company', fieldType: 'text', enabled: true, isSystemField: true }
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('CRITICAL QR CODE RULES & PERMANENCE AUDIT', () => {
  let createdMember;
  let originalQrToken;
  let originalProfileUrl;

  test('1. Genuinely new member gets a permanent QR token and permanent profile URL', async () => {
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rashid KTPD Driver',
        ktpdNo: 'D343',
        mobileNo: '+971 50 111 2222',
        bloodGroup: 'B+',
        transportCompany: 'Gulf Road Haulage',
        addressInIndia: 'Calicut, Kerala'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.data.qrToken).toBeDefined();
    expect(res.body.data.qrToken.length).toBeGreaterThan(16);

    originalQrToken = res.body.data.qrToken;
    originalProfileUrl = getProfileUrl(originalQrToken);

    // Verify in MongoDB
    createdMember = await Member.findOne({ memberId: 'D343' });
    expect(createdMember).not.toBeNull();
    expect(createdMember.qrToken).toBe(originalQrToken);
  });

  test('2. QR code contains ONLY the permanent profile URL and NEVER member personal data', async () => {
    // Generate QR buffer
    const qrBuffer = await generateQrBuffer(originalQrToken);
    expect(qrBuffer).toBeInstanceOf(Buffer);

    // Profile URL is strictly http://.../m/<qrToken>
    expect(originalProfileUrl).toMatch(new RegExp(`/m/${originalQrToken}$`));

    // Must not contain personal data in the URL
    expect(originalProfileUrl).not.toContain('Rashid');
    expect(originalProfileUrl).not.toContain('+971');
    expect(originalProfileUrl).not.toContain('Calicut');
    expect(originalProfileUrl).not.toContain('B+');
  });

  test('3. Editing member profile fields updates MongoDB but strictly preserves QR token and URL', async () => {
    // Update name, mobile, address, bloodGroup, transportCompany
    const res = await request(app)
      .put(`/api/members/${createdMember._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rashid Muhammed Updated',
        mobileNo: '+971 50 999 8888',
        bloodGroup: 'O+',
        transportCompany: 'Emirates Prime Logistics',
        addressInIndia: 'Malappuram, Kerala 676101',
        ktpdNo: 'D343'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify updated member in MongoDB
    const updatedMember = await Member.findById(createdMember._id);
    expect(updatedMember.name).toBe('Rashid Muhammed Updated');
    expect(updatedMember.mobileNo).toBe('+971 50 999 8888');
    expect(updatedMember.bloodGroup).toBe('O+');
    expect(updatedMember.transportCompany).toBe('Emirates Prime Logistics');
    expect(updatedMember.addressInIndia).toBe('Malappuram, Kerala 676101');

    // CRITICAL: qrToken and profileUrl MUST BE 100% IDENTICAL
    expect(updatedMember.qrToken).toBe(originalQrToken);
    expect(getProfileUrl(updatedMember.qrToken)).toBe(originalProfileUrl);
  });

  test('4. Attempting to tamper with or regenerate qrToken via update payload is rejected/ignored', async () => {
    const maliciousNewToken = 'fake-hacked-qr-token-99999';

    const res = await request(app)
      .put(`/api/members/${createdMember._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rashid Mueller',
        qrToken: maliciousNewToken,
        qrUrl: 'https://malicious.com/fake'
      });

    expect(res.status).toBe(200);

    // In DB, qrToken must remain the original token
    const memberInDb = await Member.findById(createdMember._id);
    expect(memberInDb.qrToken).toBe(originalQrToken);
    expect(memberInDb.qrToken).not.toBe(maliciousNewToken);
  });

  test('5. Schema-level immutability blocks manual alteration of qrToken on existing documents', async () => {
    const member = await Member.findById(createdMember._id);
    const beforeToken = member.qrToken;
    expect(beforeToken).toBe(originalQrToken);

    // Attempt to directly alter qrToken on existing Mongoose document
    member.qrToken = 'directly_altered_token';
    await member.save();

    // Reload from DB and verify qrToken was NEVER altered
    const pristineMember = await Member.findById(createdMember._id);
    expect(pristineMember.qrToken).toBe(originalQrToken);
    expect(pristineMember.qrToken).not.toBe('directly_altered_token');
  });

  test('6. Smart CSV Import with update policy preserves existing QR token and never regenerates it', async () => {
    const csvContent = `KTPD NO,Name,Mobile No,Transport Company,Blood Group,Address in India
D343,Rashid From CSV,0501234567,Gulf Express Cargo,AB+,Kannur Kerala`;

    const result = await executeSmartImport({
      csvContent,
      columnMappings: [
        { header: 'KTPD NO', fieldKey: 'memberId', isMemberId: true, included: true },
        { header: 'Name', fieldKey: 'name', isExisting: true, included: true },
        { header: 'Mobile No', fieldKey: 'mobileNo', isExisting: true, included: true },
        { header: 'Transport Company', fieldKey: 'transportCompany', isExisting: true, included: true },
        { header: 'Blood Group', fieldKey: 'bloodGroup', isExisting: true, included: true },
        { header: 'Address in India', fieldKey: 'addressInIndia', isExisting: true, included: true }
      ],
      duplicateStrategy: 'update',
      adminUsername: 'superadmin_qr_test'
    });

    expect(result.summary.updatedCount).toBe(1);

    // Verify member in MongoDB has updated data but strictly original QR token
    const importedMember = await Member.findById(createdMember._id);
    expect(importedMember.name).toBe('Rashid From CSV');
    expect(importedMember.transportCompany).toBe('Gulf Express Cargo');
    expect(importedMember.bloodGroup).toBe('AB+');
    expect(importedMember.qrToken).toBe(originalQrToken);
    expect(getProfileUrl(importedMember.qrToken)).toBe(originalProfileUrl);
  });

  test('7. Scanning the original permanent QR URL immediately serves the latest updated data in real time', async () => {
    // Public unauthenticated request to the permanent QR token endpoint
    const res = await request(app)
      .get(`/api/public/members/${originalQrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Verify it reflects the latest updated information from CSV/edits
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.data.name).toBe('Rashid From CSV');
    expect(res.body.data.transportCompany).toBe('Gulf Express Cargo');
    expect(res.body.data.bloodGroup).toBe('AB+');
  });

  test('8. Changing member status to Inactive preserves permanent QR token and reflects on scan', async () => {
    const toggleRes = await request(app)
      .patch(`/api/members/${createdMember._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.status).toBe('Inactive');

    // In DB, qrToken is intact
    const inactiveMember = await Member.findById(createdMember._id);
    expect(inactiveMember.qrToken).toBe(originalQrToken);

    // Public scan reflects Inactive status immediately
    const scanRes = await request(app)
      .get(`/api/public/members/${originalQrToken}`);

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.data.status).toBe('Inactive');
  });
});

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';
import { syncMemberIds } from '../services/migrationService.js';

let mongoServer;
let adminToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-unification-2026';
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

describe('UNIFY MEMBER ID NUMBER ACROSS THE ENTIRE APPLICATION', () => {
  let createdMemberId = '';
  let permanentQrToken = '';

  // TEST 1: Create member with KTPD NO: D343
  test('1. Member created with KTPD NO "D343" sets primary memberId to "D343" (Single Source of Truth)', async () => {
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ktpdNo: 'D343',
        name: 'Rashid Al KTPD',
        emiratesId: '784-1988-1234567-1',
        mobileNo: '+971 50 123 4567',
        transportCompany: 'Al Futtaim Logistics',
        customFields: {
          ktpdNo: 'D343'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.data.customFields.ktpdNo).toBe('D343');
    expect(res.body.data.qrToken).toBeDefined();

    createdMemberId = res.body.data.memberId;
    permanentQrToken = res.body.data.qrToken;

    // Verify directly in MongoDB
    const inDb = await Member.findOne({ qrToken: permanentQrToken });
    expect(inDb.memberId).toBe('D343');
    expect(inDb.customFields.ktpdNo).toBe('D343');
  });

  // TEST 2: Member Details Header & Badge show D343
  test('2. Member Details endpoint returns "D343" as memberId and customFields.ktpdNo', async () => {
    const res = await request(app)
      .get(`/api/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.data.customFields.ktpdNo).toBe('D343');
    expect(res.body.data.profileUrl).toContain(`/m/${permanentQrToken}`);
  });

  // TEST 3: Directory listing displays D343
  test('3. Member Directory listing returns "D343" in data list', async () => {
    const res = await request(app)
      .get('/api/members?search=D343')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find((m) => m.memberId === 'D343');
    expect(found).toBeDefined();
    expect(found.memberId).toBe('D343');
  });

  // TEST 4: CSV Export ID No shows D343
  test('4. CSV Export outputs "D343" under "Member ID" header', async () => {
    const res = await request(app)
      .get('/api/members/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Member ID');
    expect(res.text).toContain('"D343"');
  });

  // TEST 5: Public QR Profile shows D343
  test('5. Public QR Profile (/api/public/members/:qrToken) displays "D343"', async () => {
    const res = await request(app).get(`/api/public/members/${permanentQrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.memberId).toBe('D343');
    expect(res.body.isActive).toBe(true);
  });

  // TEST 6: Editing KTPD NO updates memberId while strictly preserving qrToken
  test('6. Editing KTPD NO to "D999" updates memberId everywhere while permanent QR token remains untouched', async () => {
    const res = await request(app)
      .put(`/api/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ktpdNo: 'D999',
        customFields: {
          ktpdNo: 'D999'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.data.memberId).toBe('D999');
    expect(res.body.data.customFields.ktpdNo).toBe('D999');
    // Token strictly preserved!
    expect(res.body.data.qrToken).toBe(permanentQrToken);

    // Verify DB update
    const updatedInDb = await Member.findOne({ qrToken: permanentQrToken });
    expect(updatedInDb.memberId).toBe('D999');
    expect(updatedInDb.customFields.ktpdNo).toBe('D999');

    // QR scan still works and reflects new ID D999!
    const scanRes = await request(app).get(`/api/public/members/${permanentQrToken}`);
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.data.memberId).toBe('D999');
  });

  // TEST 7: Duplicate check rejects duplicate KTPD NO with 409
  test('7. Duplicate KTPD NO is rejected with 409: "Member ID already in use. Please enter a unique ID."', async () => {
    // Attempt to create another member with D999
    const dupCreateRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ktpdNo: 'D999',
        name: 'Another Driver',
        mobileNo: '+971 50 777 6666'
      });

    expect(dupCreateRes.status).toBe(409);
    expect(dupCreateRes.body.errors[0].message).toBe('Member ID already in use. Please enter a unique ID.');

    // Create a second member with unique ID
    const member2Res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ktpdNo: 'KT-002',
        name: 'Second Driver',
        mobileNo: '+971 50 888 7777'
      });
    expect(member2Res.status).toBe(201);
    const member2Id = member2Res.body.data.memberId;

    // Attempt to update second member to D999
    const dupUpdateRes = await request(app)
      .put(`/api/members/${member2Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ktpdNo: 'D999'
      });

    expect(dupUpdateRes.status).toBe(409);
    expect(dupUpdateRes.body.errors[0].message).toBe('Member ID already in use. Please enter a unique ID.');
  });

  // TEST 8: Supports complex alphanumeric values (preserving exact string)
  test('8. Supports complex alphanumeric values: KTPD/2026/001, KT-001, A_2026', async () => {
    const complexIds = ['KTPD/2026/001', 'KT-001', 'A_2026'];

    for (const testId of complexIds) {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ktpdNo: testId,
          name: `Driver for ${testId}`,
          mobileNo: '+971 50 000 1111'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.memberId).toBe(testId);
      expect(res.body.data.customFields.ktpdNo).toBe(testId);

      // Verify exact string lookup works
      const getRes = await request(app)
        .get(`/api/members/${encodeURIComponent(testId)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.memberId).toBe(testId);
    }
  });

  // TEST 9: Startup migration syncs existing member records
  test('9. Startup migration syncMemberIds() migrates existing customFields.ktpdNo to active memberId', async () => {
    // Manually create a legacy record in DB where memberId is KTPD-0005 but customFields.ktpdNo is D555
    const legacyMember = new Member({
      memberId: 'KTPD-0005',
      qrToken: 'legacy-token-55555',
      name: 'Legacy Driver',
      customFields: {
        ktpdNo: 'D555'
      }
    });
    await legacyMember.save();

    // Verify before migration
    const before = await Member.findOne({ qrToken: 'legacy-token-55555' });
    expect(before.memberId).toBe('KTPD-0005');
    expect(before.customFields.ktpdNo).toBe('D555');

    // Run migration
    await syncMemberIds();

    // Verify after migration: memberId has been synced to D555!
    const after = await Member.findOne({ qrToken: 'legacy-token-55555' });
    expect(after.memberId).toBe('D555');
    expect(after.customFields.ktpdNo).toBe('D555');
    expect(after.qrToken).toBe('legacy-token-55555'); // permanent token preserved
  });
});


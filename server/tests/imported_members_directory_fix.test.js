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
  process.env.JWT_SECRET = 'test-secret-imported-members-fix-2026';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  const adminHash = await Admin.hashPassword('AdminPass123!');
  await Admin.create({
    fullName: 'Test Superadmin',
    username: 'superadmin_test',
    email: 'admin_test@ktpd.org',
    passwordHash: adminHash,
    role: 'superadmin',
    status: 'active'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'admin_test@ktpd.org', password: 'AdminPass123!' });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Imported Members in Member Directory - Comprehensive Verification', () => {
  beforeEach(async () => {
    await Member.deleteMany({});
  });

  // 1. Import one new member & 2. Verify exists in MongoDB & 3. Verify in Member Directory
  test('1, 2, 3: Import single new member, verify existence in MongoDB, and verify in Member Directory API', async () => {
    const csvSingle = `KTPD NO,Name,Mobile No,Transport Company,Blood Group,Living Area
A001,Rashid Al-Nuaimi,+971501111111,Al Nuaimi Haulage,B+,Dubai`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvSingle, 'utf-8'), 'single_member.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.summary.importedCount).toBe(1);

    // 2. Direct MongoDB check
    const dbMember = await Member.findOne({ memberId: 'A001' });
    expect(dbMember).not.toBeNull();
    expect(dbMember.name).toBe('Rashid Al-Nuaimi');
    expect(dbMember.mobileNo).toBe('+971501111111');
    expect(dbMember.transportCompany).toBe('Al Nuaimi Haulage');
    expect(dbMember.isDeleted).toBe(false);
    expect(dbMember.status).toBe('Active');

    // 3. Member Directory API check
    const dirRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dirRes.status).toBe(200);
    expect(dirRes.body.data.length).toBe(1);
    expect(dirRes.body.pagination.total).toBe(1);
    expect(dirRes.body.data[0].memberId).toBe('A001');
    expect(dirRes.body.data[0].name).toBe('Rashid Al-Nuaimi');
  });

  // 4. Import multiple members
  test('4: Import batch of multiple members and verify all appear in MongoDB and Directory', async () => {
    const csvBatch = `KTPD NO,Name,Mobile No,Transport Company,Blood Group,Status
M101,Midlaj Parappanangadi,+971502222221,Gulf Fleet,O+,Active
M102,Ziyad Farooq,+971502222222,Oasis Logistics,A+,Active
M103,Faisal Khan,+971502222223,Al Ain Transport,AB+,Active`;

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvBatch, 'utf-8'), 'batch_members.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.summary.importedCount).toBe(3);

    // Total in MongoDB
    const totalInDb = await Member.countDocuments({ isDeleted: false });
    expect(totalInDb).toBe(3);

    // Total in Directory
    const dirRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dirRes.status).toBe(200);
    expect(dirRes.body.pagination.total).toBe(3);
    expect(dirRes.body.data.length).toBe(3);
  });

  // 5. Verify dashboard counts
  test('5: Dashboard statistics endpoint reflects imported members accurately', async () => {
    const csvData = `KTPD NO,Name,Mobile No,Transport Company,Status,Blood Group
D201,Driver One,+971503333331,Alpha Logistics,Active,A+
D202,Driver Two,+971503333332,Alpha Logistics,Active,B+
D203,Driver Three,+971503333333,Beta Transport,Inactive,O+`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData, 'utf-8'), 'dash_test.csv');

    const dashRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.totalMembers).toBe(3);
    expect(dashRes.body.data.activeMembers).toBe(2);
    expect(dashRes.body.data.inactiveMembers).toBe(1);
    expect(dashRes.body.data.qrCodesGenerated).toBe(3);

    const recentRes = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(recentRes.status).toBe(200);
    expect(recentRes.body.data.recentlyAdded.length).toBe(3);
  });

  // 6. Verify search and filters
  test('6: Member Directory search and filters accurately find imported members', async () => {
    const csvData = `KTPD NO,Name,Mobile No,Transport Company,Blood Group,Status
S301,Salman Al-Farsi,+971504444441,Red Sea Express,O+,Active
S302,Kareem Abdul,+971504444442,Desert Haulage,A-,Inactive
S303,Deepak Nair,+971504444443,Red Sea Express,B+,Active`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData, 'utf-8'), 'search_filter.csv');

    // Search by Name
    const searchName = await request(app)
      .get('/api/members?search=Salman')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchName.body.data.length).toBe(1);
    expect(searchName.body.data[0].memberId).toBe('S301');

    // Search by Member ID
    const searchId = await request(app)
      .get('/api/members?search=S302')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchId.body.data.length).toBe(1);
    expect(searchId.body.data[0].name).toBe('Kareem Abdul');

    // Filter by Status Active
    const filterStatus = await request(app)
      .get('/api/members?status=Active')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filterStatus.body.data.length).toBe(2);

    // Filter by Blood Group O+
    const filterBlood = await request(app)
      .get('/api/members?bloodGroup=O%2B')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filterBlood.body.data.length).toBe(1);
    expect(filterBlood.body.data[0].memberId).toBe('S301');

    // Filter by Transport Company
    const filterCompany = await request(app)
      .get('/api/members?transportCompany=Red%20Sea%20Express')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filterCompany.body.data.length).toBe(2);
  });

  // 7. Verify pagination
  test('7: Pagination handles imported member counts cleanly across pages', async () => {
    // Generate 25 rows
    const rows = ['KTPD NO,Name,Mobile No'];
    for (let i = 1; i <= 25; i++) {
      const idStr = `P${String(i).padStart(3, '0')}`;
      rows.push(`${idStr},Member ${i},+97150555${String(i).padStart(4, '0')}`);
    }

    const importRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(rows.join('\n'), 'utf-8'), 'pagination.csv');

    expect(importRes.body.summary.importedCount).toBe(25);

    // Page 1 (limit 10)
    const page1 = await request(app)
      .get('/api/members?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page1.body.data.length).toBe(10);
    expect(page1.body.pagination.total).toBe(25);
    expect(page1.body.pagination.totalPages).toBe(3);

    // Page 3 (remaining 5)
    const page3 = await request(app)
      .get('/api/members?page=3&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page3.body.data.length).toBe(5);
  });

  // 8. Import an existing member using Update
  test('8: Import with duplicateStrategy=update safely updates existing member and remains in Directory', async () => {
    const initialCsv = `KTPD NO,Name,Mobile No,Transport Company
U601,Original Name,+971506666661,Initial Haulage`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(initialCsv, 'utf-8'), 'init_u601.csv');

    const mBefore = await Member.findOne({ memberId: 'U601' });
    const originalToken = mBefore.qrToken;
    const originalDbId = mBefore._id.toString();

    // Re-import with update
    const updateCsv = `KTPD NO,Name,Mobile No,Transport Company
U601,Updated Full Name,+971506666669,Updated Logistics LLC`;

    const updateRes = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('duplicateStrategy', 'update')
      .attach('file', Buffer.from(updateCsv, 'utf-8'), 'update_u601.csv');

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.summary.updatedCount).toBe(1);
    expect(updateRes.body.summary.importedCount).toBe(0);

    // Verify in MongoDB
    const mAfter = await Member.findOne({ memberId: 'U601' });
    expect(mAfter._id.toString()).toBe(originalDbId); // Permanent MongoDB _id
    expect(mAfter.qrToken).toBe(originalToken); // Permanent QR Token
    expect(mAfter.name).toBe('Updated Full Name');
    expect(mAfter.transportCompany).toBe('Updated Logistics LLC');

    // Verify in Member Directory
    const dirRes = await request(app)
      .get('/api/members?search=U601')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dirRes.status).toBe(200);
    expect(dirRes.body.data.length).toBe(1);
    expect(dirRes.body.data[0].name).toBe('Updated Full Name');
    expect(dirRes.body.data[0].transportCompany).toBe('Updated Logistics LLC');
  });

  // 9. Verify data remains visible after page refresh and logout/login
  test('9: Data remains permanently in MongoDB and is visible after re-authenticating (simulating logout/login)', async () => {
    const csvData = `KTPD NO,Name,Mobile No
L701,Persistent Member,+971507777777`;

    await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData, 'utf-8'), 'persist.csv');

    // Simulate login again to get a new session token
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin_test@ktpd.org', password: 'AdminPass123!' });

    const freshToken = newLogin.body.token;

    // Fetch members with the fresh session token
    const listRes = await request(app)
      .get('/api/members?search=L701')
      .set('Authorization', `Bearer ${freshToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].memberId).toBe('L701');
    expect(listRes.body.data[0].name).toBe('Persistent Member');
  });

  // 10. Serial Number (Sl No) column does NOT overwrite KTPD NO
  test('10: A CSV containing both KTPD NO and Sl No preserves the official alphanumeric KTPD NO', async () => {
    const csvData = `KTPD NO,Sl No,Name,Mobile No
K888,1,Driver Test,+971508888888`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData, 'utf-8'), 'slno_fix.csv');

    expect(res.status).toBe(200);
    expect(res.body.summary.importedCount).toBe(1);

    const m = await Member.findOne({ memberId: 'K888' });
    expect(m).not.toBeNull();
    expect(m.memberId).toBe('K888');

    const dirRes = await request(app)
      .get('/api/members?search=K888')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dirRes.body.data.length).toBe(1);
    expect(dirRes.body.data[0].memberId).toBe('K888');
  });
});

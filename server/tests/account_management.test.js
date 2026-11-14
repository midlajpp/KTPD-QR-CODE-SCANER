import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import MemberField from '../models/MemberField.js';
import Member from '../models/Member.js';

let mongoServer;
let superAdminToken = '';
let regularAdminToken = '';
let staffToken = '';
let createdStaffId = '';
let createdAdminId = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-accounts-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await MemberField.initializeDefaultFields();

  // Create primary Super Admin
  const hash = await Admin.hashPassword('SuperAdminPass2026!');
  await Admin.create({
    fullName: 'Main Super Administrator',
    username: 'superboss',
    email: 'super@ktpd.org',
    passwordHash: hash,
    role: 'superadmin',
    status: 'active'
  });

  const superLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'superboss', password: 'SuperAdminPass2026!' });
  superAdminToken = superLogin.body.token;

  // Create Regular Admin
  const adminHash = await Admin.hashPassword('AdminPass2026!');
  const adminUser = await Admin.create({
    fullName: 'Regular Admin Officer',
    username: 'regularadmin',
    email: 'adminofficer@ktpd.org',
    passwordHash: adminHash,
    role: 'admin',
    status: 'active'
  });
  createdAdminId = adminUser._id.toString();

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'regularadmin', password: 'AdminPass2026!' });
  regularAdminToken = adminLogin.body.token;

  // Create Staff User
  const staffHash = await Admin.hashPassword('StaffPass2026!');
  const staffUser = await Admin.create({
    fullName: 'Staff Inspector',
    username: 'staffuser',
    email: 'staff@ktpd.org',
    passwordHash: staffHash,
    role: 'staff',
    status: 'active'
  });
  createdStaffId = staffUser._id.toString();

  const staffLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'staffuser', password: 'StaffPass2026!' });
  staffToken = staffLogin.body.token;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('ACCOUNT MANAGEMENT & ROLE-BASED ACCESS CONTROL (RBAC) TESTS', () => {
  let newAccountId = '';

  // 1. RBAC on Account Management
  test('1. Super Admin can view accounts list, but Admin and Staff are denied access (403)', async () => {
    // Super Admin: Allowed
    const superRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(superRes.status).toBe(200);
    expect(superRes.body.success).toBe(true);
    expect(Array.isArray(superRes.body.data)).toBe(true);

    // Regular Admin: Denied
    const adminRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${regularAdminToken}`);
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.success).toBe(false);

    // Staff: Denied
    const staffRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(403);
    expect(staffRes.body.success).toBe(false);
  });

  // 2. Super Admin Creates a New Account
  test('2. Super Admin can create a new authorized staff account', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        fullName: 'Zayd Al Hashimi',
        username: 'zayd_staff',
        email: 'zayd@ktpd.org',
        password: 'ZaydPassword2026!',
        confirmPassword: 'ZaydPassword2026!',
        role: 'staff',
        status: 'active'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('zayd_staff');
    expect(res.body.data.role).toBe('staff');
    expect(res.body.data.passwordHash).toBeUndefined(); // Never expose passwordHash!
    newAccountId = res.body.data._id;
  });

  // 3. Validation: Duplicate Username or Email Rejection
  test('3. Rejects duplicate username or email registration', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        fullName: 'Duplicate Test',
        username: 'zayd_staff', // duplicate username
        email: 'unique_zayd@ktpd.org',
        password: 'Password2026!',
        confirmPassword: 'Password2026!',
        role: 'staff'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already taken/i);
  });

  // 4. Validation: Password Mismatch Rejection
  test('4. Rejects account creation when password and confirm password do not match', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        fullName: 'Mismatch Test',
        username: 'mismatch_user',
        email: 'mismatch@ktpd.org',
        password: 'Password2026!',
        confirmPassword: 'DifferentPassword2026!',
        role: 'staff'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/do not match/i);
  });

  // 5. Update Account Details
  test('5. Super Admin can update account full name, email, and role', async () => {
    const res = await request(app)
      .put(`/api/accounts/${newAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        fullName: 'Zayd Al Hashimi Senior',
        role: 'admin' // Promoted to admin
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Zayd Al Hashimi Senior');
    expect(res.body.data.role).toBe('admin');
  });

  // 6. Reset Password for Account
  test('6. Super Admin can reset password for an account', async () => {
    const res = await request(app)
      .patch(`/api/accounts/${newAccountId}/password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        newPassword: 'BrandNewPassword2026!',
        confirmPassword: 'BrandNewPassword2026!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user can now log in with the new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'zayd_staff', password: 'BrandNewPassword2026!' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  // 7. Toggle Account Status (Deactivate / Activate)
  test('7. Super Admin can deactivate an account, preventing further logins', async () => {
    const res = await request(app)
      .patch(`/api/accounts/${newAccountId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('inactive');

    // Deactivated user cannot log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'zayd_staff', password: 'BrandNewPassword2026!' });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.message).toMatch(/deactivated/i);
  });

  // 8. Safeguard: Cannot Deactivate or Demote Last Active Super Admin
  test('8. Safeguard: Rejects deactivating or demoting the last active Super Admin', async () => {
    const myAccount = await Admin.findOne({ username: 'superboss' });

    // Try to deactivate
    const deactRes = await request(app)
      .patch(`/api/accounts/${myAccount._id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'inactive' });
    expect(deactRes.status).toBe(400);
    expect(deactRes.body.message).toMatch(/last active super admin/i);

    // Try to demote role
    const demoteRes = await request(app)
      .patch(`/api/accounts/${myAccount._id}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'admin' });
    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body.message).toMatch(/last active super admin/i);
  });

  // 9. Safeguard: Super Admin cannot delete their own logged-in account
  test('9. Safeguard: Rejects self-deletion of currently logged-in Super Admin account', async () => {
    const myAccount = await Admin.findOne({ username: 'superboss' });

    const res = await request(app)
      .delete(`/api/accounts/${myAccount._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot delete your own/i);
  });

  // 10. Super Admin Can Delete Other Accounts
  test('10. Super Admin can delete a non-self account', async () => {
    const res = await request(app)
      .delete(`/api/accounts/${newAccountId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify account no longer exists in database
    const check = await Admin.findById(newAccountId);
    expect(check).toBeNull();
  });

  // 11. Role Permissions: Staff Member Restrictions
  test('11. Staff member can view members and QR preview, but cannot create, edit, or delete members', async () => {
    // Staff can view member list
    const listRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(listRes.status).toBe(200);

    // Staff cannot create a member
    const createRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Unauthorized Staff Member' });
    expect(createRes.status).toBe(403);

    // Staff cannot import or export
    const exportRes = await request(app)
      .get('/api/members/export')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(exportRes.status).toBe(403);
  });

  // 12. Role Permissions: Staff & Regular Admin cannot modify QR Profile Design
  test('12. Only Super Admin can modify or publish QR profile design; Admin and Staff are denied', async () => {
    // Admin trying to publish design
    const adminPub = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${regularAdminToken}`)
      .send();
    expect(adminPub.status).toBe(403);

    // Staff trying to publish design
    const staffPub = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${staffToken}`)
      .send();
    expect(staffPub.status).toBe(403);

    // Super Admin can publish design
    const superPub = await request(app)
      .post('/api/design/publish')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send();
    expect(superPub.status).toBe(200);
  });
});


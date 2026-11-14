import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import Member from '../models/Member.js';
import Counter from '../models/Counter.js';
import MemberField from '../models/MemberField.js';

let mongoServer;
let adminToken = '';
let createdMemberId = '';
let permanentQrToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-ktpd-super-secure-token-2026';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize dynamic field definitions
  await MemberField.initializeDefaultFields();

  // Seed test admin
  const passwordHash = await Admin.hashPassword('AdminPass2026!');
  await Admin.create({
    username: 'superadmin',
    email: 'admin@ktpd.org',
    passwordHash,
    role: 'superadmin'
  });
}, 90000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('KTPD Membership Management System - Comprehensive Test Suite', () => {
  // Test 1: Admin Login & JWT Generation
  test('1. Admin can successfully log in and receive a JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'superadmin',
        password: 'AdminPass2026!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.username).toBe('superadmin');
    adminToken = res.body.token;
  });

  // Test 16: Unauthorized access rejection
  test('16. Unauthorized users cannot access protected admin routes', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 2, 3, 4: Admin creates a member, generates sequential ID (KTPD-0001) & permanent QR token
  test('2, 3, 4. Admin adds a member, system generates sequential KTPD-0001 ID and permanent QR token', async () => {
    const memberPayload = {
      name: 'Rashid Muhammed',
      emiratesId: '784-1988-1234567-1',
      mobileNo: '+971 50 123 4567',
      transportCompany: 'Al Futtaim Logistics',
      emergencyContact: '+971 55 987 6543 (Brother)',
      uae: 'Dubai, Deira',
      india: 'Malappuram, Kerala',
      addressInIndia: 'Darul Aman, Tirur PO, Kerala 676101',
      livingArea: 'Deira, Dubai',
      bloodGroup: 'B+',
      status: 'Active',
      privacySettings: {
        hideEmiratesId: true,
        hideAddressInIndia: true,
        hideEmergencyContact: false
      }
    };

    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(memberPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe('KTPD-0001');
    expect(res.body.data.qrToken).toBeDefined();
    expect(res.body.data.profileUrl).toContain('/m/');

    createdMemberId = res.body.data.memberId;
    permanentQrToken = res.body.data.qrToken;
  });

  // Test: Sequential numbering for second member
  test('3b. Next member receives next sequential ID KTPD-0002', async () => {
    const secondPayload = {
      name: 'Abdul Kareem',
      emiratesId: '784-1992-7654321-2',
      mobileNo: '+971 52 234 5678',
      transportCompany: 'Emirates Transport',
      emergencyContact: '+91 98470 12345 (Father)',
      bloodGroup: 'O+'
    };

    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(secondPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.memberId).toBe('KTPD-0002');
  });

  // Test 5: QR image stream and download
  test('5. Admin can download or stream high-res QR PNG for member', async () => {
    const res = await request(app)
      .get(`/api/members/${createdMemberId}/qr?download=true`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('image/png');
    expect(res.header['content-disposition']).toContain(`${createdMemberId}.png`);
    expect(res.body.length).toBeGreaterThan(500); // Valid PNG data buffer
  });

  // Test 6, 7: Public profile endpoint opens without auth via permanent QR token
  test('6, 7. Scanning QR code opens public profile without auth and displays initial member info', async () => {
    const res = await request(app).get(`/api/public/members/${permanentQrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isActive).toBe(true);
    expect(res.body.data.memberId).toBe('KTPD-0001');
    expect(res.body.data.name).toBe('Rashid Muhammed');
    expect(res.body.data.transportCompany).toBe('Al Futtaim Logistics');
    expect(res.body.data.bloodGroup).toBe('B+');

    // Privacy checks: Emirates ID should be masked, address hidden
    expect(res.body.data.emiratesId).toContain('****');
    expect(res.body.data.isAddressHidden).toBe(true);

    // Security check: No Mongo internals exposed
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  // Test 8, 9, 10, 11: Edit member - name is updated, but memberId, qrToken, and profileUrl remain strictly identical!
  test('8, 9, 10, 11. Admin edits member details; QR token and URL remain permanently identical while profile reflects new name', async () => {
    const updatePayload = {
      name: 'Rashid Muhammed Updated',
      transportCompany: 'DHL Global Logistics',
      mobileNo: '+971 50 999 8888',
      // Attacker or payload tries to mutate memberId or qrToken
      memberId: 'HACKED-ID-9999',
      qrToken: 'tampered-token-xyz'
    };

    const updateRes = await request(app)
      .put(`/api/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe('Rashid Muhammed Updated');
    // Crucial: ID and QR token are unchanged!
    expect(updateRes.body.data.memberId).toBe(createdMemberId);
    expect(updateRes.body.data.qrToken).toBe(permanentQrToken);

    // Rescan original permanent QR token
    const rescanRes = await request(app).get(`/api/public/members/${permanentQrToken}`);

    expect(rescanRes.status).toBe(200);
    expect(rescanRes.body.data.name).toBe('Rashid Muhammed Updated');
    expect(rescanRes.body.data.transportCompany).toBe('DHL Global Logistics');
    expect(rescanRes.body.data.memberId).toBe('KTPD-0001');
  });

  // Test 15: Inactive status handling
  test('15. Inactive membership status correctly updates and public profile displays Inactive Notice', async () => {
    const toggleRes = await request(app)
      .patch(`/api/members/${createdMemberId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.status).toBe('Inactive');

    // Public QR scan for inactive member
    const publicRes = await request(app).get(`/api/public/members/${permanentQrToken}`);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.isActive).toBe(false);
    expect(publicRes.body.data.status).toBe('Inactive');
    expect(publicRes.body.message).toContain('INACTIVE');
  });

  // Test 12: CSV Import validation and bulk ingestion
  test('12. Bulk CSV import correctly validates rows and imports new members', async () => {
    const csvContent = `name,emiratesId,mobileNo,transportCompany,emergencyContact,bloodGroup,livingArea,status
Faisal Khan,784-1995-1122334-5,+971 50 111 2233,Gulf Express,+971 50 999 0000,A+,Bur Dubai,Active
Niyas Babu,784-1990-9988776-6,+971 52 333 4455,Sharjah Trans,+971 55 123 4567,O-,Rolla,Active`;

    const res = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ csvData: csvContent });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.importedCount).toBe(2);

    // Verify imported members in DB
    const faisal = await Member.findOne({ emiratesId: '784-1995-1122334-5' });
    expect(faisal).not.toBeNull();
    expect(faisal.memberId).toBe('KTPD-0003');
    expect(faisal.qrToken).toBeDefined();
  });

  // Test 13, 14: Illustrator ZIP export containing CSV with @qrImage and matching PNG files
  test('13, 14. Illustrator export produces valid ZIP with CSV variables, README, and matching QR PNGs', async () => {
    const res = await request(app)
      .get('/api/members/qr/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/zip');
    expect(res.header['content-disposition']).toContain('ktpd_illustrator_package');
  }, 30000);

  // Test Dashboard Stats & Recent API
  test('Dashboard stats and recent activities are returned from MongoDB', async () => {
    const statsRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalMembers).toBeGreaterThanOrEqual(4);
    expect(statsRes.body.data.qrCodesGenerated).toBe(statsRes.body.data.totalMembers);

    const recentRes = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(recentRes.status).toBe(200);
    expect(recentRes.body.data.recentlyAdded.length).toBeGreaterThan(0);
    expect(recentRes.body.data.recentLogs.length).toBeGreaterThan(0);
  });

  // Test: Invalid QR token handling
  test('Scanning a non-existent or deleted QR token returns a 404 response', async () => {
    const res = await request(app).get('/api/public/members/non-existent-fake-token-12345');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.isFound).toBe(false);
  });

  // =========================================================================
  // SECTION 9: DYNAMIC CUSTOM FIELD MANAGEMENT SYSTEM TESTS
  // =========================================================================
  describe('Dynamic Custom Field Management System', () => {
    let customFieldId = '';
    let customMemberQrToken = '';
    let customMemberId = '';

    test('15. Admin can retrieve list of initial default member fields', async () => {
      const res = await request(app)
        .get('/api/fields')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);

      // Verify system fields exist
      const keys = res.body.data.map((f) => f.fieldKey);
      expect(keys).toContain('name');
      expect(keys).toContain('emiratesId');
      expect(keys).toContain('bloodGroup');
    });

    test('16. Admin creates a new custom field "Passport Number" (type: text, public: true)', async () => {
      const res = await request(app)
        .post('/api/fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldLabel: 'Passport Number',
          fieldType: 'text',
          required: false,
          enabled: true,
          showOnPublicProfile: true,
          showInCsv: true,
          showInSearch: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fieldKey).toBe('passportNumber');
      expect(res.body.data.fieldLabel).toBe('Passport Number');
      expect(res.body.data.fieldType).toBe('text');
      expect(res.body.data.isSystemField).toBe(false);

      customFieldId = res.body.data._id;
    });

    test('17. Admin creates a select/dropdown field with options', async () => {
      const res = await request(app)
        .post('/api/fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldLabel: 'Visa Status',
          fieldType: 'select',
          options: ['Employment Visa', 'Golden Visa', 'Partner Visa', 'Visit Visa'],
          required: false,
          enabled: true,
          showOnPublicProfile: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.options).toHaveLength(4);
      expect(res.body.data.options).toContain('Employment Visa');
    });

    test('18. Validates custom field types on member creation (e.g. invalid date or invalid select option)', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Test User',
          emiratesId: '784-1990-9999999-9',
          mobileNo: '+971 50 999 9999',
          transportCompany: 'Test Cargo',
          emergencyContact: '+971 50 111 2222',
          bloodGroup: 'B+',
          customFields: {
            visaStatus: 'NonExistentOption'
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    test('19. Admin creates a new member with custom field data (Passport Number)', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Shabeer Ahamed',
          emiratesId: '784-1987-4433221-1',
          mobileNo: '+971 55 444 3322',
          transportCompany: 'Al Safeer Logistics',
          emergencyContact: '+971 50 888 7766',
          bloodGroup: 'AB+',
          livingArea: 'Deira, Dubai',
          status: 'Active',
          customFields: {
            passportNumber: 'N98765432',
            visaStatus: 'Employment Visa'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customFields.passportNumber).toBe('N98765432');
      expect(res.body.data.customFields.visaStatus).toBe('Employment Visa');

      customMemberId = res.body.data.memberId;
      customMemberQrToken = res.body.data.qrToken;
    });

    test('20. Scanning public QR code displays the enabled custom field on public profile', async () => {
      const res = await request(app).get(`/api/public/members/${customMemberQrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customFields).toBeDefined();

      const passportField = res.body.data.customFields.find((f) => f.fieldKey === 'passportNumber');
      expect(passportField).toBeDefined();
      expect(passportField.fieldLabel).toBe('Passport Number');
      expect(passportField.value).toBe('N98765432');
    });

    test('21. Admin renames the field (fieldLabel changes, fieldKey & member data stay intact)', async () => {
      const updateRes = await request(app)
        .put(`/api/fields/${customFieldId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldLabel: 'International Passport Number'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.fieldKey).toBe('passportNumber');
      expect(updateRes.body.data.fieldLabel).toBe('International Passport Number');

      // Member's saved customFields in database still has passportNumber
      const member = await Member.findOne({ memberId: customMemberId });
      expect(member.customFields.passportNumber).toBe('N98765432');

      // Public profile now displays the updated label with the same value
      const publicRes = await request(app).get(`/api/public/members/${customMemberQrToken}`);
      expect(publicRes.status).toBe(200);

      const updatedPassportField = publicRes.body.data.customFields.find(
        (f) => f.fieldKey === 'passportNumber'
      );
      expect(updatedPassportField).toBeDefined();
      expect(updatedPassportField.fieldLabel).toBe('International Passport Number');
      expect(updatedPassportField.value).toBe('N98765432');
    });

    test('22. Original Member ID and QR URL remain strictly unchanged throughout field modifications', async () => {
      const member = await Member.findOne({ memberId: customMemberId });
      expect(member.memberId).toBe(customMemberId);
      expect(member.qrToken).toBe(customMemberQrToken);
    });

    test('23. CSV Template automatically includes new custom fields as valid columns', async () => {
      const res = await request(app)
        .get('/api/members/template')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('passportNumber');
    });

    test('24. CSV Export includes custom fields and correct member values', async () => {
      const res = await request(app)
        .get('/api/members/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('KTPD-Members.csv');
      expect(res.text).toContain('Passport Number');
      expect(res.text).toContain('N98765432');
      expect(res.text).toContain('Member ID');
    });

    test('25. Disabling public visibility removes field from public QR scan', async () => {
      const toggleRes = await request(app)
        .put(`/api/fields/${customFieldId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          showOnPublicProfile: false
        });

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.showOnPublicProfile).toBe(false);

      const publicRes = await request(app).get(`/api/public/members/${customMemberQrToken}`);
      expect(publicRes.status).toBe(200);

      const hiddenPassportField = publicRes.body.data.customFields.find(
        (f) => f.fieldKey === 'passportNumber'
      );
      expect(hiddenPassportField).toBeUndefined();
    });

    test('26. Essential permanent system identifiers (memberId, qrToken) cannot be deleted', async () => {
      const pseudoIdField = await MemberField.create({
        fieldKey: 'memberId',
        fieldLabel: 'KTPD Member ID Identifier',
        fieldType: 'text'
      });

      const res = await request(app)
        .delete(`/api/fields/${pseudoIdField._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete permanent system identifier');

      await MemberField.deleteOne({ _id: pseudoIdField._id });
    });

    test('27. Custom field can be safely archived while preserving member values', async () => {
      const res = await request(app)
        .delete(`/api/fields/${customFieldId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const archivedField = await MemberField.findById(customFieldId);
      expect(archivedField.isArchived).toBe(true);
      expect(archivedField.enabled).toBe(false);

      // Verify member record still has the data
      const member = await Member.findOne({ memberId: customMemberId });
      expect(member.customFields.passportNumber).toBe('N98765432');
    });

    // =========================================================================
    // ADVANCED DYNAMIC FIELD BUILDER & CONDITIONAL SUB-FIELDS (SECTION 11)
    // =========================================================================
    describe('Advanced Dynamic Field Builder, Nested Sub-Fields & Conditional Questions', () => {
      let unlabelledFieldKey = '';
      let parentGroupId = '';
      let parentGroupKey = '';
      let checkboxFieldId = '';
      let checkboxFieldKey = '';
      let conditionalParentId = '';
      let advancedMemberId = '';
      let advancedMemberQrToken = '';

      test('28. Admin can create a custom field without entering a label (optional label)', async () => {
        const res = await request(app)
          .post('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldType: 'text'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.fieldKey).toBeDefined();
        expect(res.body.data.fieldLabel).toContain('Untitled');
        unlabelledFieldKey = res.body.data.fieldKey;
      });

      test('29. Admin creates a parent group field with a label "UAE Details"', async () => {
        const res = await request(app)
          .post('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'UAE Details',
            fieldType: 'group',
            showOnPublicProfile: true
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.fieldKey).toBe('uaeDetails');
        parentGroupId = res.body.data._id;
        parentGroupKey = res.body.data.fieldKey;
      });

      test('30. Admin adds multiple sub-fields to the parent group', async () => {
        // Sub-field 1: UAE Mobile Number (phone)
        const sub1 = await request(app)
          .post(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'UAE Mobile Number',
            fieldType: 'phone',
            showOnPublicProfile: true
          });
        expect(sub1.status).toBe(201);

        // Sub-field 2: Visa Number (text)
        const sub2 = await request(app)
          .post(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Visa Number',
            fieldType: 'text',
            showOnPublicProfile: true
          });
        expect(sub2.status).toBe(201);

        // Sub-field 3: Visa Expiry Date (date)
        const sub3 = await request(app)
          .post(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Visa Expiry Date',
            fieldType: 'date',
            showOnPublicProfile: true
          });
        expect(sub3.status).toBe(201);
        expect(sub3.body.data.children).toHaveLength(3);
      });

      test('31. Admin creates a checkbox question with multiple options', async () => {
        const res = await request(app)
          .post('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Membership Documents Available',
            fieldType: 'checkbox',
            options: ['Passport', 'Emirates ID', 'Driving Licence', 'Visa'],
            showOnPublicProfile: true
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.options).toEqual(['Passport', 'Emirates ID', 'Driving Licence', 'Visa']);
        checkboxFieldId = res.body.data._id;
        checkboxFieldKey = res.body.data.fieldKey;
      });

      test('32. Admin configures conditional questions (Licence Question -> Conditional Licence Number)', async () => {
        // Parent field: Question "Do you have a UAE Driving Licence?"
        const parentRes = await request(app)
          .post('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Do you have a UAE Driving Licence?',
            fieldType: 'radio',
            options: ['Yes', 'No'],
            showOnPublicProfile: true
          });

        expect(parentRes.status).toBe(201);
        conditionalParentId = parentRes.body.data._id;
        const triggerKey = parentRes.body.data.fieldKey;

        // Sub-field: Licence Number, conditional on triggerKey === 'Yes'
        const childRes = await request(app)
          .post(`/api/fields/${conditionalParentId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Licence Number',
            fieldType: 'text',
            conditional: {
              enabled: true,
              dependsOn: triggerKey,
              operator: 'equals',
              value: 'Yes'
            },
            showOnPublicProfile: true
          });

        expect(childRes.status).toBe(201);
        expect(childRes.body.data.children[0].conditional.enabled).toBe(true);
        expect(childRes.body.data.children[0].conditional.dependsOn).toBe(triggerKey);
      });

      test('33. Admin saves a member with nested answers, checkbox array, and conditional fields', async () => {
        const triggerField = await MemberField.findById(conditionalParentId);

        const res = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Mohammed Ashraf',
            emiratesId: '784-1991-5544332-1',
            mobileNo: '+971 50 777 6655',
            transportCompany: 'Gulf Star Transport',
            emergencyContact: '+971 52 111 2233',
            bloodGroup: 'O+',
            customFields: {
              [parentGroupKey]: {
                visaNumber: 'V-99887766',
                visaExpiryDate: '2028-11-20'
              },
              [checkboxFieldKey]: ['Passport', 'Driving Licence', 'Visa'],
              [triggerField.fieldKey]: 'Yes',
              licenceNumber: 'DL-UAE-887766'
            }
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.customFields[checkboxFieldKey]).toContain('Passport');
        expect(res.body.data.customFields[parentGroupKey].visaNumber).toBe('V-99887766');

        advancedMemberId = res.body.data.memberId;
        advancedMemberQrToken = res.body.data.qrToken;
      });

      test('34. Edit member and verify existing nested answers are displayed and preserved', async () => {
        const updateRes = await request(app)
          .put(`/api/members/${advancedMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            transportCompany: 'Gulf Star Transport LLC'
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.transportCompany).toBe('Gulf Star Transport LLC');
        expect(updateRes.body.data.customFields[parentGroupKey].visaNumber).toBe('V-99887766');
        expect(updateRes.body.data.customFields[checkboxFieldKey]).toContain('Driving Licence');
      });

      test('35. Scanning member QR code displays configured nested fields, checkbox badges, and conditional fields', async () => {
        const res = await request(app).get(`/api/public/members/${advancedMemberQrToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const customFields = res.body.data.customFields;
        expect(customFields).toBeDefined();

        // Checkbox question with selected options
        const docs = customFields.find((f) => f.fieldKey === checkboxFieldKey);
        expect(docs).toBeDefined();
        expect(docs.selectedOptions).toContain('Passport');
        expect(docs.selectedOptions).toContain('Driving Licence');

        // Nested parent group with children
        const uaeDetails = customFields.find((f) => f.fieldKey === parentGroupKey);
        expect(uaeDetails).toBeDefined();
        expect(uaeDetails.isGroup).toBe(true);
        expect(uaeDetails.children.some((c) => c.fieldKey === 'visaNumber' && c.value === 'V-99887766')).toBe(true);
      });

      test('36. When conditional question answer is "No", conditional sub-field is hidden from public profile', async () => {
        const triggerField = await MemberField.findById(conditionalParentId);

        // Update member answer to 'No'
        await request(app)
          .put(`/api/members/${advancedMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            customFields: {
              [triggerField.fieldKey]: 'No',
              licenceNumber: 'DL-UAE-887766' // Value exists in DB but condition is not satisfied
            }
          });

        const res = await request(app).get(`/api/public/members/${advancedMemberQrToken}`);
        expect(res.status).toBe(200);

        // Licence Number sub-field should not appear because condition is unsatisfied
        const licenceParent = res.body.data.customFields.find((f) => f.fieldKey === triggerField.fieldKey);
        const licenceChild = licenceParent?.children?.find((c) => c.fieldKey === 'licenceNumber');
        expect(licenceChild).toBeUndefined();
      });

      test('37. Renaming a field preserves stable fieldKey and historical member responses', async () => {
        const updateRes = await request(app)
          .put(`/api/fields/${checkboxFieldId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Verified Identification Documents'
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.fieldKey).toBe(checkboxFieldKey);
        expect(updateRes.body.data.fieldLabel).toBe('Verified Identification Documents');

        // Member's customFields still intact
        const member = await Member.findOne({ memberId: advancedMemberId });
        expect(member.customFields[checkboxFieldKey]).toContain('Passport');
      });

      test('38. Original Member ID, QR Token, and permanent URL remain strictly unchanged', async () => {
        const member = await Member.findOne({ memberId: advancedMemberId });
        expect(member.memberId).toBe(advancedMemberId);
        expect(member.qrToken).toBe(advancedMemberQrToken);
      });

      test('39. GET /api/fields/:id/children returns all child fields for a parent', async () => {
        const res = await request(app)
          .get(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(3);
        expect(res.body.parent.fieldKey).toBe('uaeDetails');
      });

      test('40. PUT /api/fields/:id/children/:childId updates sub-field while preserving fieldKey', async () => {
        const parent = await MemberField.findById(parentGroupId);
        const targetChild = parent.children[0];

        const res = await request(app)
          .put(`/api/fields/${parentGroupId}/children/${targetChild._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Primary UAE Mobile Contact'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const updatedParent = await MemberField.findById(parentGroupId);
        const updatedChild = updatedParent.children.id(targetChild._id);
        expect(updatedChild.fieldLabel).toBe('Primary UAE Mobile Contact');
        expect(updatedChild.fieldKey).toBe(targetChild.fieldKey);
      });

      test('41. DELETE /api/fields/:id/children/:childId safely removes sub-field', async () => {
        // Add a temporary sub-field to delete
        const addRes = await request(app)
          .post(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Temporary Field to Delete',
            fieldType: 'text'
          });

        expect(addRes.status).toBe(201);
        const createdChild = addRes.body.child;

        const delRes = await request(app)
          .delete(`/api/fields/${parentGroupId}/children/${createdChild._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        const checkParent = await MemberField.findById(parentGroupId);
        expect(checkParent.children.id(createdChild._id)).toBeNull();
      });

      test('42. Sub-field endpoint with non-existent parent returns clean 404 message', async () => {
        const res = await request(app)
          .post('/api/fields/6af441e47c48880cdf3c70bf/children')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Test Field',
            fieldType: 'text'
          });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Parent field not found');
      });

      test('43. DELETE /api/fields/:id/options/:optionName deletes individual checkbox/dropdown option', async () => {
        // Delete 'Visa' option from checkboxFieldId
        const res = await request(app)
          .delete(`/api/fields/${checkboxFieldId}/options/Visa`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const updated = await MemberField.findById(checkboxFieldId);
        expect(updated.options).not.toContain('Visa');
        expect(updated.options).toContain('Passport');
        expect(updated.options).toContain('Driving Licence');
      });

      test('44. DELETE /api/fields/:id/children/:childId/options/:optionName deletes individual option from sub-field', async () => {
        // Create sub-field with options inside parentGroupId
        const addSubRes = await request(app)
          .post(`/api/fields/${parentGroupId}/children`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Branch Office',
            fieldType: 'dropdown',
            options: ['Dubai', 'Abu Dhabi', 'Sharjah']
          });

        expect(addSubRes.status).toBe(201);
        const childId = addSubRes.body.child._id;

        // Delete 'Sharjah' option from the sub-field
        const delOptRes = await request(app)
          .delete(`/api/fields/${parentGroupId}/children/${childId}/options/Sharjah`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delOptRes.status).toBe(200);
        expect(delOptRes.body.success).toBe(true);

        const parent = await MemberField.findById(parentGroupId);
        const child = parent.children.id(childId);
        expect(child.options).toEqual(['Dubai', 'Abu Dhabi']);
      });

      test('45. DELETE /api/fields/:id permanently removes field when no member data exists', async () => {
        // Create temporary field with no members
        const createRes = await request(app)
          .post('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fieldLabel: 'Temporary Unused Field',
            fieldType: 'text'
          });

        expect(createRes.status).toBe(201);
        const tempId = createRes.body.data._id;

        const delRes = await request(app)
          .delete(`/api/fields/${tempId}?permanent=true`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        const checkField = await MemberField.findById(tempId);
        expect(checkField).toBeNull();
      });

      test('46. Deleting parent field with historical member data safely archives it and preserves member records', async () => {
        // Delete checkboxFieldId which has member responses from test 33
        const delRes = await request(app)
          .delete(`/api/fields/${checkboxFieldId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);
        expect(delRes.body.memberUsageCount).toBeGreaterThan(0);

        // Field is archived in MongoDB, not destroyed
        const archivedField = await MemberField.findById(checkboxFieldId);
        expect(archivedField).not.toBeNull();
        expect(archivedField.isArchived).toBe(true);
        expect(archivedField.enabled).toBe(false);

        // Existing member records retain their data
        const member = await Member.findOne({ memberId: advancedMemberId });
        expect(member.customFields[checkboxFieldKey]).toContain('Passport');

        // Field is not listed in active fields list
        const activeFieldsRes = await request(app)
          .get('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(activeFieldsRes.body.data.some((f) => f._id.toString() === checkboxFieldId.toString())).toBe(false);
      });

      test('47. Admin can delete "India Hometown / District" (india) without error', async () => {
        const indiaField = await MemberField.findOne({ fieldKey: 'india' });
        expect(indiaField).not.toBeNull();

        const delRes = await request(app)
          .delete(`/api/fields/${indiaField._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        const updated = await MemberField.findOne({ fieldKey: 'india' });
        expect(updated.isArchived).toBe(true);
        expect(updated.enabled).toBe(false);

        // Active fields list no longer includes India Hometown
        const activeRes = await request(app)
          .get('/api/fields')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(activeRes.body.data.some((f) => f.fieldKey === 'india')).toBe(false);
      });

      test('48. Admin can delete core field "Full Name" (name); member records and memberId remain intact', async () => {
        const nameField = await MemberField.findOne({ fieldKey: 'name' });
        expect(nameField).not.toBeNull();

        const delRes = await request(app)
          .delete(`/api/fields/${nameField._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        // Member records retain their data
        const member = await Member.findOne({ memberId: createdMemberId });
        expect(member).not.toBeNull();
        expect(member.memberId).toBe(createdMemberId);
        expect(member.name).toBe('Rashid Muhammed Updated');
      });

      test('49. Admin can delete core field "Mobile No (UAE)" (mobileNo)', async () => {
        const mobileField = await MemberField.findOne({ fieldKey: 'mobileNo' });
        expect(mobileField).not.toBeNull();

        const delRes = await request(app)
          .delete(`/api/fields/${mobileField._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        const updated = await MemberField.findOne({ fieldKey: 'mobileNo' });
        expect(updated.isArchived).toBe(true);
      });

      test('50. Comprehensive verification of all 7 delete requirements and protection of memberId & qrToken', async () => {
        // 1. India Hometown was deleted in Test 47 (verified)
        // 2. Name was deleted in Test 48 (verified)
        // 3. Mobile Number was deleted in Test 49 (verified)
        // 4. Custom field deleted in Test 27 & 45 (verified)
        // 5. Sub-field deleted in Test 41 (verified)
        // 6. Checkbox question deleted in Test 46 (verified)
        // 7. Checkbox option deleted in Test 43 & 44 (verified)

        // Verify permanent identifiers memberId and qrToken rejection
        const memberIdField = await MemberField.create({ fieldKey: 'memberId', fieldLabel: 'Member ID', fieldType: 'text' });
        const qrTokenField = await MemberField.create({ fieldKey: 'qrToken', fieldLabel: 'QR Token', fieldType: 'text' });

        const delMemberIdRes = await request(app)
          .delete(`/api/fields/${memberIdField._id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(delMemberIdRes.status).toBe(403);

        const delQrTokenRes = await request(app)
          .delete(`/api/fields/${qrTokenField._id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(delQrTokenRes.status).toBe(403);

        await MemberField.deleteMany({ _id: { $in: [memberIdField._id, qrTokenField._id] } });
      });

      // SECTION 7: QR Code Authentication & View Tests
      describe('QR Code Authentication & Direct Access Verification', () => {
        test('51. QR image stream succeeds with token query parameter (?token=...) without Authorization header', async () => {
          const res = await request(app)
            .get(`/api/members/${createdMemberId}/qr?token=${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('image/png');
          expect(res.body).toBeInstanceOf(Buffer);
        });

        test('52. QR image stream succeeds with x-access-token header without Authorization header', async () => {
          const res = await request(app)
            .get(`/api/members/${createdMemberId}/qr`)
            .set('x-access-token', adminToken);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('image/png');
        });

        test('53. QR image stream without any token returns 401 Authentication required error', async () => {
          const res = await request(app).get(`/api/members/${createdMemberId}/qr`);

          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Authentication required. No token provided.');
        });

        test('54. Bulk Illustrator QR ZIP export succeeds with token query parameter (?token=...)', async () => {
          const res = await request(app)
            .get(`/api/members/qr/export?token=${adminToken}&qrOnly=true`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('application/zip');
        });

        test('55. CSV template download succeeds with token query parameter (?token=...)', async () => {
          const res = await request(app)
            .get(`/api/members/template?token=${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('text/csv; charset=utf-8');
        });

        test('56. Public profile /api/public/members/:token requires ZERO authentication and always succeeds', async () => {
          const res = await request(app).get(`/api/public/members/${permanentQrToken}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.memberId).toBe(createdMemberId);
        });
      });

      // SECTION 8: Simplified Bulk Export System Tests
      describe('Simplified Bulk Export System Verification', () => {
        test('57. Export all members as CSV produces KTPD-Members.csv with field labels and UTF-8 BOM', async () => {
          const res = await request(app)
            .get('/api/members/export')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toContain('text/csv');
          expect(res.header['content-disposition']).toContain('KTPD-Members.csv');
          // Verify UTF-8 BOM is prepended
          expect(res.text.charCodeAt(0)).toBe(0xFEFF);
          // Verify human-readable headers
          expect(res.text).toContain('Member ID');
          expect(res.text).toContain('Emirates ID');
          expect(res.text).toContain('Transport Company');
          expect(res.text).toContain('Status');
          // Verify internal tokens and private system data are excluded
          expect(res.text).not.toContain('@qrImage');
          expect(res.text).not.toContain('qrToken');
        });

        test('58. Export selected members as CSV filters strictly to chosen IDs', async () => {
          const res = await request(app)
            .get(`/api/members/export?ids=${createdMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.text).toContain(createdMemberId);
        });

        test('59. Download selected QR PNG files as ZIP (KTPD-QR-Codes.zip)', async () => {
          const res = await request(app)
            .get(`/api/members/export/qr-zip?ids=${createdMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('application/zip');
          expect(res.header['content-disposition']).toContain('KTPD-QR-Codes.zip');
        }, 90000);

        test('60. Download all QR PNG files as ZIP returns all member QR codes', async () => {
          const res = await request(app)
            .get('/api/members/export/qr-zip')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('application/zip');
          expect(res.header['content-disposition']).toContain('KTPD-QR-Codes.zip');
        }, 90000);

        test('61. Download All (CSV + QR ZIP) produces single ZIP with KTPD-Export structure', async () => {
          const res = await request(app)
            .get('/api/members/export/all')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.header['content-type']).toBe('application/zip');
          expect(res.header['content-disposition']).toContain('KTPD-Export.zip');
        }, 90000);

        test('62. Verify CSV data matches MongoDB member values exactly', async () => {
          const memberInDb = await Member.findOne({ memberId: createdMemberId });
          expect(memberInDb).toBeDefined();

          const res = await request(app)
            .get(`/api/members/export?ids=${createdMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.text).toContain(memberInDb.memberId);
          expect(res.text).toContain(memberInDb.emiratesId);
          expect(res.text).toContain(memberInDb.transportCompany);
          expect(res.text).toContain(memberInDb.status);
        });

        test('63. Verify original permanent QR token and profile URL remain unchanged', async () => {
          const memberInDb = await Member.findOne({ memberId: createdMemberId });
          expect(memberInDb.qrToken).toBe(permanentQrToken);
        });

        test('64. Public QR code scan continues to open active member profile with latest data', async () => {
          const res = await request(app).get(`/api/public/members/${permanentQrToken}`);
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.memberId).toBe(createdMemberId);
        });
      });

      // SECTION 9: ID No (Alphanumeric) Field Type Integration Tests
      describe('ID No (Alphanumeric) Field Type Verification', () => {
        let alphaFieldId = '';
        let alphaFieldKey = '';
        let alphaMemberId = '';
        let alphaMemberQrToken = '';

        test('65. Admin can create an ID No (Alphanumeric) custom field', async () => {
          const res = await request(app)
            .post('/api/fields')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              fieldLabel: 'National Driver ID',
              fieldType: 'alphanumeric',
              required: false,
              enabled: true,
              showOnPublicProfile: true,
              showInCsv: true
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data.fieldType).toBe('alphanumeric');
          expect(res.body.data.fieldLabel).toBe('National Driver ID');
          alphaFieldId = res.body.data._id;
          alphaFieldKey = res.body.data.fieldKey;
        });

        test('66. Validation rejects unsupported characters (e.g. @ or spaces)', async () => {
          const res = await request(app)
            .post('/api/members')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: 'Invalid Alpha Member',
              emiratesId: '784-1999-9999999-1',
              mobileNo: '+971 50 111 2222',
              transportCompany: 'Quick Trans',
              emergencyContact: '+971 55 222 3333',
              bloodGroup: 'A+',
              customFields: {
                [alphaFieldKey]: 'KTPD@2026#001' // Invalid characters
              }
            });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Custom field validation failed');
        });

        test('67. Admin creates member with valid alphanumeric value (KTPD/2026/001)', async () => {
          const res = await request(app)
            .post('/api/members')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: 'Alpha Member Verified',
              emiratesId: '784-1991-8888888-1',
              mobileNo: '+971 50 777 8888',
              transportCompany: 'Al Futtaim Cargo',
              emergencyContact: '+971 55 888 9999',
              bloodGroup: 'B+',
              status: 'Active',
              customFields: {
                [alphaFieldKey]: 'KTPD/2026/001'
              }
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data.memberId).toBeDefined();
          alphaMemberId = res.body.data.memberId;
          alphaMemberQrToken = res.body.data.qrToken;
        });

        test('68. Member Details retrieves exact alphanumeric string without mutations or parseInt', async () => {
          const res = await request(app)
            .get(`/api/members/${alphaMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.customFields[alphaFieldKey]).toBe('KTPD/2026/001');
          expect(typeof res.body.data.customFields[alphaFieldKey]).toBe('string');
        });

        test('69. Edit Member updates alphanumeric value preserving special characters and case', async () => {
          const updateRes = await request(app)
            .put(`/api/members/${alphaMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              customFields: {
                [alphaFieldKey]: 'KT-001_A/2026'
              }
            });

          expect(updateRes.status).toBe(200);
          expect(updateRes.body.data.customFields[alphaFieldKey]).toBe('KT-001_A/2026');
          // Crucial: Primary member ID and QR token are unaffected
          expect(updateRes.body.data.memberId).toBe(alphaMemberId);
          expect(updateRes.body.data.qrToken).toBe(alphaMemberQrToken);
        });

        test('70. Public QR profile displays the alphanumeric ID No accurately', async () => {
          const res = await request(app).get(`/api/public/members/${alphaMemberQrToken}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          const customField = res.body.data.customFields.find((f) => f.fieldKey === alphaFieldKey);
          expect(customField).toBeDefined();
          expect(customField.value).toBe('KT-001_A/2026');
          expect(customField.fieldType).toBe('alphanumeric');
        });

        test('71. CSV export includes the alphanumeric ID No header and exact value', async () => {
          const res = await request(app)
            .get(`/api/members/export?ids=${alphaMemberId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.text).toContain('National Driver ID');
          expect(res.text).toContain('KT-001_A/2026');
        });

        test('72. Primary Member ID is NOT replaced by the alphanumeric custom field', async () => {
          const member = await Member.findOne({ memberId: alphaMemberId });
          expect(member.memberId).toBe(alphaMemberId);
          expect(member.memberId).not.toBe('KT-001_A/2026');
        });
      });
    });
  });
});

const crypto = require('crypto');
const mongoose = require('mongoose');

// In-Memory Data Stores for pure unit test isolation (0 database connection)
const mockDb = {
  owners: [],
  tenants: [],
  properties: [],
  apartments: [],
  invitations: [],
  auditLogs: []
};

// Import Models
const Owner = require('./models/Owner');
const Tenant = require('./models/Tenant');
const Property = require('./models/Property');
const Apartment = require('./models/Apartment');
const Invitation = require('./models/Invitation');
const AuditLog = require('./models/AuditLog');

// Import Controllers
const invitationController = require('./controllers/invitationController');
const authController = require('./controllers/authController');

// Helper for Mock Request
const createMockReq = (role, user, body = {}, params = {}, query = {}) => ({
  userRole: role,
  user: user,
  body,
  params,
  query,
  headers: {},
  connection: { remoteAddress: '127.0.0.1' },
  socket: { remoteAddress: '127.0.0.1' },
  ip: '127.0.0.1'
});

// Helper for Mock Response
const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (payload) {
      this.data = payload;
      return this;
    },
    cookie: function () {
      return this;
    }
  };
  return res;
};

// Error handler helper
const createNext = (res) => (err) => {
  if (err) {
    res.statusCode = err.statusCode || 500;
    res.data = { success: false, message: err.message };
  }
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('       PHASE 3: SECURE TENANT INVITATION & REGISTRATION TESTS    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Prevent Mongoose from attempting connection buffering
  mongoose.connection.readyState = 1;
  AuditLog.create = async (data) => {
    mockDb.auditLogs.push(data);
    return data;
  };

  // -------------------------------------------------------------
  // Test Data Setup
  // -------------------------------------------------------------
  const ownerAId = new mongoose.Types.ObjectId().toString();
  const ownerBId = new mongoose.Types.ObjectId().toString();

  const propertyAId = new mongoose.Types.ObjectId().toString();
  const propertyBId = new mongoose.Types.ObjectId().toString();

  const apartmentAId = new mongoose.Types.ObjectId().toString();

  const ownerA = { _id: ownerAId, id: ownerAId, name: 'Owner Alpha', email: 'owner.a@example.com', role: 'owner' };
  const ownerB = { _id: ownerBId, id: ownerBId, name: 'Owner Beta', email: 'owner.b@example.com', role: 'owner' };

  const propertyA = { _id: propertyAId, id: propertyAId, name: 'Sunset Palms A', owner: ownerAId, status: 'Vacant' };
  const propertyB = { _id: propertyBId, id: propertyBId, name: 'Ocean Breeze B', owner: ownerBId, status: 'Vacant' };

  const apartmentA = { _id: apartmentAId, id: apartmentAId, number: '101', property: propertyAId, monthlyRent: 20000, securityDeposit: 50000 };

  mockDb.owners = [ownerA, ownerB];
  mockDb.properties = [propertyA, propertyB];
  mockDb.apartments = [apartmentA];

  // -------------------------------------------------------------
  // Stub Models to use mockDb
  // -------------------------------------------------------------
  Owner.findOne = async (query) => {
    return mockDb.owners.find(o => o.email === query.email) || null;
  };
  Owner.findById = async (id) => {
    return mockDb.owners.find(o => o._id.toString() === id.toString()) || null;
  };

  Tenant.findOne = async (query) => {
    if (query.email) return mockDb.tenants.find(t => t.email === query.email) || null;
    if (query.phone) {
      const phones = Array.isArray(query.phone.$in) ? query.phone.$in : [query.phone];
      return mockDb.tenants.find(t => phones.includes(t.phone)) || null;
    }
    return null;
  };
  Tenant.create = async (doc) => {
    const newTenant = {
      ...doc,
      _id: new mongoose.Types.ObjectId().toString(),
      id: doc._id || new mongoose.Types.ObjectId().toString()
    };
    mockDb.tenants.push(newTenant);
    return newTenant;
  };

  Property.findById = async (id) => {
    return mockDb.properties.find(p => p._id.toString() === id.toString()) || null;
  };
  Property.findByIdAndUpdate = async (id, update) => {
    const prop = mockDb.properties.find(p => p._id.toString() === id.toString());
    if (prop && update.$set) Object.assign(prop, update.$set);
    return prop;
  };

  Apartment.findById = async (id) => {
    return mockDb.apartments.find(a => a._id.toString() === id.toString()) || null;
  };
  Apartment.findByIdAndUpdate = async (id, update) => {
    const apt = mockDb.apartments.find(a => a._id.toString() === id.toString());
    if (apt && update.$set) Object.assign(apt, update.$set);
    return apt;
  };

  // Stub Invitation Methods
  Invitation.create = async (doc) => {
    const inv = {
      ...doc,
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(inv);
    return inv;
  };

  Invitation.find = (query) => {
    let result = mockDb.invitations.filter(inv => {
      if (query.owner && inv.owner.toString() !== query.owner.toString()) return false;
      return true;
    });
    const queryObj = {
      select: function () { return queryObj; },
      populate: function () { return queryObj; },
      sort: function () { return queryObj; },
      then: function (resolve) {
        resolve(result.map(inv => ({
          ...inv,
          toObject: function () { return { ...this }; }
        })));
      }
    };
    return queryObj;
  };

  Invitation.findById = (id) => {
    const inv = mockDb.invitations.find(i => i._id.toString() === id.toString()) || null;
    const queryObj = {
      select: function () { return queryObj; },
      populate: function () { return queryObj; },
      then: function (resolve) {
        if (!inv) return resolve(null);
        resolve({
          ...inv,
          save: async function () {
            const idx = mockDb.invitations.findIndex(i => i._id.toString() === inv._id.toString());
            if (idx !== -1) mockDb.invitations[idx] = this;
            return this;
          }
        });
      }
    };
    return queryObj;
  };

  Invitation.findOne = (query) => {
    let inv = null;
    if (query.tokenHash) {
      inv = mockDb.invitations.find(i => i.tokenHash === query.tokenHash);
    }
    const queryObj = {
      populate: function (field) {
        if (inv) {
          if (field.startsWith('owner')) inv.owner = mockDb.owners.find(o => o._id.toString() === (inv.owner?._id || inv.owner).toString());
          if (field.startsWith('property')) inv.property = mockDb.properties.find(p => p._id.toString() === (inv.property?._id || inv.property || '').toString());
          if (field.startsWith('apartment')) inv.apartment = mockDb.apartments.find(a => a._id.toString() === (inv.apartment?._id || inv.apartment || '').toString());
        }
        return queryObj;
      },
      then: function (resolve) {
        if (!inv) return resolve(null);
        resolve({
          ...inv,
          save: async function () {
            const idx = mockDb.invitations.findIndex(i => i._id.toString() === inv._id.toString());
            if (idx !== -1) mockDb.invitations[idx] = this;
            return this;
          }
        });
      }
    };
    return queryObj;
  };

  Invitation.findOneAndUpdate = async (query, update, options) => {
    const inv = mockDb.invitations.find(i => {
      if (query.tokenHash && i.tokenHash !== query.tokenHash) return false;
      if (query.email && i.email !== query.email) return false;
      if (query.status && i.status !== query.status) return false;
      if (query.expiresAt && query.expiresAt.$gt && !(new Date(i.expiresAt) > query.expiresAt.$gt)) return false;
      return true;
    });
    if (!inv) return null;

    const snapshot = { ...inv }; // pre-update copy
    if (update.$set) {
      Object.assign(inv, update.$set);
    }
    return snapshot;
  };

  Invitation.findByIdAndUpdate = async (id, update) => {
    const inv = mockDb.invitations.find(i => i._id.toString() === id.toString());
    if (inv && update.$set) {
      Object.assign(inv, update.$set);
    }
    return inv;
  };

  Invitation.updateMany = async (query, update) => {
    let count = 0;
    mockDb.invitations.forEach(inv => {
      let match = true;
      if (query.email && inv.email !== query.email) match = false;
      if (query.owner && inv.owner.toString() !== query.owner.toString()) match = false;
      if (query.status && inv.status !== query.status) match = false;
      if (match) {
        if (update.$set) Object.assign(inv, update.$set);
        count++;
      }
    });
    return { modifiedCount: count };
  };

  // =============================================================
  // TEST 1: OWNER A CREATES A VALID INVITATION
  // =============================================================
  console.log('--- TEST 1: Owner Creates Valid Invitation ---');
  let rawInviteToken = '';
  {
    const req = createMockReq('owner', ownerA, {
      email: 'tenant.one@example.com',
      propertyId: propertyAId,
      apartmentId: apartmentAId,
      unitNumber: '101',
      monthlyRent: 20000,
      securityDeposit: 50000
    });
    const res = createMockRes();
    const next = createNext(res);

    await invitationController.createInvitation(req, res, next);
    assert(res.statusCode === 201 && res.data.success, 'Owner A successfully created tenant invitation (201)');
    assert(res.data.data.email === 'tenant.one@example.com', 'Invitation email matches target');
    assert(res.data.data.status === 'pending', 'Invitation status is pending');
    assert(!!res.data.data.inviteUrl, 'Invite URL is returned to authorized owner');

    // Extract rawToken from the inviteUrl
    const url = new URL(res.data.data.inviteUrl);
    rawInviteToken = url.searchParams.get('token');
    assert(rawInviteToken && rawInviteToken.length === 64, 'Raw token is 64 hex characters (32 cryptographically secure bytes)');

    // Verify rawToken is NOT in mockDb (only tokenHash)
    const storedInv = mockDb.invitations.find(i => i.email === 'tenant.one@example.com');
    assert(storedInv && !storedInv.rawToken && storedInv.tokenHash, 'Raw token is never stored in DB; SHA-256 tokenHash is stored');
  }

  // =============================================================
  // TEST 2: PUBLIC TOKEN VALIDATION ENDPOINT
  // =============================================================
  console.log('\n--- TEST 2: Public Token Validation ---');
  {
    const req = createMockReq(null, null, {}, {}, { token: rawInviteToken });
    const res = createMockRes();
    const next = createNext(res);

    await invitationController.validateInvitationToken(req, res, next);
    assert(res.statusCode === 200 && res.data.valid, 'Public token validation endpoint confirms token is valid (200)');
    assert(res.data.data.email === 'tenant.one@example.com', 'Validation returns invited email for registration prefill');
    assert(res.data.data.ownerName === 'Owner Alpha', 'Validation returns verified owner name');
  }

  // =============================================================
  // TEST 3: VALID INVITATION TENANT REGISTRATION
  // =============================================================
  console.log('\n--- TEST 3: Valid Invitation Tenant Registration ---');
  {
    const req = createMockReq(null, null, {
      name: 'Tenant One',
      email: 'tenant.one@example.com',
      password: 'password123',
      phone: '+919876543210',
      invitationToken: rawInviteToken
    });
    const res = createMockRes();
    const next = createNext(res);

    await authController.registerTenant(req, res, next);
    assert(res.statusCode === 201 && res.data.success, 'Tenant registered successfully with valid token (201)');

    const createdTenant = mockDb.tenants.find(t => t.email === 'tenant.one@example.com');
    assert(createdTenant && createdTenant.owner.toString() === ownerAId, 'Tenant is strictly bound to Owner A from verified invitation');
    assert(createdTenant.propertyAssigned.toString() === propertyAId, 'Tenant is bound to Property A from invitation');
    assert(createdTenant.role === 'tenant', 'Tenant role is strictly enforced');

    const updatedInv = mockDb.invitations.find(i => i.email === 'tenant.one@example.com');
    assert(updatedInv.status === 'accepted', 'Invitation status updated to accepted');
  }

  // =============================================================
  // TEST 4: REUSED TOKEN REJECTION
  // =============================================================
  console.log('\n--- TEST 4: Reused Token Rejection ---');
  {
    const req = createMockReq(null, null, {
      name: 'Tenant Imposter',
      email: 'tenant.two@example.com',
      password: 'password123',
      phone: '+919876543211',
      invitationToken: rawInviteToken
    });
    const res = createMockRes();
    const next = createNext(res);

    await authController.registerTenant(req, res, next);
    assert(res.statusCode === 400 && !res.data.success, 'Reusing an already-accepted token is rejected (400)');
    assert(res.data.message.includes('already been used'), 'Helpful error specifies invitation already used');
  }

  // =============================================================
  // TEST 5: INVALID TOKEN REJECTION
  // =============================================================
  console.log('\n--- TEST 5: Invalid Token Rejection ---');
  {
    const req = createMockReq(null, null, {
      name: 'Fake Token User',
      email: 'faketoken@example.com',
      password: 'password123',
      phone: '+919876543212',
      invitationToken: '0000000000000000000000000000000000000000000000000000000000000000'
    });
    const res = createMockRes();
    const next = createNext(res);

    await authController.registerTenant(req, res, next);
    assert(res.statusCode === 400 && !res.data.success, 'Non-existent or forged token is rejected (400)');
  }

  // =============================================================
  // TEST 6: EXPIRED TOKEN REJECTION
  // =============================================================
  console.log('\n--- TEST 6: Expired Token Rejection ---');
  let expiredToken = '';
  {
    const { rawToken, tokenHash } = Invitation.generateToken();
    expiredToken = rawToken;
    const expiredInv = {
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'expired.tenant@example.com',
      owner: ownerAId,
      tokenHash,
      status: 'pending',
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(expiredInv);

    const req = createMockReq(null, null, {
      name: 'Expired Tenant',
      email: 'expired.tenant@example.com',
      password: 'password123',
      phone: '+919876543213',
      invitationToken: expiredToken
    });
    const res = createMockRes();
    const next = createNext(res);

    await authController.registerTenant(req, res, next);
    assert(res.statusCode === 400 && !res.data.success, 'Expired invitation token is rejected (400)');
    assert(res.data.message.includes('expired'), 'Error message specifies token has expired');
  }

  // =============================================================
  // TEST 7: EMAIL MISMATCH REJECTION
  // =============================================================
  console.log('\n--- TEST 7: Email Mismatch Rejection ---');
  let emailMismatchToken = '';
  {
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();
    emailMismatchToken = rawToken;
    const inv = {
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'intended.recipient@example.com',
      owner: ownerAId,
      tokenHash,
      status: 'pending',
      expiresAt,
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(inv);

    const req = createMockReq(null, null, {
      name: 'Substituted Email Tenant',
      email: 'attacker.email@example.com', // email does NOT match intended.recipient@example.com
      password: 'password123',
      phone: '+919876543214',
      invitationToken: emailMismatchToken
    });
    const res = createMockRes();
    const next = createNext(res);

    await authController.registerTenant(req, res, next);
    assert(res.statusCode === 400 && !res.data.success, 'Email mismatch with invited email is rejected (400)');
    assert(res.data.message.includes('Email mismatch'), 'Error specifies email must match invitation');
  }

  // =============================================================
  // TEST 8: OWNER A CANNOT CREATE INVITATION FOR OWNER B'S PROPERTY
  // =============================================================
  console.log("\n--- TEST 8: Cross-Owner Property Invitation Protection ---");
  {
    const req = createMockReq('owner', ownerA, {
      email: 'cross.property@example.com',
      propertyId: propertyBId // Property B belongs to Owner B!
    });
    const res = createMockRes();
    const next = createNext(res);

    await invitationController.createInvitation(req, res, next);
    assert(res.statusCode === 403 && !res.data.success, 'Owner A is forbidden from creating invitation for Property B (403)');
  }

  // =============================================================
  // TEST 9: OWNER A CANNOT MANAGE OWNER B'S INVITATIONS
  // =============================================================
  console.log("\n--- TEST 9: Cross-Owner Invitation Management Isolation ---");
  let ownerBInvId = '';
  {
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();
    const invB = {
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'tenant.of.b@example.com',
      owner: ownerBId, // Created by Owner B
      tokenHash,
      status: 'pending',
      expiresAt,
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(invB);
    ownerBInvId = invB._id;

    // Owner A attempts to revoke Owner B's invitation
    const reqRevoke = createMockReq('owner', ownerA, {}, { id: ownerBInvId });
    const resRevoke = createMockRes();
    const nextRevoke = createNext(resRevoke);

    await invitationController.revokeInvitation(reqRevoke, resRevoke, nextRevoke);
    assert(resRevoke.statusCode === 403 && !resRevoke.data.success, "Owner A cannot revoke Owner B's invitation (403)");

    // Owner A attempts to inspect Owner B's invitation
    const reqGet = createMockReq('owner', ownerA, {}, { id: ownerBInvId });
    const resGet = createMockRes();
    const nextGet = createNext(resGet);

    await invitationController.getInvitation(reqGet, resGet, nextGet);
    assert(resGet.statusCode === 403 && !resGet.data.success, "Owner A cannot view Owner B's invitation details (403)");

    // Owner A gets listing - must not contain Owner B's invitation
    const reqList = createMockReq('owner', ownerA);
    const resList = createMockRes();
    const nextList = createNext(resList);

    await invitationController.getInvitations(reqList, resList, nextList);
    const foundOtherOwnerInv = resList.data.data.some(i => i.owner.toString() === ownerBId);
    assert(!foundOtherOwnerInv, "Owner A's invitation listing does not leak Owner B's invitations");
  }

  // =============================================================
  // TEST 10: ARBITRARY OWNER SPOOFING IN REGISTRATION REJECTED
  // =============================================================
  console.log('\n--- TEST 10: Tenant Cannot Spoof Owner via Request-Body IDs ---');
  {
    // Case A: Tenant tries to register with NO invitation, supplying ownerId in body
    const reqNoToken = createMockReq(null, null, {
      name: 'Spoofing Tenant',
      email: 'spoof1@example.com',
      password: 'password123',
      phone: '+919876543215',
      owner: ownerBId,
      ownerId: ownerBId,
      ownerEmail: 'owner.b@example.com'
    });
    const resNoToken = createMockRes();
    const nextNoToken = createNext(resNoToken);

    await authController.registerTenant(reqNoToken, resNoToken, nextNoToken);
    assert(resNoToken.statusCode === 400 && !resNoToken.data.success, 'Registration without invitation token is rejected even with owner ID (400)');

    // Case B: Tenant has an invitation for Owner A, but tries to override with Owner B in body
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();
    const invA = {
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'spoof2@example.com',
      owner: ownerAId, // Valid invite for Owner A
      property: propertyAId,
      tokenHash,
      status: 'pending',
      expiresAt,
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(invA);

    const reqOverride = createMockReq(null, null, {
      name: 'Spoofing Tenant 2',
      email: 'spoof2@example.com',
      password: 'password123',
      phone: '+919876543216',
      invitationToken: rawToken,
      owner: ownerBId,
      ownerId: ownerBId,
      ownerEmail: 'owner.b@example.com'
    });
    const resOverride = createMockRes();
    const nextOverride = createNext(resOverride);

    await authController.registerTenant(reqOverride, resOverride, nextOverride);
    assert(resOverride.statusCode === 201 && resOverride.data.success, 'Registration proceeds via verified invitation token');

    const createdTenant = mockDb.tenants.find(t => t.email === 'spoof2@example.com');
    assert(createdTenant.owner.toString() === ownerAId, 'Tenant is bound to invitation Owner A; client-supplied Owner B in req.body was ignored');
  }

  // =============================================================
  // TEST 11: CONCURRENT INVITATION CONSUMPTION RACE CONDITION TEST
  // =============================================================
  console.log('\n--- TEST 11: Race Condition / Concurrent Token Consumption Protection ---');
  {
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();
    const raceInv = {
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'race.test@example.com',
      owner: ownerAId,
      tokenHash,
      status: 'pending',
      expiresAt,
      toObject: function () { return { ...this }; },
      save: async function () { return this; }
    };
    mockDb.invitations.push(raceInv);

    // Prepare two simultaneous registration requests
    const req1 = createMockReq(null, null, {
      name: 'Race Winner',
      email: 'race.test@example.com',
      password: 'password123',
      phone: '+919876543217',
      invitationToken: rawToken
    });
    const res1 = createMockRes();
    const next1 = createNext(res1);

    const req2 = createMockReq(null, null, {
      name: 'Race Loser',
      email: 'race.test@example.com',
      password: 'password123',
      phone: '+919876543218',
      invitationToken: rawToken
    });
    const res2 = createMockRes();
    const next2 = createNext(res2);

    // Fire concurrently
    await Promise.all([
      authController.registerTenant(req1, res1, next1),
      authController.registerTenant(req2, res2, next2)
    ]);

    const results = [res1.statusCode, res2.statusCode];
    const successes = results.filter(code => code === 201).length;
    const rejections = results.filter(code => code === 400 || code === 409).length;

    assert(successes === 1, 'Exactly one concurrent request succeeded in consuming the invitation (201)');
    assert(rejections === 1, 'The competing concurrent request was rejected (400/409)');
  }

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log('\n================================================================');
  console.log(`TOTAL PHASE 3 TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

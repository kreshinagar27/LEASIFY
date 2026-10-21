const express = require('express');
const mongoose = require('mongoose');

// Mock in-memory data store to completely isolate from MongoDB Atlas
const mockDb = {
  owners: [],
  tenants: [],
  properties: [],
  apartments: [],
  bills: [],
  payments: [],
  maintenance: [],
  auditLogs: []
};

// Replace Mongoose models with in-memory stores for isolated unit testing
const Owner = require('./models/Owner');
const Tenant = require('./models/Tenant');
const Property = require('./models/Property');
const Apartment = require('./models/Apartment');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Maintenance = require('./models/Maintenance');
const AuditLog = require('./models/AuditLog');
AuditLog.create = async (d) => d;

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const tenantController = require('./controllers/tenantController');
const billController = require('./controllers/billController');
const paymentController = require('./controllers/paymentController');
const maintenanceController = require('./controllers/maintenanceController');

// Test helper: mock request and response
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

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(payload) {
      this.data = payload;
      return this;
    },
    cookie: function() {
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
  console.log('   PHASE 2: MULTI-OWNER AUTHORIZATION & DATA ISOLATION TESTS    ');
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

  // -------------------------------------------------------------
  // Test Data Setup (In-Memory IDs)
  // -------------------------------------------------------------
  const ownerAId = new mongoose.Types.ObjectId().toString();
  const ownerBId = new mongoose.Types.ObjectId().toString();

  const tenantAId = new mongoose.Types.ObjectId().toString();
  const tenantBId = new mongoose.Types.ObjectId().toString();

  const propertyAId = new mongoose.Types.ObjectId().toString();
  const propertyBId = new mongoose.Types.ObjectId().toString();

  const billAId = new mongoose.Types.ObjectId().toString();
  const billBId = new mongoose.Types.ObjectId().toString();

  const maintenanceAId = new mongoose.Types.ObjectId().toString();
  const maintenanceBId = new mongoose.Types.ObjectId().toString();

  const ownerA = { _id: ownerAId, id: ownerAId, name: 'Owner Alpha', email: 'owner.a@example.com', role: 'owner' };
  const ownerB = { _id: ownerBId, id: ownerBId, name: 'Owner Beta', email: 'owner.b@example.com', role: 'owner' };

  const tenantA = { _id: tenantAId, id: tenantAId, name: 'Tenant Alpha', email: 'tenant.a@example.com', role: 'tenant', owner: ownerAId, propertyAssigned: propertyAId };
  const tenantB = { _id: tenantBId, id: tenantBId, name: 'Tenant Beta', email: 'tenant.b@example.com', role: 'tenant', owner: ownerBId, propertyAssigned: propertyBId };

  // =============================================================
  // PART 1: MULTIPLE OWNERS REGISTRATION & DUPLICATE CHECKS
  // =============================================================
  console.log('--- PART 1: Multi-Owner Registration & Duplicate Checks ---');

  // Stub Owner.findOne, Tenant.findOne, Owner.create
  Owner.findOne = (query) => {
    let result = null;
    if (query?.email) result = mockDb.owners.find(o => o.email === query.email) || null;
    if (query?.contactNumber) result = mockDb.owners.find(o => o.contactNumber === query.contactNumber) || null;
    const p = Promise.resolve(result);
    p.select = () => Promise.resolve(result);
    return p;
  };
  Tenant.findOne = (query) => {
    let result = null;
    if (query?.email) result = mockDb.tenants.find(t => t.email === query.email) || null;
    const p = Promise.resolve(result);
    p.select = () => Promise.resolve(result);
    return p;
  };
  Owner.create = async (doc) => {
    const created = { ...doc, _id: new mongoose.Types.ObjectId().toString() };
    mockDb.owners.push(created);
    return created;
  };

  // Register Owner 1
  const reqRegOwner1 = createMockReq(null, null, {
    name: 'Owner One',
    email: 'first.owner@leasify.com',
    password: 'Password123',
    contactNumber: '+91 9876543211',
    address: 'Bangalore'
  });
  const resRegOwner1 = createMockRes();
  await authController.registerOwner(reqRegOwner1, resRegOwner1, createNext(resRegOwner1));
  assert(resRegOwner1.statusCode === 201 && resRegOwner1.data?.success, 'Owner 1 registers successfully');

  // Register Owner 2 (MUST NOT be rejected by single-owner restriction)
  const reqRegOwner2 = createMockReq(null, null, {
    name: 'Owner Two',
    email: 'second.owner@leasify.com',
    password: 'Password123',
    contactNumber: '+91 9876543212',
    address: 'Mumbai'
  });
  const resRegOwner2 = createMockRes();
  await authController.registerOwner(reqRegOwner2, resRegOwner2, createNext(resRegOwner2));
  assert(resRegOwner2.statusCode === 201 && resRegOwner2.data?.success, 'Owner 2 registers independently without single-owner blockage');

  // Register Duplicate Owner Email (MUST return 409 Conflict)
  const reqRegDuplicate = createMockReq(null, null, {
    name: 'Owner Duplicate',
    email: 'first.owner@leasify.com',
    password: 'Password123',
    contactNumber: '+91 9876543213',
    address: 'Delhi'
  });
  const resRegDuplicate = createMockRes();
  await authController.registerOwner(reqRegDuplicate, resRegDuplicate, createNext(resRegDuplicate));
  assert(resRegDuplicate.statusCode === 409, 'Duplicate owner email is safely rejected with 409 Conflict');

  // =============================================================
  // PART 2: PROPERTY AUTHORIZATION & DATA ISOLATION
  // =============================================================
  console.log('\n--- PART 2: Property Authorization & Data Isolation ---');

  Property.find = (query) => {
    return {
      populate: () => {
        let results = [];
        if (query.owner) {
          results = (query.owner === ownerAId) ? [{ _id: propertyAId, name: 'Villa A', owner: ownerAId, tenant: tenantA }] : [];
        } else if (query._id) {
          results = (query._id === propertyAId) ? [{ _id: propertyAId, name: 'Villa A', owner: ownerAId, tenant: tenantA }] : [];
        }
        return Promise.resolve(results);
      }
    };
  };

  Property.findByIdAndUpdate = async () => ({});

  Tenant.findById = (id) => {
    let result = null;
    if (id === tenantAId) result = tenantA;
    if (id === tenantBId) result = tenantB;
    const p = Promise.resolve(result);
    p.populate = () => ({ populate: () => Promise.resolve(result) });
    return p;
  };

  // Owner A queries properties
  const reqOwnerAProps = createMockReq('owner', ownerA);
  const resOwnerAProps = createMockRes();
  await propertyController.getProperties(reqOwnerAProps, resOwnerAProps, createNext(resOwnerAProps));
  assert(resOwnerAProps.statusCode === 200 && resOwnerAProps.data?.count === 1, "Owner A gets only Owner A's properties");

  // Tenant A queries properties -> gets only their assigned property, not all system properties
  const reqTenantAProps = createMockReq('tenant', tenantA);
  const resTenantAProps = createMockRes();
  await propertyController.getProperties(reqTenantAProps, resTenantAProps, createNext(resTenantAProps));
  assert(resTenantAProps.statusCode === 200 && resTenantAProps.data?.count === 1, "Tenant A gets only their assigned property (no unrestricted fallback)");

  // Owner A tries to view Property B
  Property.findById = (id) => {
    let result = null;
    if (id === propertyAId) result = { _id: propertyAId, name: 'Villa A', owner: ownerAId };
    if (id === propertyBId) result = { _id: propertyBId, name: 'Villa B', owner: ownerBId };
    const p = Promise.resolve(result);
    p.populate = () => ({ populate: () => Promise.resolve(result) });
    return p;
  };
  const reqOwnerAViewPropB = createMockReq('owner', ownerA, {}, { id: propertyBId });
  const resOwnerAViewPropB = createMockRes();
  await propertyController.getProperty(reqOwnerAViewPropB, resOwnerAViewPropB, createNext(resOwnerAViewPropB));
  assert(resOwnerAViewPropB.statusCode === 403, "Owner A cannot view Owner B's property (403 Forbidden)");

  // Owner A tries to update Property B
  const reqOwnerAUpdatePropB = createMockReq('owner', ownerA, { name: 'Hacked Villa' }, { id: propertyBId });
  const resOwnerAUpdatePropB = createMockRes();
  await propertyController.updateProperty(reqOwnerAUpdatePropB, resOwnerAUpdatePropB, createNext(resOwnerAUpdatePropB));
  assert(resOwnerAUpdatePropB.statusCode === 403, "Owner A cannot update Owner B's property (403 Forbidden)");

  // Tenant A tries to view unassigned Property B
  const reqTenantAViewPropB = createMockReq('tenant', tenantA, {}, { id: propertyBId });
  const resTenantAViewPropB = createMockRes();
  await propertyController.getProperty(reqTenantAViewPropB, resTenantAViewPropB, createNext(resTenantAViewPropB));
  assert(resTenantAViewPropB.statusCode === 403, "Tenant A cannot view Property B (403 Forbidden)");

  // =============================================================
  // PART 3: TENANT AUTHORIZATION & APARTMENT ASSIGNMENT
  // =============================================================
  console.log('\n--- PART 3: Tenant Authorization & Apartment Assignment ---');

  // Owner A viewing Tenant B
  const reqOwnerAViewTenantB = createMockReq('owner', ownerA, {}, { id: tenantBId });
  const resOwnerAViewTenantB = createMockRes();
  await tenantController.getTenant(reqOwnerAViewTenantB, resOwnerAViewTenantB, createNext(resOwnerAViewTenantB));
  assert(resOwnerAViewTenantB.statusCode === 403, "Owner A cannot view Owner B's tenant (403 Forbidden)");

  // Tenant A viewing Tenant B
  const reqTenantAViewTenantB = createMockReq('tenant', tenantA, {}, { id: tenantBId });
  const resTenantAViewTenantB = createMockRes();
  await tenantController.getTenant(reqTenantAViewTenantB, resTenantAViewTenantB, createNext(resTenantAViewTenantB));
  assert(resTenantAViewTenantB.statusCode === 403, "Tenant A cannot view Tenant B's details (403 Forbidden)");

  // Owner A assigning Tenant A to Owner B's property (Cross-owner assignment forgery)
  Tenant.findById = (id) => Promise.resolve(id === tenantAId ? { ...tenantA, save: async () => {} } : null);
  Property.findById = (id) => Promise.resolve(id === propertyBId ? { _id: propertyBId, name: 'Villa B', owner: ownerBId } : null);

  const reqAssignCrossProp = createMockReq('owner', ownerA, { propertyId: propertyBId }, { id: tenantAId });
  const resAssignCrossProp = createMockRes();
  await tenantController.assignProperty(reqAssignCrossProp, resAssignCrossProp, createNext(resAssignCrossProp));
  assert(resAssignCrossProp.statusCode === 403, "Owner A cannot assign tenant to Owner B's property (403 Forbidden)");

  // =============================================================
  // PART 4: BILL AUTHORIZATION & PDF DOWNLOADS
  // =============================================================
  console.log('\n--- PART 4: Bill Authorization & PDF Isolation ---');

  // Owner A attempting to generate a bill for Property B
  Property.findById = (id) => Promise.resolve(id === propertyBId ? { _id: propertyBId, owner: ownerBId } : null);
  Tenant.findById = (id) => Promise.resolve(id === tenantBId ? tenantB : null);
  Bill.findOne = () => Promise.resolve(null);

  const reqGenBillCross = createMockReq('owner', ownerA, {
    propertyId: propertyBId,
    tenantId: tenantBId,
    month: 10,
    year: 2026,
    dueDate: '2026-11-01'
  });
  const resGenBillCross = createMockRes();
  await billController.generateBill(reqGenBillCross, resGenBillCross, createNext(resGenBillCross));
  assert(resGenBillCross.statusCode === 403, "Owner A cannot generate bill for Owner B's property/tenant (403 Forbidden)");

  // Query parameter spoofing: Owner A querying bills with ?property=PROPERTY_B_ID
  Property.find = async (query) => (query.owner === ownerAId ? [{ _id: propertyAId }] : []);
  const reqGetBillsSpoof = createMockReq('owner', ownerA, {}, {}, { property: propertyBId });
  const resGetBillsSpoof = createMockRes();
  await billController.getBills(reqGetBillsSpoof, resGetBillsSpoof, createNext(resGetBillsSpoof));
  assert(resGetBillsSpoof.statusCode === 200 && resGetBillsSpoof.data?.count === 0, "Query parameter spoofing (?property=B) blocked; returns empty list");

  // PDF Download IDOR check: Tenant A requesting Bill B's PDF
  Bill.findById = (id) => ({
    populate: () => ({
      populate: () => Promise.resolve(id === billBId ? {
        _id: billBId,
        property: { _id: propertyBId, owner: ownerBId },
        tenant: { _id: tenantBId }
      } : null)
    })
  });
  const reqDownloadPdfCross = createMockReq('tenant', tenantA, {}, { id: billBId });
  const resDownloadPdfCross = createMockRes();
  await billController.downloadBillPDF(reqDownloadPdfCross, resDownloadPdfCross, createNext(resDownloadPdfCross));
  assert(resDownloadPdfCross.statusCode === 403, "Tenant A cannot download Bill B's PDF invoice (IDOR prevented - 403 Forbidden)");

  // Owner A requesting Bill B's PDF
  const reqOwnerADownloadPdfB = createMockReq('owner', ownerA, {}, { id: billBId });
  const resOwnerADownloadPdfB = createMockRes();
  await billController.downloadBillPDF(reqOwnerADownloadPdfB, resOwnerADownloadPdfB, createNext(resOwnerADownloadPdfB));
  assert(resOwnerADownloadPdfB.statusCode === 403, "Owner A cannot download Bill B's PDF invoice (403 Forbidden)");

  // =============================================================
  // PART 5: PAYMENT AUTHORIZATION & QUERY OVERRIDE CHECKS
  // =============================================================
  console.log('\n--- PART 5: Payment Authorization & Settlement Checks ---');

  // Tenant A trying to pay/verify Tenant B's bill
  Bill.findById = () => ({
    populate: () => ({
      populate: () => Promise.resolve({
        _id: billBId,
        status: 'unpaid',
        totalAmount: 15000,
        property: { _id: propertyBId },
        tenant: { _id: tenantBId }
      })
    })
  });
  const reqVerifyCrossBill = createMockReq('tenant', tenantA, { billId: billBId });
  const resVerifyCrossBill = createMockRes();
  await paymentController.verifyPayment(reqVerifyCrossBill, resVerifyCrossBill, createNext(resVerifyCrossBill));
  assert(resVerifyCrossBill.statusCode === 403, "Tenant A cannot verify/pay Tenant B's bill (403 Forbidden)");

  // Tenant A submitting manual payment for Tenant B's bill
  const reqManualCrossBill = createMockReq('tenant', tenantA, { billId: billBId, upiReferenceNumber: 'UPI123' });
  const resManualCrossBill = createMockRes();
  await paymentController.submitManualPayment(reqManualCrossBill, resManualCrossBill, createNext(resManualCrossBill));
  assert(resManualCrossBill.statusCode === 403, "Tenant A cannot submit manual payment for Tenant B's bill (403 Forbidden)");

  // Owner A querying payments with ?property=PROPERTY_B_ID
  Property.find = async (query) => (query.owner === ownerAId ? [{ _id: propertyAId }] : []);
  const reqGetPaymentsSpoof = createMockReq('owner', ownerA, {}, {}, { property: propertyBId });
  const resGetPaymentsSpoof = createMockRes();
  await paymentController.getPayments(reqGetPaymentsSpoof, resGetPaymentsSpoof, createNext(resGetPaymentsSpoof));
  assert(resGetPaymentsSpoof.statusCode === 200 && resGetPaymentsSpoof.data?.count === 0, "Payment query spoofing (?property=B) blocked; returns empty list");

  // =============================================================
  // PART 6: MAINTENANCE AUTHORIZATION
  // =============================================================
  console.log('\n--- PART 6: Maintenance Authorization & Ticket Protection ---');

  // Owner A trying to update/resolve Maintenance Ticket for Property B
  Maintenance.findById = (id) => Promise.resolve(id === maintenanceBId ? { _id: maintenanceBId, property: propertyBId } : null);
  Property.findById = (id) => Promise.resolve(id === propertyBId ? { _id: propertyBId, owner: ownerBId } : null);

  const reqUpdateMaintCross = createMockReq('owner', ownerA, { status: 'resolved' }, { id: maintenanceBId });
  const resUpdateMaintCross = createMockRes();
  await maintenanceController.updateRequest(reqUpdateMaintCross, resUpdateMaintCross, createNext(resUpdateMaintCross));
  assert(resUpdateMaintCross.statusCode === 403, "Owner A cannot update maintenance request for Property B (403 Forbidden)");

  // Owner A querying maintenance tickets with ?property=PROPERTY_B_ID
  Property.find = async (query) => (query.owner === ownerAId ? [{ _id: propertyAId }] : []);
  const reqGetMaintSpoof = createMockReq('owner', ownerA, {}, {}, { property: propertyBId });
  const resGetMaintSpoof = createMockRes();
  await maintenanceController.getRequests(reqGetMaintSpoof, resGetMaintSpoof, createNext(resGetMaintSpoof));
  assert(resGetMaintSpoof.statusCode === 200 && resGetMaintSpoof.data?.count === 0, "Maintenance query spoofing (?property=B) blocked; returns empty list");

  console.log('\n================================================================');
  console.log(`TOTAL PHASE 2 TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

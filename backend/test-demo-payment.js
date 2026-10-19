const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Tenant = require('./models/Tenant');
const Owner = require('./models/Owner');
const Property = require('./models/Property');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');

const API_BASE = 'http://localhost:5001/api/v1';

async function runTests() {
  console.log('--- STARTING DEMO PAYMENT SYSTEM TESTS ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Find a tenant with an assigned property
  const tenantRecord = await Tenant.findOne({ isActive: true, propertyAssigned: { $ne: null } });
  if (!tenantRecord) throw new Error('Active tenant with assigned property not found');

  const property = await Property.findById(tenantRecord.propertyAssigned);
  if (!property) throw new Error('Property assigned to tenant not found');

  console.log(`✓ Located Tenant: ${tenantRecord.name} (${tenantRecord.email}), Property: ${property.name}`);

  const jwt = require('jsonwebtoken');
  const tenantToken = jwt.sign(
    { id: tenantRecord._id, email: tenantRecord.email, role: 'tenant' },
    process.env.JWT_SECRET || 'your_super_secret_jwt_access_token_secret_key_12345',
    { expiresIn: '1h' }
  );
  console.log('✓ Signed test JWT token for tenant');

  // Create an isolated test bill for testing
  const testBill = await Bill.create({
    tenant: tenantRecord._id,
    property: property._id,
    invoiceNumber: `TEST-DEMO-INV-${Date.now()}`,
    month: 12,
    year: 2026,
    rent: 15000,
    electricityBill: 1200,
    waterBill: 300,
    maintenanceCharge: 500,
    lateFine: 0,
    totalAmount: 17000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'unpaid'
  });
  console.log(`✓ Created isolated test bill: ${testBill.invoiceNumber} (Total: ₹${testBill.totalAmount})`);

  let testPaymentIds = [];

  try {
    // -------------------------------------------------------------
    // Test 1: Validation - Invalid simulation outcome
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Reject invalid simulation outcome ---');
    const invalidOutcomeRes = await fetch(`${API_BASE}/payments/demo-simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        billId: testBill._id.toString(),
        simulateOutcome: 'invalid_mode'
      })
    });
    const invalidOutcomeData = await invalidOutcomeRes.json();
    if (invalidOutcomeRes.status === 400 && !invalidOutcomeData.success) {
      console.log('✓ PASS: Invalid simulation outcome correctly rejected with 400');
    } else {
      throw new Error(`FAIL: Expected 400 for invalid outcome, got ${invalidOutcomeRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 1b: Security - Tenant Authorization Validation (Requirement 5)
    // -------------------------------------------------------------
    console.log('\n--- Test 1b: Reject unauthorized tenant settling foreign bill ---');
    let otherTenant = await Tenant.findOne({ _id: { $ne: tenantRecord._id } });
    let createdTempTenant = false;
    if (!otherTenant) {
      otherTenant = await Tenant.create({
        name: 'Other Tenant',
        email: `othertenant_${Date.now()}@example.com`,
        phone: '+919999888877',
        password: 'Password123'
      });
      createdTempTenant = true;
    }

    const foreignTenantToken = jwt.sign(
      { id: otherTenant._id.toString(), email: otherTenant.email, role: 'tenant' },
      process.env.JWT_SECRET || 'your_super_secret_jwt_access_token_secret_key_12345',
      { expiresIn: '1h' }
    );
    const unauthorizedRes = await fetch(`${API_BASE}/payments/demo-simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${foreignTenantToken}`
      },
      body: JSON.stringify({
        billId: testBill._id.toString(),
        simulateOutcome: 'success'
      })
    });
    const unauthorizedData = await unauthorizedRes.json();
    if (createdTempTenant) {
      await Tenant.findByIdAndDelete(otherTenant._id);
    }

    if (unauthorizedRes.status === 403 && !unauthorizedData.success) {
      console.log('✓ PASS: Unauthorized tenant attempt rejected with 403 Forbidden');
    } else {
      throw new Error(`FAIL: Expected 403 for unauthorized tenant, got ${unauthorizedRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Simulate Payment Failure
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Simulate Payment Failure ---');
    const failedSimRes = await fetch(`${API_BASE}/payments/demo-simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        billId: testBill._id.toString(),
        simulateOutcome: 'failure',
        failureReason: 'Simulated payment processing timeout / Insufficient funds'
      })
    });
    const failedSimData = await failedSimRes.json();

    if (failedSimRes.status === 400 && failedSimData.success === false) {
      console.log(`✓ PASS: Failed simulation responded with 400 and clear error: "${failedSimData.message}"`);
    } else {
      throw new Error(`FAIL: Expected 400 for failed simulation, got ${failedSimRes.status}`);
    }

    // Check Bill is still unpaid
    const billAfterFailure = await Bill.findById(testBill._id);
    if (billAfterFailure.status === 'unpaid') {
      console.log('✓ PASS: Bill remains UNPAID after failure simulation');
    } else {
      throw new Error(`FAIL: Bill was marked as ${billAfterFailure.status} instead of unpaid`);
    }

    // Check Payment record was logged with status: 'failed' and isDemo: true
    const failedPayment = await Payment.findOne({
      bill: testBill._id,
      status: 'failed'
    });
    if (failedPayment && failedPayment.isDemo === true && failedPayment.transactionId.startsWith('DEMO-FAIL-')) {
      testPaymentIds.push(failedPayment._id);
      console.log(`✓ PASS: Failed demo transaction recorded: ${failedPayment.transactionId}, isDemo: ${failedPayment.isDemo}, reason: "${failedPayment.failureReason}"`);
    } else {
      throw new Error('FAIL: Failed payment record not found or missing demo flags');
    }

    // -------------------------------------------------------------
    // Test 3: Simulate Payment Success
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Simulate Payment Success ---');
    const successSimRes = await fetch(`${API_BASE}/payments/demo-simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        billId: testBill._id.toString(),
        simulateOutcome: 'success'
      })
    });
    const successSimData = await successSimRes.json();

    if (successSimRes.status === 200 && successSimData.success === true) {
      console.log(`✓ PASS: Success simulation responded with 200: "${successSimData.message}"`);
    } else {
      throw new Error(`FAIL: Expected 200 for success simulation, got ${successSimRes.status}: ${JSON.stringify(successSimData)}`);
    }

    // Check Bill status is paid and paidAt is set
    const billAfterSuccess = await Bill.findById(testBill._id);
    if (billAfterSuccess.status === 'paid' && billAfterSuccess.paidAt) {
      console.log(`✓ PASS: Bill updated to PAID on ${billAfterSuccess.paidAt}`);
    } else {
      throw new Error(`FAIL: Bill status is ${billAfterSuccess.status}, paidAt: ${billAfterSuccess.paidAt}`);
    }

    // Check Payment record was created with status: 'success', isDemo: true, paymentMethod: 'Demo'
    const successPayment = await Payment.findOne({
      bill: testBill._id,
      status: 'success'
    });
    if (successPayment && successPayment.isDemo === true && successPayment.paymentMethod === 'Demo' && successPayment.transactionId.startsWith('DEMO-TXN-')) {
      testPaymentIds.push(successPayment._id);
      console.log(`✓ PASS: Successful demo transaction created: ${successPayment.transactionId}, isDemo: ${successPayment.isDemo}, amount: ₹${successPayment.amount}`);
    } else {
      throw new Error('FAIL: Success payment record not created properly or missing demo flags');
    }

    // -------------------------------------------------------------
    // Test 4: Re-attempt payment on already paid bill (Idempotency)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Prevent duplicate payment on already paid bill ---');
    const duplicateRes = await fetch(`${API_BASE}/payments/demo-simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        billId: testBill._id.toString(),
        simulateOutcome: 'success'
      })
    });
    const duplicateData = await duplicateRes.json();
    if (duplicateRes.status === 400 && duplicateData.message.includes('already been paid')) {
      console.log(`✓ PASS: Duplicate payment rejected with message: "${duplicateData.message}"`);
    } else {
      throw new Error(`FAIL: Expected 400 for duplicate payment, got ${duplicateRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Verify Tenant Dashboard API includes demo payment
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Tenant Dashboard reflects demo payment ---');
    const tenantDashRes = await fetch(`${API_BASE}/reports/tenant-dashboard`, {
      headers: { Authorization: `Bearer ${tenantToken}` }
    });
    const tenantDashData = await tenantDashRes.json();
    if (tenantDashData.success && tenantDashData.paymentHistory) {
      const foundInHistory = tenantDashData.paymentHistory.find(p => p._id.toString() === successPayment._id.toString());
      if (foundInHistory && (foundInHistory.isDemo === true || foundInHistory.paymentMethod === 'Demo')) {
        console.log(`✓ PASS: Demo payment visible in Tenant paymentHistory with isDemo: true`);
      } else {
        throw new Error('FAIL: Demo payment not found in tenant payment history');
      }
    } else {
      throw new Error('FAIL: Tenant dashboard response unsuccessful');
    }

    // -------------------------------------------------------------
    // Test 6: Verify PDF Receipt generation for Demo Payment
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Verify PDF Receipt generation with Demo Stamp ---');
    const pdfRes = await fetch(`${API_BASE}/bills/${testBill._id}/pdf`, {
      headers: { Authorization: `Bearer ${tenantToken}` }
    });
    const pdfData = await pdfRes.json();
    console.log('PDF response status:', pdfRes.status, 'data:', pdfData);
    if (pdfData.success && pdfData.pdfUrl) {
      console.log(`✓ PASS: Demo PDF receipt generated: ${pdfData.pdfUrl}`);
    } else {
      throw new Error(`FAIL: Failed to generate PDF receipt: ${JSON.stringify(pdfData)}`);
    }

    console.log('\n=============================================');
    console.log('ALL DEMO PAYMENT TESTS PASSED SUCCESSFULLY! 🚀');
    console.log('=============================================');

  } finally {
    // Clean up ONLY the temporary test bill and payments
    console.log('\n--- Cleaning up temporary test artifacts ---');
    await Bill.findByIdAndDelete(testBill._id);
    for (const pid of testPaymentIds) {
      await Payment.findByIdAndDelete(pid);
    }
    console.log('✓ Cleaned up test bill and demo test payment records.');
    await mongoose.disconnect();
    console.log('✓ Database connection closed.');
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

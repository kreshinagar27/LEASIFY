const API_BASE = 'http://localhost:5001/api/v1';

async function runTests() {
  console.log('=== LEASIFY TENANT REGISTRATION & SINGLE OWNER TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  async function postJson(endpoint, data, headers = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: body };
  }

  async function getJson(endpoint, headers = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: { ...headers }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: body };
  }

  try {
    // TEST 1: Reject registration of a SECOND OWNER
    const secondOwnerRes = await postJson('/auth/register', {
      name: 'Second Fake Owner',
      email: 'secondowner@example.com',
      password: 'Password123',
      contactNumber: '9998887776'
    });
    assert(
      secondOwnerRes.status === 400 && secondOwnerRes.data.message.includes('owner account already exists'),
      `Second owner rejected with: "${secondOwnerRes.data.message}"`
    );

    // TEST 2: Validation checks for Tenant Registration (missing fields)
    const missingFieldsRes = await postJson('/auth/register-tenant', {
      name: 'Incomplete Tenant'
    });
    assert(
      missingFieldsRes.status === 400 && missingFieldsRes.data.message.includes('required fields'),
      `Missing fields rejected with 400: "${missingFieldsRes.data.message}"`
    );

    // TEST 3: Validation checks for Tenant Registration (short password)
    const shortPassRes = await postJson('/auth/register-tenant', {
      name: 'Short Pass Tenant',
      email: 'shortpass@example.com',
      password: '123',
      phone: '9876543210'
    });
    assert(
      shortPassRes.status === 400 && shortPassRes.data.message.includes('at least 6 characters'),
      `Short password rejected with 400: "${shortPassRes.data.message}"`
    );

    // TEST 4: Validation checks for Tenant Registration (invalid email)
    const invalidEmailRes = await postJson('/auth/register-tenant', {
      name: 'Invalid Email Tenant',
      email: 'not-an-email',
      password: 'Password123',
      phone: '9876543210'
    });
    assert(
      invalidEmailRes.status === 400 && invalidEmailRes.data.message.includes('valid email address'),
      `Invalid email rejected with 400: "${invalidEmailRes.data.message}"`
    );

    // TEST 5: Public Tenant Registration with Role Tampering attempt (sending role: 'owner')
    const testTenantEmail = `tenant_${Date.now()}@example.com`;
    const regRes = await postJson('/auth/register-tenant', {
      name: 'Rohit Sharma',
      email: testTenantEmail,
      password: 'StrongPassword123',
      phone: '+91 9876543219',
      role: 'owner' // Attempting to spoof owner role!
    });
    assert(
      regRes.status === 201 && regRes.data.success === true,
      `Tenant registered successfully with 201: "${regRes.data.message}"`
    );

    // TEST 6: Login with the newly registered tenant
    const loginRes = await postJson('/auth/login-tenant', {
      email: testTenantEmail,
      password: 'StrongPassword123'
    });
    assert(
      loginRes.status === 200 && loginRes.data.success === true,
      'Newly registered tenant logged in successfully'
    );
    assert(
      loginRes.data.user.role === 'tenant',
      `User role is strictly 'tenant' (spoofed 'owner' role was prevented)`
    );
    const tenantToken = loginRes.data.accessToken;

    // TEST 7: Tenant attempting to access Owner-only protected routes (e.g. /audit-logs)
    const accessRes = await getJson('/audit-logs', {
      Authorization: `Bearer ${tenantToken}`
    });
    assert(
      accessRes.status === 403,
      `Tenant strictly forbidden from owner routes (403 Forbidden): "${accessRes.data.message}"`
    );

    // TEST 8: Duplicate Tenant Email rejection (409 Conflict)
    const dupRes = await postJson('/auth/register-tenant', {
      name: 'Duplicate Tenant',
      email: testTenantEmail,
      password: 'AnotherPassword123',
      phone: '+91 9876543219'
    });
    assert(
      dupRes.status === 409 && dupRes.data.message.includes('already exists'),
      `Duplicate tenant email rejected with 409: "${dupRes.data.message}"`
    );

    // TEST 9: Attempting to register tenant using the owner's email (409 Conflict)
    const ownerEmailRes = await postJson('/auth/register-tenant', {
      name: 'Owner Imposter',
      email: 'kreshinagar27@gmail.com',
      password: 'AnotherPassword123',
      phone: '+91 9876543219'
    });
    assert(
      ownerEmailRes.status === 409,
      `Tenant using existing owner email rejected with 409: "${ownerEmailRes.data.message}"`
    );

    // TEST 10: Register Tenant via /auth/register route delegating by role
    const testTenantEmail2 = `tenant2_${Date.now()}@example.com`;
    const regRes2 = await postJson('/auth/register', {
      name: 'Priya Patel',
      email: testTenantEmail2,
      password: 'StrongPassword123',
      phone: '+91 9876543218',
      role: 'tenant'
    });
    assert(
      regRes2.status === 201 && regRes2.data.success === true,
      `Tenant registered via /register route: "${regRes2.data.message}"`
    );

    const loginRes2 = await postJson('/auth/login-tenant', {
      email: testTenantEmail2,
      password: 'StrongPassword123'
    });
    assert(
      loginRes2.status === 200 && loginRes2.data.user.role === 'tenant',
      'Second tenant logged in with role = tenant'
    );

    // TEST 11: Demo Owner Login
    const demoOwnerRes = await postJson('/auth/login-owner', {
      email: 'kreshinagar27@gmail.com',
      password: 'Admin@123'
    });
    assert(
      demoOwnerRes.status === 200 && demoOwnerRes.data.user.role === 'owner',
      'Demo owner (kreshinagar27@gmail.com) logs in successfully'
    );

    // TEST 12: Confirm demo tenant (tenant1@leasify.com) is properly removed
    const demoTenantRes = await postJson('/auth/login-tenant', {
      email: 'tenant1@leasify.com',
      password: 'Password123'
    });
    assert(
      demoTenantRes.status === 404,
      'Demo tenant (tenant1@leasify.com) is confirmed deleted (404 Not Found)'
    );

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();

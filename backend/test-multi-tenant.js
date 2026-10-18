const API_BASE = 'http://localhost:5001/api/v1';

async function runTests() {
  console.log('==================================================');
  console.log('       LEASIFY MULTI-TENANT TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. OWNER LOGIN
  console.log('--- TEST 1: Owner Login (kreshinagar27@gmail.com) ---');
  const ownerLoginRes = await fetch(`${API_BASE}/auth/login-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kreshinagar27@gmail.com', password: 'Admin@123' })
  });
  const ownerLoginData = await ownerLoginRes.json();
  assert(ownerLoginRes.status === 200 && ownerLoginData.user?.role === 'owner', 'Owner logged in successfully with role=owner');
  const ownerToken = ownerLoginData.accessToken;
  const ownerId = ownerLoginData.user?.id;

  // 2. ATTEMPT TO REGISTER A SECOND OWNER
  console.log('\n--- TEST 2: Single Owner Rule (Reject Second Owner Registration) ---');
  const duplicateOwnerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Owner Attempt',
      email: 'hacker_owner@domain.com',
      password: 'Password123',
      contactNumber: '+91 9999999999',
      role: 'owner'
    })
  });
  const duplicateOwnerData = await duplicateOwnerRes.json();
  assert(
    duplicateOwnerRes.status === 400 && duplicateOwnerData.message === 'An owner account already exists.',
    `Second owner rejected with: "${duplicateOwnerData.message}"`
  );

  // 3. OWNER CREATES TENANT 1, TENANT 2, TENANT 3
  console.log('\n--- TEST 3: Owner Creates Multiple Tenants (Tenant 1, 2, 3) ---');
  const timeId = Date.now().toString().slice(-4);
  const t1Email = `autotenant1_${timeId}@leasify.com`;
  const t2Email = `autotenant2_${timeId}@leasify.com`;
  const t3Email = `autotenant3_${timeId}@leasify.com`;

  const createT1 = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Auto Tenant One',
      email: t1Email,
      phone: '+91 9800000001',
      password: 'TenantPassword@1',
      monthlyRent: 22000,
      securityDeposit: 44000
    })
  });
  const t1Data = await createT1.json();
  assert(createT1.status === 201 && t1Data.data?.role === 'tenant', `Tenant 1 created: ${t1Email}`);
  const tenant1Id = t1Data.data?._id;

  const createT2 = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Auto Tenant Two',
      email: t2Email,
      phone: '+91 9800000002',
      password: 'TenantPassword@2',
      monthlyRent: 28000,
      securityDeposit: 56000
    })
  });
  const t2Data = await createT2.json();
  assert(createT2.status === 201 && t2Data.data?.role === 'tenant', `Tenant 2 created: ${t2Email}`);
  const tenant2Id = t2Data.data?._id;

  const createT3 = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Auto Tenant Three',
      email: t3Email,
      phone: '+91 9800000003',
      password: 'TenantPassword@3',
      monthlyRent: 35000,
      securityDeposit: 70000
    })
  });
  const t3Data = await createT3.json();
  assert(createT3.status === 201 && t3Data.data?.role === 'tenant', `Tenant 3 created: ${t3Email}`);
  const tenant3Id = t3Data.data?._id;

  // 4. CONFIRM ALL THREE EXIST SIMULTANEOUSLY
  console.log('\n--- TEST 4: Confirm All Three Tenants Exist in Tenant List ---');
  const getTenantsRes = await fetch(`${API_BASE}/tenants`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const allTenantsData = await getTenantsRes.json();
  const foundT1 = allTenantsData.data?.some(t => t._id === tenant1Id);
  const foundT2 = allTenantsData.data?.some(t => t._id === tenant2Id);
  const foundT3 = allTenantsData.data?.some(t => t._id === tenant3Id);
  assert(foundT1 && foundT2 && foundT3, 'All 3 created tenants exist simultaneously in database');

  // 5. EDIT TENANT 1
  console.log('\n--- TEST 5: Owner Edits Tenant 1 Details ---');
  const editT1 = await fetch(`${API_BASE}/tenants/${tenant1Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Auto Tenant One (Updated)',
      phone: '+91 9800000999',
      occupation: 'Senior Staff Engineer'
    })
  });
  const editT1Data = await editT1.json();
  assert(editT1.status === 200 && editT1Data.data?.name === 'Auto Tenant One (Updated)', 'Tenant 1 successfully updated');

  // 6. ASSIGN TENANT 1 TO APARTMENT / PROPERTY
  console.log('\n--- TEST 6: Owner Assigns Apartment / Property to Tenant 1 ---');
  const aptsRes = await fetch(`${API_BASE}/apartments`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const aptsData = await aptsRes.json();
  const sampleApt = aptsData.data?.[0];

  const assignRes = await fetch(`${API_BASE}/tenants/${tenant1Id}/assign-property`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({
      apartmentId: sampleApt?._id,
      propertyId: sampleApt?.property?._id || sampleApt?.property,
      unitNumber: sampleApt?.number || '402',
      monthlyRent: 26000,
      securityDeposit: 52000
    })
  });
  const assignData = await assignRes.json();
  assert(assignRes.status === 200 && assignData.data?.propertyAssigned !== null, `Tenant 1 assigned to property: ${assignData.data?.propertyAssigned?.name}`);

  // 7. RESET TENANT 1 PASSWORD
  console.log('\n--- TEST 7: Owner Resets Tenant 1 Password ---');
  const resetRes = await fetch(`${API_BASE}/tenants/${tenant1Id}/reset-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ newPassword: 'NewPassword@999' })
  });
  const resetData = await resetRes.json();
  assert(resetRes.status === 200 && !resetData.password, 'Password reset succeeded without leaking plaintext password');

  // 8. DEACTIVATE TENANT 2 & CONFIRM LOGIN DENIED
  console.log('\n--- TEST 8: Deactivate Tenant 2 & Verify Login Blocked ---');
  const deactRes = await fetch(`${API_BASE}/tenants/${tenant2Id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ isActive: false })
  });
  const deactData = await deactRes.json();
  assert(deactRes.status === 200 && deactData.data?.isActive === false, 'Tenant 2 successfully marked inactive');

  const t2LoginRes = await fetch(`${API_BASE}/auth/login-tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: t2Email, password: 'TenantPassword@2' })
  });
  assert(t2LoginRes.status === 403, `Inactive Tenant 2 login blocked with status 403: ${(await t2LoginRes.json()).message}`);

  // 9. LOGIN AS TENANT 1 WITH NEW PASSWORD
  console.log('\n--- TEST 9: Tenant 1 Login With New Reset Password ---');
  const t1LoginRes = await fetch(`${API_BASE}/auth/login-tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: t1Email, password: 'NewPassword@999' })
  });
  const t1LoginData = await t1LoginRes.json();
  assert(t1LoginRes.status === 200 && t1LoginData.user?.role === 'tenant', 'Tenant 1 logged in successfully with reset password');
  const tenant1Token = t1LoginData.accessToken;

  // 10. TENANT 1 DASHBOARD WORKS & ISOLATED
  console.log('\n--- TEST 10: Tenant 1 Accesses Tenant Dashboard ---');
  const t1DashRes = await fetch(`${API_BASE}/reports/tenant-dashboard`, {
    headers: { 'Authorization': `Bearer ${tenant1Token}` }
  });
  const t1DashData = await t1DashRes.json();
  assert(t1DashRes.status === 200 && t1DashData.tenantDetails?.email === t1Email, 'Tenant 1 accesses their own tenant dashboard');

  // 11. TENANT 1 ATTEMPTS TO ACCESS TENANT 2 DATA (MUST BE 403)
  console.log('\n--- TEST 11: Tenant 1 Attempts to Access Tenant 2 Data ---');
  const accessT2Res = await fetch(`${API_BASE}/tenants/${tenant2Id}`, {
    headers: { 'Authorization': `Bearer ${tenant1Token}` }
  });
  assert(accessT2Res.status === 403, `Tenant 1 denied access to Tenant 2 with 403: ${(await accessT2Res.json()).message}`);

  // 12. TENANT 1 ATTEMPTS TO ACCESS OWNER DASHBOARD (MUST BE 403)
  console.log('\n--- TEST 12: Tenant 1 Attempts to Access Owner Dashboard ---');
  const accessOwnerDash = await fetch(`${API_BASE}/reports/owner-dashboard`, {
    headers: { 'Authorization': `Bearer ${tenant1Token}` }
  });
  assert(accessOwnerDash.status === 403, `Tenant 1 denied access to Owner Dashboard with 403`);

  // 13. TENANT 1 ATTEMPTS TO LIST TENANTS (MUST BE 403)
  console.log('\n--- TEST 13: Tenant 1 Attempts to List All Tenants ---');
  const listTenantsAsTenant = await fetch(`${API_BASE}/tenants`, {
    headers: { 'Authorization': `Bearer ${tenant1Token}` }
  });
  assert(listTenantsAsTenant.status === 403, `Tenant 1 denied listing tenants with 403`);

  // 14. TENANT 1 ATTEMPTS TO CREATE ANOTHER TENANT (MUST BE 403)
  console.log('\n--- TEST 14: Tenant 1 Attempts to Create Another Tenant ---');
  const tenantCreateTenant = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenant1Token}` },
    body: JSON.stringify({
      name: 'Unauthorized Tenant',
      email: 'unauth@leasify.com',
      phone: '+91 9999900000',
      password: 'Password123'
    })
  });
  assert(tenantCreateTenant.status === 403, `Tenant 1 denied creating another tenant with 403`);

  // 15. TENANT 1 ATTEMPTS TO CREATE AN OWNER (MUST BE 400 'An owner account already exists.')
  console.log('\n--- TEST 15: Tenant 1 Attempts to Register Another Owner ---');
  const tenantCreateOwner = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Landlord',
      email: 'rogue@leasify.com',
      password: 'Password123',
      contactNumber: '+91 9999911111',
      role: 'owner'
    })
  });
  const rogueData = await tenantCreateOwner.json();
  assert(
    tenantCreateOwner.status === 400 && rogueData.message === 'An owner account already exists.',
    `Rogue owner creation denied with: "${rogueData.message}"`
  );

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

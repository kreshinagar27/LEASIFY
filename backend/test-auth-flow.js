const http = require('http');

const API_PORT = 5000;
const BASE_URL = `http://localhost:${API_PORT}/api/v1`;

// Helper function for HTTP requests using native http module
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = body ? JSON.stringify(body) : '';
    
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, rawHeaders: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, rawHeaders: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  END-TO-END AUTHENTICATION & TENANT TEST SUITE     ');
  console.log('====================================================\n');

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

  try {
    // 1. Health check
    const health = await request('GET', '/../../health');
    assert(health.status === 200 && health.body.success, 'Backend health check operational');

    // 2. Owner Login with non-existent user
    const badOwnerUser = await request('POST', '/auth/login-owner', {
      email: 'nonexistent_owner_999@leasify.com',
      password: 'SomePassword123'
    });
    assert(badOwnerUser.status === 404 && badOwnerUser.body.message === 'User not found', 'Granular Error: Owner not found (404)');

    // 3. Tenant Login with non-existent tenant
    const badTenantUser = await request('POST', '/auth/login-tenant', {
      email: 'nonexistent_tenant_999@leasify.com',
      password: 'SomePassword123'
    });
    assert(badTenantUser.status === 404 && badTenantUser.body.message === 'Tenant not found', 'Granular Error: Tenant not found (404)');

    // 4. Tenant Login with incorrect password
    const badTenantPassword = await request('POST', '/auth/login-tenant', {
      email: 'tenant1@leasify.com',
      password: 'WrongPassword123'
    });
    assert(badTenantPassword.status === 401 && badTenantPassword.body.message === 'Incorrect password', 'Granular Error: Incorrect password (401)');

    // 5. Valid Owner Login (admin@leasify.com / Admin@123)
    const ownerLogin = await request('POST', '/auth/login-owner', {
      email: 'admin@leasify.com',
      password: 'Admin@123'
    });
    assert(
      ownerLogin.status === 200 &&
      ownerLogin.body.success &&
      ownerLogin.body.accessToken &&
      ownerLogin.body.refreshToken &&
      ownerLogin.body.user.role === 'owner',
      'Owner Login & JWT Generation (admin@leasify.com / Admin@123)'
    );

    const ownerToken = ownerLogin.body.accessToken;
    const ownerRefreshToken = ownerLogin.body.refreshToken;

    // 6. Valid Tenant Login 1 (tenant1@leasify.com / Password123)
    const tenant1Login = await request('POST', '/auth/login-tenant', {
      email: 'tenant1@leasify.com',
      password: 'Password123'
    });
    assert(
      tenant1Login.status === 200 &&
      tenant1Login.body.success &&
      tenant1Login.body.accessToken &&
      tenant1Login.body.user.role === 'tenant',
      'Tenant Login & JWT Generation (tenant1@leasify.com / Password123)'
    );

    const tenant1Token = tenant1Login.body.accessToken;

    // 7. Valid Tenant Login 2 (tenant2@leasify.com / Password123)
    const tenant2Login = await request('POST', '/auth/login-tenant', {
      email: 'tenant2@leasify.com',
      password: 'Password123'
    });
    assert(
      tenant2Login.status === 200 &&
      tenant2Login.body.success &&
      tenant2Login.body.user.email === 'tenant2@leasify.com',
      'Tenant Login 2 (tenant2@leasify.com / Password123)'
    );

    // 8. Test Protected Route (/auth/me) with Owner Token
    const ownerMe = await request('GET', '/auth/me', null, { Authorization: `Bearer ${ownerToken}` });
    assert(ownerMe.status === 200 && ownerMe.body.user.email === 'admin@leasify.com', 'Protected Route /auth/me for Owner');

    // 9. Test Protected Route (/auth/me) with Tenant Token
    const tenantMe = await request('GET', '/auth/me', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(tenantMe.status === 200 && tenantMe.body.user.email === 'tenant1@leasify.com', 'Protected Route /auth/me for Tenant');

    // 10. Test Refresh Token
    const refreshRes = await request('POST', '/auth/refresh-token', { refreshToken: ownerRefreshToken });
    assert(refreshRes.status === 200 && refreshRes.body.accessToken, 'JWT Refresh Token Generation');

    // 11. Owner Dashboard Data Endpoint
    const ownerDash = await request('GET', '/reports/owner-dashboard', null, { Authorization: `Bearer ${ownerToken}` });
    assert(
      ownerDash.status === 200 &&
      ownerDash.body.stats,
      'Owner Dashboard Data Loading'
    );

    // 12. Tenant Dashboard Data Endpoint
    const tenantDash = await request('GET', '/reports/tenant-dashboard', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(
      tenantDash.status === 200 &&
      tenantDash.body.tenantDetails &&
      tenantDash.body.property &&
      tenantDash.body.property.owner,
      'Tenant Dashboard Data Loading (Assigned property, owner info, rent & bills)'
    );

    // 13. Tenant Bills API (/bills)
    const tenantBills = await request('GET', '/bills', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(tenantBills.status === 200 && Array.isArray(tenantBills.body.data), 'Tenant Protected Route: GET /bills');

    // 14. Tenant Payments API (/payments)
    const tenantPayments = await request('GET', '/payments', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(tenantPayments.status === 200 && Array.isArray(tenantPayments.body.data), 'Tenant Protected Route: GET /payments');

    // 15. Tenant Maintenance Complaints API (/maintenance)
    const tenantComplaints = await request('GET', '/maintenance', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(tenantComplaints.status === 200 && Array.isArray(tenantComplaints.body.data), 'Tenant Protected Route: GET /maintenance');

    // 16. Tenant Assigned Property API (/properties/my)
    const tenantMyProp = await request('GET', '/properties/my', null, { Authorization: `Bearer ${tenant1Token}` });
    assert(tenantMyProp.status === 200 && tenantMyProp.body.data && tenantMyProp.body.data.name, 'Tenant Assigned Property Route: GET /properties/my');

    // 17. Invalid Property ID Validation
    const invalidPropReq = await request('GET', '/properties/my_invalid_id', null, { Authorization: `Bearer ${ownerToken}` });
    assert(invalidPropReq.status === 400 && invalidPropReq.body.message === 'Invalid Property ID', 'ObjectId Validation: /properties/:id returns 400 for invalid ID');

    // 18. Invalid Tenant ID Validation
    const invalidTenantReq = await request('GET', '/tenants/invalid_tenant_123', null, { Authorization: `Bearer ${ownerToken}` });
    assert(invalidTenantReq.status === 400 && invalidTenantReq.body.message === 'Invalid Tenant ID', 'ObjectId Validation: /tenants/:id returns 400 for invalid ID');

    // 19. Invalid Bill ID Validation
    const invalidBillReq = await request('GET', '/bills/invalid_bill_999', null, { Authorization: `Bearer ${ownerToken}` });
    assert(invalidBillReq.status === 400 && invalidBillReq.body.message === 'Invalid Bill ID', 'ObjectId Validation: /bills/:id returns 400 for invalid ID');

    // 20. Property Deletion Strategy Interception (409 Conflict)
    const ownerProps = await request('GET', '/properties', null, { Authorization: `Bearer ${ownerToken}` });
    const occupiedProp = ownerProps.body.data.find(p => p.status === 'Occupied');
    
    if (occupiedProp) {
      const deleteIntercept = await request('DELETE', `/properties/${occupiedProp._id}`, null, { Authorization: `Bearer ${ownerToken}` });
      assert(
        deleteIntercept.status === 409 && deleteIntercept.body.requiresStrategy,
        'Property Deletion Interception: Occupied property returns HTTP 409 requiresStrategy'
      );

      // 21. Property Deletion Option C (Archive Strategy)
      const archiveRes = await request('DELETE', `/properties/${occupiedProp._id}`, { strategy: 'archive' }, { Authorization: `Bearer ${ownerToken}` });
      assert(
        archiveRes.status === 200 && archiveRes.body.action === 'archived',
        'Property Deletion Option C: Archive strategy sets status Archived'
      );
    }

    // 22. Create New Property with Extended Real-Estate Specifications
    const createExtProp = await request('POST', '/properties', {
      name: `Test Luxury Suite ${Date.now()}`,
      type: 'apartment',
      category: 'Residential',
      floorNumber: 5,
      totalFloors: 12,
      areaSqFt: 1450,
      carpetAreaSqFt: 1150,
      builtUpAreaSqFt: 1350,
      bedrooms: 3,
      bathrooms: 3,
      balconies: 2,
      furnishedStatus: 'furnished',
      parkingType: 'Four-Wheeler',
      facingDirection: 'North-East',
      propertyAge: 1,
      monthlyRent: 35000,
      securityDeposit: 70000,
      maintenanceCharges: 2500,
      electricityCharges: 1500,
      waterCharges: 500,
      availableFromDate: '2026-08-01',
      houseNumber: 'Penthouse 1201',
      street: 'Palm Meadows Boulevard',
      area: 'Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560066',
      latitude: 12.9698,
      longitude: 77.7499,
      amenities: ['Power Backup', 'Security Guard', 'High-Speed Wi-Fi', 'Swimming Pool'],
      description: 'Luxury 3BHK Penthouse with panoramic pool view'
    }, { Authorization: `Bearer ${ownerToken}` });

    assert(
      createExtProp.status === 201 &&
      createExtProp.body.success &&
      createExtProp.body.data.category === 'Residential' &&
      createExtProp.body.data.totalFloors === 12 &&
      createExtProp.body.data.carpetAreaSqFt === 1150 &&
      createExtProp.body.data.maintenanceCharges === 2500,
      'Extended Property Creation with 15+ Specifications & Amenities'
    );

    const createdPropId = createExtProp.body.data._id;

    // 23. Update Property Details (PUT /properties/:id)
    const updateExtProp = await request('PUT', `/properties/${createdPropId}`, {
      name: `Test Luxury Suite Updated`,
      maintenanceCharges: 3000,
      parkingType: 'Both',
      facingDirection: 'East'
    }, { Authorization: `Bearer ${ownerToken}` });

    assert(
      updateExtProp.status === 200 &&
      updateExtProp.body.success &&
      updateExtProp.body.data.maintenanceCharges === 3000 &&
      updateExtProp.body.data.parkingType === 'Both',
      'Extended Property Edit & MongoDB Persistence (PUT /properties/:id)'
    );

    // 24. Test Owner Registration Flow
    const newRegEmail = `test_owner_${Date.now()}@leasify.com`;
    const regRes = await request('POST', '/auth/register', {
      name: 'New Test Owner',
      email: newRegEmail,
      password: 'TestPassword123',
      contactNumber: '+91 9999900000',
      address: 'Bengaluru'
    });
    assert(regRes.status === 201 && regRes.body.success, 'Owner Registration Endpoint');

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}

runTests();

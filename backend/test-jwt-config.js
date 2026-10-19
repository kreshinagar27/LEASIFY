const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const {
  getJwtSecret,
  getJwtRefreshSecret,
  getJwtExpire,
  getJwtRefreshExpire,
  validateJwtConfig
} = require('./config/jwt');

async function runJwtAuditTests() {
  console.log('====================================================');
  console.log('       JWT CONFIGURATION & SECURITY AUDIT TEST      ');
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

  // -------------------------------------------------------------
  // Test 1: Active Environment Secret Retrieval
  // -------------------------------------------------------------
  console.log('--- Test 1: Configuration Retrieval ---');
  const activeSecret = getJwtSecret();
  const activeRefreshSecret = getJwtRefreshSecret();
  const activeExpire = getJwtExpire();
  const activeRefreshExpire = getJwtRefreshExpire();

  assert(typeof activeSecret === 'string' && activeSecret.length > 0, 'JWT_SECRET is successfully retrieved and non-empty');
  assert(typeof activeRefreshSecret === 'string' && activeRefreshSecret.length > 0, 'JWT_REFRESH_SECRET is successfully retrieved and non-empty');
  assert(activeExpire === (process.env.JWT_EXPIRE || '15m'), `JWT_EXPIRE resolved to '${activeExpire}'`);
  assert(activeRefreshExpire === (process.env.JWT_REFRESH_EXPIRE || '7d'), `JWT_REFRESH_EXPIRE resolved to '${activeRefreshExpire}'`);

  // -------------------------------------------------------------
  // Test 2: Symmetric Signing and Verification
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Symmetric Signing & Verification ---');
  const payload = { id: 'test_user_123', email: 'audit@leasify.com', role: 'owner' };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpire() });
  
  assert(typeof token === 'string' && token.split('.').length === 3, 'Token signed in standard JWT header.payload.signature format');

  const decoded = jwt.verify(token, getJwtSecret());
  assert(decoded.id === payload.id && decoded.role === payload.role, 'Token verified successfully with matching payload using getJwtSecret()');

  // Verify signature rejection with wrong secret
  let wrongSecretRejected = false;
  try {
    jwt.verify(token, 'completely_wrong_secret_key_abcdef');
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      wrongSecretRejected = true;
    }
  }
  assert(wrongSecretRejected, 'Signature correctly rejected when verified with a mismatched secret');

  // -------------------------------------------------------------
  // Test 3: Refresh Token Signing & Verification
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Refresh Token Verification ---');
  const refreshToken = jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: getJwtRefreshExpire() });
  const decodedRefresh = jwt.verify(refreshToken, getJwtRefreshSecret());
  assert(decodedRefresh.id === payload.id, 'Refresh token verified successfully using getJwtRefreshSecret()');

  let crossSecretRejected = false;
  try {
    // Attempting to verify refresh token with access token secret must fail
    jwt.verify(refreshToken, getJwtSecret());
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      crossSecretRejected = true;
    }
  }
  assert(crossSecretRejected, 'Cross-token security: Refresh token rejected when tested against Access secret');

  // -------------------------------------------------------------
  // Test 4: Production Fail-Safe & Weak Secret Prevention
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Production Fail-Safe Validation ---');
  const savedNodeEnv = process.env.NODE_ENV;
  const savedSecret = process.env.JWT_SECRET;
  const savedRefresh = process.env.JWT_REFRESH_SECRET;

  try {
    // A. Missing secret in production must throw
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    let missingSecretThrew = false;
    try {
      validateJwtConfig();
    } catch (err) {
      if (err.message.includes('FATAL: JWT_SECRET must be configured')) {
        missingSecretThrew = true;
      }
    }
    assert(missingSecretThrew, 'Production Mode: Throws FATAL error when JWT_SECRET is missing');

    // B. Default placeholder secret in production must throw
    process.env.JWT_SECRET = 'your_super_secret_jwt_access_token_secret_key_12345';
    process.env.JWT_REFRESH_SECRET = 'your_super_secret_jwt_refresh_token_secret_key_54321';

    let placeholderThrew = false;
    try {
      validateJwtConfig();
    } catch (err) {
      if (err.message.includes('Insecure defaults/placeholders are prohibited')) {
        placeholderThrew = true;
      }
    }
    assert(placeholderThrew, 'Production Mode: Throws FATAL error when insecure placeholder secret is used');

    // C. Valid production secret passes
    process.env.JWT_SECRET = '9f8e7d6c5b4a3928170e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4';
    process.env.JWT_REFRESH_SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';

    let validProductionPassed = false;
    try {
      validateJwtConfig();
      validProductionPassed = true;
    } catch (err) {
      validProductionPassed = false;
    }
    assert(validProductionPassed, 'Production Mode: Successfully validates when secure 64-character secrets are configured');

  } finally {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.JWT_SECRET = savedSecret;
    process.env.JWT_REFRESH_SECRET = savedRefresh;
  }

  // -------------------------------------------------------------
  // Test 5: Middleware Role Isolation & Header Extraction
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Role Permissions & Header Extraction ---');
  const { protect, authorize } = require('./middleware/auth');

  // Mock Request / Response helpers
  const createMockReq = (authHeader) => ({
    headers: { authorization: authHeader },
    userRole: null,
    user: null
  });

  const createMockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = function(code) { res.statusCode = code; return res; };
    res.json = function(payload) { res.data = payload; return res; };
    return res;
  };

  // Missing Authorization header
  const reqNoAuth = createMockReq(undefined);
  const resNoAuth = createMockRes();
  let nextCalledNoAuth = false;
  await protect(reqNoAuth, resNoAuth, () => { nextCalledNoAuth = true; });

  assert(!nextCalledNoAuth && resNoAuth.statusCode === 401, 'Middleware blocks request without Authorization header (401)');

  // Expired token rejection
  const expiredToken = jwt.sign(payload, getJwtSecret(), { expiresIn: '1ms' });
  await new Promise(r => setTimeout(r, 20)); // wait for expiry

  const reqExpired = createMockReq(`Bearer ${expiredToken}`);
  const resExpired = createMockRes();
  let nextCalledExpired = false;
  await protect(reqExpired, resExpired, () => { nextCalledExpired = true; });

  assert(!nextCalledExpired && resExpired.statusCode === 401 && resExpired.data?.code === 'TOKEN_EXPIRED', 'Middleware rejects expired tokens with 401 and TOKEN_EXPIRED code');

  // Role authorization isolation
  const ownerReq = { userRole: 'owner' };
  const tenantReq = { userRole: 'tenant' };
  const resForbidden = createMockRes();
  let nextOwnerAllowed = false;
  let nextTenantAllowed = false;

  const requireOwnerOnly = authorize('owner');
  requireOwnerOnly(ownerReq, resForbidden, () => { nextOwnerAllowed = true; });
  requireOwnerOnly(tenantReq, resForbidden, () => { nextTenantAllowed = true; });

  assert(nextOwnerAllowed, 'Role Isolation: Owner role permitted on owner-only route');
  assert(!nextTenantAllowed && resForbidden.statusCode === 403, 'Role Isolation: Tenant role rejected on owner-only route with 403 Forbidden');

  console.log('\n====================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runJwtAuditTests().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

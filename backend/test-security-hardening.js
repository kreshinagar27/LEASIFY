const express = require('express');
const request = require('supertest');
const path = require('path');

// Ensure NO database connection is made
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');

async function runHardeningTests() {
  console.log('====================================================');
  console.log('       SECURITY HARDENING PHASE 1 AUDIT SUITE       ');
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

  // Set up an isolated Express app mounting authRoutes
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);

  // 1. Verify POST /remove-all-login-data is completely removed (returns 404)
  console.log('--- Test 1: Public Wipe Endpoint Removal ---');
  const resWipe = await request(app).post('/api/v1/auth/remove-all-login-data');
  assert(resWipe.status === 404, 'POST /api/v1/auth/remove-all-login-data is removed and returns 404 NOT FOUND');

  // 2. Verify POST /clean-demo-data is completely removed (returns 404)
  console.log('\n--- Test 2: Dangerous Demo Cleanup Endpoint Removal ---');
  const resClean = await request(app).post('/api/v1/auth/clean-demo-data');
  assert(resClean.status === 404, 'POST /api/v1/auth/clean-demo-data is removed and returns 404 NOT FOUND');

  // 3. Verify GET /preview-accounts is completely removed (returns 404)
  console.log('\n--- Test 3: Private Account Preview Removal ---');
  const resPreview = await request(app).get('/api/v1/auth/preview-accounts');
  assert(resPreview.status === 404, 'GET /api/v1/auth/preview-accounts is removed and returns 404 NOT FOUND');

  // 4. Verify controller exports do not expose destructive or leaking functions
  console.log('\n--- Test 4: Controller Function Removal ---');
  assert(authController.cleanDemoData === undefined, 'authController.cleanDemoData is completely undefined');
  assert(authController.getPreviewAccounts === undefined, 'authController.getPreviewAccounts is completely undefined');

  // 5. Verify scripts/cleanDemoData.js safety guard
  console.log('\n--- Test 5: Standalone Script Safety Guard ---');
  const { execSync } = require('child_process');
  let cleanScriptBlocked = false;
  try {
    execSync('node scripts/cleanDemoData.js', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ALLOW_DEMO_WIPE: 'false' },
      stdio: 'pipe'
    });
  } catch (err) {
    const output = (err.stderr || err.stdout || '').toString();
    if (output.includes('SAFETY ABORT: Demo data cleanup is disabled by default')) {
      cleanScriptBlocked = true;
    }
  }
  assert(cleanScriptBlocked, 'scripts/cleanDemoData.js aborts immediately with SAFETY ABORT when ALLOW_DEMO_WIPE is not true');

  // 6. Verify backend/seeds/demoData.js safety guard
  console.log('\n--- Test 6: Seed Script Safety Guard ---');
  let seedScriptBlocked = false;
  try {
    execSync('node backend/seeds/demoData.js', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ALLOW_SEED: 'false' },
      stdio: 'pipe'
    });
  } catch (err) {
    const output = (err.stderr || err.stdout || '').toString();
    if (output.includes('SAFETY ABORT: Database seeding is disabled by default')) {
      seedScriptBlocked = true;
    }
  }
  assert(seedScriptBlocked, 'backend/seeds/demoData.js aborts immediately with SAFETY ABORT when ALLOW_SEED is not true');

  console.log('\n====================================================');
  console.log(`HARDENING AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningTests().catch(err => {
  console.error('Hardening test error:', err);
  process.exit(1);
});

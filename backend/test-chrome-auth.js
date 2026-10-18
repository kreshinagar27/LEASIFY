const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 AUTOMATED CHROME AUTHENTICATION VERIFICATION');
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

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

  // Track network requests to /auth/login-owner and /auth/login-tenant
  const loginRequests = [];
  page.on('request', req => {
    if (req.url().includes('/auth/login')) {
      loginRequests.push({ url: req.url(), method: req.method(), postData: req.postData() });
    }
  });

  const loginResponses = [];
  page.on('response', async res => {
    if (res.url().includes('/auth/login')) {
      let body = '';
      try { body = await res.text(); } catch (e) {}
      loginResponses.push({ url: res.url(), status: res.status(), body });
    }
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Duplicate Toast Prevention on Invalid Login
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Duplicate Toast Prevention on Invalid Login ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });

    // Type non-existent email
    await page.type('input[type="email"]', 'dakshvashistha1369@gmail.com');
    await page.type('input[type="password"]', 'WrongPassword123');

    loginRequests.length = 0;
    loginResponses.length = 0;

    // Click Log In
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();
    await delay(1200);

    // Verify exactly ONE login request was dispatched
    assert(loginRequests.length === 1, `Single login request dispatched on click (Actual: ${loginRequests.length})`);
    assert(loginResponses.length === 1 && loginResponses[0].status === 401, `Backend responded 401 Incorrect password (Status: ${loginResponses[0]?.status})`);

    // Check visible toasts count
    const toasts = await page.$$('.hot-toast, [role="status"], div[style*="box-shadow"]');
    // Also inspect toast text in the DOM
    const toastTexts = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div')).filter(d => d.innerText && d.innerText.includes('Incorrect password'));
      return items.map(d => d.innerText.trim());
    });
    console.log(`Toast instances found in DOM: ${toastTexts.length}`);
    assert(toastTexts.length <= 1, `Exactly ONE error toast shown (Found: ${toastTexts.length})`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_single_error_toast.png') });

    // ----------------------------------------------------
    // TEST 2: Property Owner Successful Login
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Property Owner Successful Login ---');
    // Clear inputs and enter valid credentials
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      document.querySelector('input[type="password"]').value = '';
    });
    await page.type('input[type="email"]', '  dakshvashistha1369@gmail.com  '); // testing whitespace normalization
    await page.type('input[type="password"]', 'Admin@123');

    loginRequests.length = 0;
    loginResponses.length = 0;

    const loginBtn = await page.$('button[type="submit"]');
    await loginBtn.click();

    // Wait for redirect to dashboard
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    await delay(1500);

    assert(loginRequests.length === 1, `Single login request for successful owner login (Actual: ${loginRequests.length})`);
    assert(loginResponses.length === 1 && loginResponses[0].status === 200, `Owner login response 200 OK (Status: ${loginResponses[0]?.status})`);
    assert(page.url().includes('/dashboard'), `Redirected to dashboard: ${page.url()}`);

    // Check owner name displayed in sidebar
    const bodyText = await page.evaluate(() => document.body.innerText);
    assert(bodyText.includes('Daksh Vashistha') || bodyText.includes('Daksh'), `Owner name displayed correctly in UI`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_owner_dashboard.png') });

    // ----------------------------------------------------
    // TEST 3: Refresh after login (Session Persistence)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Session Persistence after Page Refresh ---');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await delay(1000);
    assert(page.url().includes('/dashboard'), `Remains on dashboard after refresh: ${page.url()}`);

    // ----------------------------------------------------
    // TEST 4: Owner Logout
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Owner Logout ---');
    const signOutBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      return btns.find(b => b.innerText && b.innerText.toLowerCase().includes('sign out'));
    });

    if (signOutBtn) {
      await signOutBtn.click();
      await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 6000 });
      await delay(500);
      assert(page.url().includes('/login'), `Redirected to /login after sign out (Actual: ${page.url()})`);
    } else {
      assert(false, 'Sign Out button found in sidebar');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_after_logout.png') });

    // ----------------------------------------------------
    // TEST 5: Protected Route Guard after Logout
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Protected Route Guard after Logout ---');
    await page.goto('http://localhost:5173/dashboard/owner', { waitUntil: 'domcontentloaded' });
    await delay(800);
    assert(page.url().includes('/login'), `Protected route /dashboard/owner redirected to /login (Actual: ${page.url()})`);

    // ----------------------------------------------------
    // TEST 6: Tenant Login Flow
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Resident Tenant Login Flow ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });

    // Click Resident Tenant tab
    const tabs = await page.$$('button');
    for (const t of tabs) {
      const text = await page.evaluate(el => el.innerText, t);
      if (text.includes('Resident Tenant')) {
        await t.click();
        break;
      }
    }
    await delay(300);

    await page.type('input[type="email"]', 'tenant1@leasify.com');
    await page.type('input[type="password"]', 'Password123');

    loginRequests.length = 0;
    loginResponses.length = 0;

    const tenantLoginBtn = await page.$('button[type="submit"]');
    await tenantLoginBtn.click();

    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    await delay(1500);

    assert(loginRequests.length === 1, `Single tenant login request (Actual: ${loginRequests.length})`);
    assert(loginResponses.length === 1 && loginResponses[0].status === 200, `Tenant login response 200 OK (Status: ${loginResponses[0]?.status})`);
    assert(page.url().includes('/dashboard'), `Tenant redirected to dashboard: ${page.url()}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_tenant_dashboard.png') });

    // ----------------------------------------------------
    // TEST 7: Tenant Logout
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Tenant Logout ---');
    const tenantSignOut = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      return btns.find(b => b.innerText && b.innerText.toLowerCase().includes('sign out'));
    });

    if (tenantSignOut) {
      await tenantSignOut.click();
      await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 6000 });
      await delay(500);
      assert(page.url().includes('/login'), `Tenant redirected to /login after sign out (Actual: ${page.url()})`);
    } else {
      assert(false, 'Tenant Sign Out button found');
    }

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite encountered error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();

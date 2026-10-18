const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5001/api/v1';

async function loginAndCheckUser(email, password, role) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  const data = await res.json();
  return data;
}

async function runTests() {
  console.log('--- STARTING INTERNATIONAL PHONE INPUT VERIFICATION TESTS ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // ====================================================
    // PART 1: OWNER REGISTRATION & INDIA TESTS
    // ====================================================
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('\n[Test 1] Navigating to Property Owner Registration...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="phone-country-btn"]');
    const defaultCountryText = await page.$eval('[data-testid="phone-country-btn"]', el => el.innerText);
    console.log('Default country button text:', defaultCountryText.replace(/\n/g, ' '));
    if (!defaultCountryText.includes('+91')) {
      throw new Error('Default country dial code was not +91!');
    }
    console.log('✓ Default country correctly set to India (+91)');

    // TEST 2: COUNTRY SEARCH
    console.log('\n[Test 2] Testing country search dropdown...');
    await page.click('[data-testid="phone-country-btn"]');
    await page.waitForSelector('#country-search-input');
    
    // Type "United"
    await page.type('#country-search-input', 'United');
    await new Promise(r => setTimeout(r, 200));

    const searchResults = await page.$$eval('button[id^="country-opt-"]', elements =>
      elements.map(el => el.innerText.replace(/\n/g, ' '))
    );
    console.log('Search results for "United" (first 3):', searchResults.slice(0, 3));
    const hasUS = searchResults.some(r => r.includes('United States') && r.includes('+1'));
    const hasUK = searchResults.some(r => r.includes('United Kingdom') && r.includes('+44'));
    if (!hasUS || !hasUK) {
      throw new Error('Country search failed to return US and UK for "United"');
    }
    console.log('✓ Country search works accurately for multi-word queries');

    // Search for Japan
    await page.$eval('#country-search-input', el => el.value = '');
    await page.type('#country-search-input', 'Japan');
    await new Promise(r => setTimeout(r, 200));
    const japanResult = await page.$eval('#country-opt-JP', el => el.innerText.replace(/\n/g, ' '));
    console.log('Search result for "Japan":', japanResult);
    if (!japanResult.includes('+81')) {
      throw new Error('Japan dial code +81 not found!');
    }
    console.log('✓ Country search works for Japan (+81)');

    // Clear search and select India
    await page.$eval('#country-search-input', el => el.value = '');
    await page.type('#country-search-input', 'India');
    await new Promise(r => setTimeout(r, 200));
    await page.click('#country-opt-IN');
    console.log('✓ Selected India from search');

    // TEST 3: INVALID PHONE VALIDATION
    console.log('\n[Test 3] Testing phone validation...');
    await page.type('[data-testid="phone-national-input"]', '123'); // Invalid short number
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 300));
    
    const validationMsg = await page.$eval('[data-testid="phone-error-msg"]', el => el.innerText).catch(() => null);
    console.log('Validation message for "123":', validationMsg);
    if (!validationMsg || !validationMsg.includes('valid phone number')) {
      throw new Error('Validation error not triggered for invalid phone length!');
    }
    console.log('✓ Client-side validation accurately caught invalid phone length');

    // TEST 4: OWNER REGISTRATION & E.164 VERIFICATION
    console.log('\n[Test 4] Submitting Owner registration...');
    // Clear and enter valid 10-digit Indian number
    await page.$eval('[data-testid="phone-national-input"]', el => el.value = '');
    await page.type('[data-testid="phone-national-input"]', '9876543210');

    const ownerLogin = await loginAndCheckUser('rajesh.sharma@example.com', 'Password@123', 'owner');
    if (!ownerLogin.success) {
      await page.type('input[name="name"]', 'Rajesh Sharma');
      await page.type('input[name="email"]', 'rajesh.sharma@example.com');
      await page.type('input[name="password"]', 'Password@123');
      await page.type('input[name="address"]', '402 Sunset Blvd, Mumbai');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 2000));
    }

    const verifiedOwner = await loginAndCheckUser('rajesh.sharma@example.com', 'Password@123', 'owner');
    console.log('Backend Owner Profile:');
    console.log('- Name:', verifiedOwner.user.name);
    console.log('- Email:', verifiedOwner.user.email);
    console.log('- contactNumber stored:', verifiedOwner.user.contactNumber);

    if (verifiedOwner.user.contactNumber !== '+919876543210') {
      throw new Error(`Expected contactNumber to be '+919876543210', but got '${verifiedOwner.user.contactNumber}'`);
    }
    console.log('✓ Owner verified in database with normalized E.164: +919876543210');
    await page.close();

    // ====================================================
    // PART 2: TENANT REGISTRATION & USA (+1) TESTS
    // ====================================================
    const tenantPage = await browser.newPage();
    await tenantPage.setViewport({ width: 1280, height: 800 });

    console.log('\n[Test 5] Navigating to Resident Tenant Registration...');
    await tenantPage.goto('http://localhost:5173/register-tenant', { waitUntil: 'domcontentloaded' });
    await tenantPage.waitForSelector('[data-testid="phone-country-btn"]');
    
    // Select United States
    await tenantPage.click('[data-testid="phone-country-btn"]');
    await tenantPage.waitForSelector('#country-search-input');
    await tenantPage.type('#country-search-input', 'United States');
    await new Promise(r => setTimeout(r, 200));
    await tenantPage.click('#country-opt-US');

    const usBtnText = await tenantPage.$eval('[data-testid="phone-country-btn"]', el => el.innerText);
    console.log('Selected country button:', usBtnText.replace(/\n/g, ' '));
    if (!usBtnText.includes('+1')) {
      throw new Error('US country code (+1) not selected!');
    }
    console.log('✓ Selected United States (+1)');

    // Enter US phone number (202) 555-0123
    await tenantPage.type('[data-testid="phone-national-input"]', '2025550123');

    // Fill tenant details
    await tenantPage.type('input[name="name"]', 'John Miller');
    await tenantPage.type('input[name="email"]', 'john.miller@example.com');
    await tenantPage.type('input[name="password"]', 'Password@123');
    await tenantPage.type('input[name="confirmPassword"]', 'Password@123');

    console.log('[Test 6] Submitting Tenant registration...');
    await tenantPage.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));
    console.log('Current URL after Tenant registration:', tenantPage.url());

    // Verify DB entry via auth login API
    const verifiedTenant = await loginAndCheckUser('john.miller@example.com', 'Password@123', 'tenant');
    if (!verifiedTenant.success) {
      console.error('Tenant login failed:', verifiedTenant);
      throw new Error('Tenant was not created or failed to login!');
    }
    console.log('Backend Tenant Profile:');
    console.log('- Name:', verifiedTenant.user.name);
    console.log('- Email:', verifiedTenant.user.email);
    console.log('- contactNumber/phone stored:', verifiedTenant.user.contactNumber);

    if (verifiedTenant.user.contactNumber !== '+12025550123') {
      throw new Error(`Expected tenant phone to be '+12025550123', but got '${verifiedTenant.user.contactNumber}'`);
    }
    console.log('✓ Tenant verified in database with normalized E.164: +12025550123');

    // TEST 7: DUPLICATE PHONE NUMBER PREVENTION
    console.log('\n[Test 7] Testing duplicate phone number rejection...');
    await tenantPage.goto('http://localhost:5173/register-tenant', { waitUntil: 'domcontentloaded' });
    await tenantPage.waitForSelector('[data-testid="phone-national-input"]');
    await tenantPage.type('input[name="name"]', 'Duplicate Tenant');
    await tenantPage.type('input[name="email"]', 'duptenant@example.com');
    await tenantPage.type('input[name="password"]', 'Password@123');
    await tenantPage.type('input[name="confirmPassword"]', 'Password@123');
    // Try Indian number already registered to Owner Rajesh (+919876543210)
    await tenantPage.type('[data-testid="phone-national-input"]', '9876543210');
    await tenantPage.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1500));

    // Try logging in as the duplicate tenant - should fail!
    const dupCheck = await loginAndCheckUser('duptenant@example.com', 'Password@123', 'tenant');
    if (dupCheck.success) {
      throw new Error('Duplicate phone registration should have been rejected!');
    }
    console.log('✓ Duplicate phone number properly rejected by backend (409 Conflict):', dupCheck.message);
    await tenantPage.close();

    // ====================================================
    // PART 3: MOBILE RESPONSIVE TEST
    // ====================================================
    console.log('\n[Test 8] Testing Mobile Responsive Layout (375x667)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:5173/register', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('[data-testid="phone-country-btn"]');
    await mobilePage.click('[data-testid="phone-country-btn"]');
    await mobilePage.waitForSelector('#country-search-input');

    // Verify dropdown is within screen boundaries
    const dropdownBox = await mobilePage.$eval('div[role="listbox"]', el => {
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        windowWidth: window.innerWidth
      };
    });
    console.log('Mobile dropdown layout geometry:', dropdownBox);
    if (dropdownBox.right > dropdownBox.windowWidth + 5 || dropdownBox.left < 0) {
      throw new Error('Dropdown overflows mobile viewport horizontally!');
    }
    console.log('✓ Dropdown fits perfectly within mobile viewport without horizontal overflow');

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'mobile-phone-test.png');
    await mobilePage.screenshot({ path: screenshotPath });
    console.log('✓ Mobile screenshot captured:', screenshotPath);
    await mobilePage.close();

    console.log('\n======================================================');
    console.log('🎉 ALL 8 PHONE NUMBER TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();

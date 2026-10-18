const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserTest() {
  console.log('🚀 Starting Automated Chrome UI Verification for LEASIFY...\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Navigate to Login Page
    console.log('Step 1: Navigating to http://localhost:5173/login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_owner.png') });

    // Check Property Owner initial text
    const ownerFooterText = await page.$eval('.border-t', el => el.innerText.trim());
    console.log(`Step 1 Result: Footer text when Owner selected: "${ownerFooterText}"`);
    if (!ownerFooterText.includes('New property owner? Create Account')) {
      throw new Error(`Expected "New property owner? Create Account", but got: "${ownerFooterText}"`);
    }

    // 2. Click "Resident Tenant" tab
    console.log('Step 2: Clicking "Resident Tenant" tab...');
    const tenantButtons = await page.$$('button');
    let tenantTabButton = null;
    for (const btn of tenantButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Resident Tenant')) {
        tenantTabButton = btn;
        break;
      }
    }
    if (!tenantTabButton) throw new Error('Resident Tenant tab button not found');
    await tenantTabButton.click();
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_login_tenant.png') });

    // Check Resident Tenant dynamic text
    const tenantFooterText = await page.$eval('.border-t', el => el.innerText.trim());
    console.log(`Step 2 Result: Footer text when Tenant selected: "${tenantFooterText}"`);
    if (!tenantFooterText.includes('New resident tenant? Create Account')) {
      throw new Error(`Expected "New resident tenant? Create Account", but got: "${tenantFooterText}"`);
    }

    // 3. Click "Create Account"
    console.log('Step 3: Clicking "Create Account" under Resident Tenant...');
    const createAccountLink = await page.$('.border-t a');
    await createAccountLink.click();
    await page.waitForFunction(() => window.location.pathname.includes('/register-tenant'), { timeout: 5000 });
    await page.waitForSelector('input[placeholder="Aarav Sharma"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_register_tenant_page.png') });

    const currentUrl = page.url();
    console.log(`Step 3 Result: Navigated to: ${currentUrl}`);
    const headingText = await page.$eval('h2', el => el.innerText.trim());
    console.log(`Heading text: "${headingText}"`);
    if (!headingText.includes('Create Resident Tenant Account')) {
      throw new Error(`Expected "Create Resident Tenant Account", got: "${headingText}"`);
    }

    // 4. Test "Already have an account? Log In" link returns with Resident Tenant selected
    console.log('Step 4: Testing "Already have an account? Log In" link...');
    const backToLoginLink = await page.$('.border-t a');
    await backToLoginLink.click();
    await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_returned_to_login.png') });

    const returnedFooterText = await page.$eval('.border-t', el => el.innerText.trim());
    console.log(`Step 4 Result: After return, footer is: "${returnedFooterText}"`);
    if (!returnedFooterText.includes('New resident tenant? Create Account')) {
      throw new Error(`Expected return to have Resident Tenant active, but got: "${returnedFooterText}"`);
    }

    // 5. Navigate back to Register Tenant & Fill Form
    console.log('Step 5: Filling out Tenant Registration Form...');
    const createAccountLink2 = await page.$('.border-t a');
    await createAccountLink2.click();
    await page.waitForSelector('input[placeholder="Aarav Sharma"]', { timeout: 5000 });

    const uniqueEmail = `test_tenant_${Date.now()}@example.com`;
    await page.type('input[placeholder="Aarav Sharma"]', 'Rohit Verma');
    await page.type('input[placeholder="aarav@example.com"]', uniqueEmail);
    await page.type('input[placeholder="+91 9876543210"]', '+91 9876543210');
    
    // Type password & confirm password
    const passwordInputs = await page.$$('input[type="password"]');
    await passwordInputs[0].type('StrongPass@123');
    await passwordInputs[1].type('StrongPass@123');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_form_filled.png') });

    // Submit form
    console.log('Step 6: Submitting registration form...');
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    // Wait for redirect to login page
    await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_redirected_to_login.png') });

    const loginEmailVal = await page.$eval('input[type="email"]', el => el.value);
    console.log(`Step 6 Result: Redirected to login with pre-filled email: "${loginEmailVal}"`);

    // 7. Enter password and Log In as Tenant
    console.log('Step 7: Logging in as the newly registered tenant...');
    await page.type('input[type="password"]', 'StrongPass@123');
    const loginSubmitBtn = await page.$('button[type="submit"]');
    await loginSubmitBtn.click();

    // Wait for redirect to dashboard
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_tenant_dashboard.png') });

    const finalUrl = page.url();
    console.log(`Step 7 Result: Final Dashboard URL: ${finalUrl}`);
    if (!finalUrl.includes('/dashboard/tenant') && finalUrl !== 'http://localhost:5173/') {
      throw new Error(`Expected tenant dashboard, got: ${finalUrl}`);
    }

    console.log('\n🎉 ALL BROWSER UI WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ Browser UI Test Error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserTest();

const puppeteer = require('puppeteer-core');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate simple 10x10 colored PNG buffers
function createSolidPng(r, g, b) {
  // 1x1 pixel base64 PNG template
  const redPng = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJAD/6gh3dfAAAAAElFTkSuQmCC';
  const bluePng = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M/wHwMDwzhqkL4KAYeAD/4351vDAAAAAElFTkSuQmCC';
  return r > b ? Buffer.from(redPng, 'base64') : Buffer.from(bluePng, 'base64');
}

async function runProfilePictureTest() {
  console.log('========================================================');
  console.log('🚀 TESTING PROFILE PICTURE PERSISTENCE FOR OWNER & TENANT');
  console.log('========================================================\n');

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

  // Connect to DB for direct inspection
  const conn = await mongoose.createConnection(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/leasify').asPromise();
  const Owner = conn.model('Owner', require('./models/Owner').schema);
  const Tenant = conn.model('Tenant', require('./models/Tenant').schema);

  // Prepare test files
  const imageAPath = path.join(__dirname, 'test_image_A.png');
  const imageBPath = path.join(__dirname, 'test_image_B.png');
  fs.writeFileSync(imageAPath, createSolidPng(255, 0, 0)); // Red
  fs.writeFileSync(imageBPath, createSolidPng(0, 0, 255)); // Blue

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Reset owner profilePhoto initially to test clean transition
    await Owner.updateOne({ email: 'dakshvashistha1369@gmail.com' }, { $set: { profilePhoto: '' } });

    // ========================================================
    // PART 1: OWNER PROFILE PICTURE TEST
    // ========================================================
    console.log('\n--- 1. Testing OWNER Profile Picture Persistence ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await delay(500);

    // Login as Owner
    await page.type('input[type="email"]', 'dakshvashistha1369@gmail.com');
    await page.type('input#login-password', 'Admin@123');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    console.log('Owner logged in successfully.');

    // Navigate to /profile
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
    await delay(500);

    // Get current image before upload
    const initialOwnerImg = await page.$eval('img[alt="Avatar"]', el => el.src);
    console.log('Initial Owner avatar src:', initialOwnerImg);

    // Upload Image A
    console.log('Uploading Image A for Owner...');
    const fileInput = await page.$('input[type="file"]');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/upload-photo') && res.status() === 200, { timeout: 15000 }),
      fileInput.uploadFile(imageAPath)
    ]);
    await delay(500);

    // Check UI immediately
    const ownerImgAfterA = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(ownerImgAfterA !== initialOwnerImg, `Owner Avatar updated in UI after uploading Image A (New src: ${ownerImgAfterA})`);

    // Verify MongoDB directly
    const ownerDocA = await Owner.findOne({ email: 'dakshvashistha1369@gmail.com' });
    assert(ownerDocA.profilePhoto && ownerDocA.profilePhoto.length > 5, `MongoDB contains persistent profilePhoto for Owner: ${ownerDocA.profilePhoto}`);
    assert(!ownerDocA.profilePhoto.startsWith('blob:'), 'MongoDB does NOT contain a temporary blob URL');

    // Refresh page
    console.log('Refreshing browser page...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await delay(1000);

    const ownerImgAfterRefresh = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(ownerImgAfterRefresh.includes(ownerDocA.profilePhoto) || ownerDocA.profilePhoto.includes(ownerImgAfterRefresh) || ownerImgAfterRefresh !== initialOwnerImg, `Owner avatar retained Image A after page refresh! (Current src: ${ownerImgAfterRefresh})`);

    // Logout and Log in again
    console.log('Logging out Owner...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await delay(500);

    console.log('Logging back in as Owner...');
    await page.type('input[type="email"]', 'dakshvashistha1369@gmail.com');
    await page.type('input#login-password', 'Admin@123');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });

    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
    await delay(800);
    const ownerImgAfterReLogin = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(ownerImgAfterReLogin !== initialOwnerImg, `Owner avatar persisted across full logout/re-login: ${ownerImgAfterReLogin}`);

    // Upload Image B (replace Image A)
    console.log('Uploading Image B to replace Image A for Owner...');
    const fileInput2 = await page.$('input[type="file"]');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/upload-photo') && res.status() === 200, { timeout: 15000 }),
      fileInput2.uploadFile(imageBPath)
    ]);
    await delay(500);

    const ownerDocB = await Owner.findOne({ email: 'dakshvashistha1369@gmail.com' });
    assert(ownerDocB.profilePhoto !== ownerDocA.profilePhoto, `MongoDB updated to Image B: ${ownerDocB.profilePhoto}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await delay(1000);
    const ownerImgAfterRefreshB = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(ownerImgAfterRefreshB !== ownerImgAfterRefresh, 'Owner avatar retained Image B after refresh!');

    // ========================================================
    // PART 2: TENANT PROFILE PICTURE TEST
    // ========================================================
    console.log('\n--- 2. Testing TENANT Profile Picture Persistence ---');
    const testTenantEmail = 'pooja.tenant@example.com';
    let testTenant = await Tenant.findOne({ email: testTenantEmail });
    if (!testTenant) {
      console.log('Registering a tenant for testing...');
      const regRes = await (await fetch('http://localhost:5001/api/v1/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pooja Verma',
          email: testTenantEmail,
          password: 'Password@123',
          phone: '+91 9876543211'
        })
      })).json();
      testTenant = await Tenant.findOne({ email: testTenantEmail });
    } else {
      await Tenant.updateOne({ email: testTenantEmail }, { $set: { profilePhoto: '' } });
    }
    console.log(`Using Tenant: ${testTenant.email}`);

    // Logout
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5173/login?role=tenant', { waitUntil: 'domcontentloaded' });
    await delay(500);

    // Switch to Resident Tenant tab
    const tabButtons = await page.$$('button');
    for (const b of tabButtons) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt.includes('Resident Tenant')) {
        await b.click();
        break;
      }
    }
    await delay(300);

    await page.type('input[type="email"]', testTenant.email);
    await page.type('input#login-password', 'Password@123');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    console.log('Tenant logged in successfully.');

    // Navigate to /profile
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
    await delay(500);

    const initialTenantImg = await page.$eval('img[alt="Avatar"]', el => el.src);
    console.log('Initial Tenant avatar src:', initialTenantImg);

    // Upload Image A for Tenant
    console.log('Uploading Image A for Tenant...');
    const tenantFileInput = await page.$('input[type="file"]');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/upload-photo') && res.status() === 200, { timeout: 15000 }),
      tenantFileInput.uploadFile(imageAPath)
    ]);
    await delay(500);

    const tenantDocA = await Tenant.findById(testTenant._id);
    assert(tenantDocA.profilePhoto && tenantDocA.profilePhoto.length > 5, `MongoDB contains persistent profilePhoto for Tenant: ${tenantDocA.profilePhoto}`);
    assert(!tenantDocA.profilePhoto.startsWith('blob:'), 'Tenant MongoDB does NOT contain temporary blob URL');

    // Refresh page
    console.log('Refreshing browser page for Tenant...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await delay(1000);

    const tenantImgAfterRefresh = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(tenantImgAfterRefresh !== initialTenantImg, `Tenant avatar retained Image A after page refresh! (Current: ${tenantImgAfterRefresh})`);

    // Logout and Re-login Tenant
    console.log('Logging out Tenant...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:5173/login?role=tenant', { waitUntil: 'domcontentloaded' });
    await delay(500);

    // Select Resident Tenant tab
    const tabButtons2 = await page.$$('button');
    for (const b of tabButtons2) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt.includes('Resident Tenant')) {
        await b.click();
        break;
      }
    }
    await delay(300);

    await page.type('input[type="email"]', testTenant.email);
    await page.type('input#login-password', 'Password@123');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });

    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
    await delay(800);
    const tenantImgAfterReLogin = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(tenantImgAfterReLogin !== initialTenantImg, `Tenant avatar persisted across full logout/re-login: ${tenantImgAfterReLogin}`);

    // Upload Image B for Tenant (replace Image A)
    console.log('Uploading Image B for Tenant...');
    const tenantFileInput2 = await page.$('input[type="file"]');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/upload-photo') && res.status() === 200, { timeout: 15000 }),
      tenantFileInput2.uploadFile(imageBPath)
    ]);
    await delay(500);

    const tenantDocB = await Tenant.findById(testTenant._id);
    assert(tenantDocB.profilePhoto !== tenantDocA.profilePhoto, `MongoDB updated to Image B for Tenant: ${tenantDocB.profilePhoto}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await delay(1000);
    const tenantImgAfterRefreshB = await page.$eval('img[alt="Avatar"]', el => el.src);
    assert(tenantImgAfterRefreshB !== tenantImgAfterRefresh, 'Tenant avatar retained Image B after refresh!');

    console.log('\n========================================================');
    console.log(`PROFILE PICTURE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (fs.existsSync(imageAPath)) fs.unlinkSync(imageAPath);
    if (fs.existsSync(imageBPath)) fs.unlinkSync(imageBPath);
    await browser.close();
    await conn.close();
  }
}

runProfilePictureTest();

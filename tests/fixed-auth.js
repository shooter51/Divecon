const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = 'https://diveelitebelize.com';

(async () => {
  console.log('🚀 Starting authentication process...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to admin page
    console.log('1️⃣  Navigating to admin page...');
    await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 2: Click "Sign In with Cognito" button
    console.log('2️⃣  Clicking Sign In with Cognito...');
    await page.click('button:has-text("Sign In with Cognito")');

    // Step 3: Wait for Cognito login page
    console.log('3️⃣  Waiting for Cognito login page...');
    await page.waitForURL(/.*cognito.*/, { timeout: 10000 });
    console.log('   ✅ Cognito page loaded');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 4: Fill credentials - use visible input only
    console.log('4️⃣  Filling in username (visible input only)...');
    await page.fill('input[name="username"]:visible', ADMIN_USERNAME);

    console.log('5️⃣  Filling in password (visible input only)...');
    await page.fill('input[name="password"]:visible', ADMIN_PASSWORD);

    // Step 5: Submit
    console.log('6️⃣  Submitting login form...');
    await page.click('input[name="signInSubmitButton"]');

    // Step 6: Wait for redirect back
    console.log('7️⃣  Waiting for redirect back to app...');
    await page.waitForURL(url => url.includes(BASE_URL), { timeout: 20000 });
    console.log('   ✅ Redirected to:', page.url());

    // Step 7: Wait for hash to be processed
    console.log('8️⃣  Waiting for authentication to complete...');
    await page.waitForTimeout(3000);

    // Step 8: Check if we're authenticated
    console.log('9️⃣  Verifying authentication...');
    const authStatus = await page.evaluate(() => {
      const idToken = sessionStorage.getItem('id_token') || localStorage.getItem('id_token');
      const accessToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');

      return {
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
        idTokenPreview: idToken ? idToken.substring(0, 30) + '...' : 'none',
        sessionKeys: Object.keys(sessionStorage),
        localKeys: Object.keys(localStorage)
      };
    });

    console.log('   Auth Status:', JSON.stringify(authStatus, null, 2));

    if (!authStatus.hasIdToken && !authStatus.hasAccessToken) {
      throw new Error('No authentication tokens found! Login may have failed.');
    }

    console.log('   ✅ Authentication tokens found!');

    // Step 9: Navigate to admin page to verify
    console.log('🔟 Navigating to admin dashboard...');
    await page.goto(`${BASE_URL}/#admin`);
    await page.waitForTimeout(2000);

    const dashboardCheck = await page.evaluate(() => {
      const hasLogout = document.body.textContent.includes('Logout');
      const hasRefresh = document.body.textContent.includes('Refresh');
      const hasExport = document.body.textContent.includes('Export');
      return { hasLogout, hasRefresh, hasExport };
    });

    console.log('   Dashboard check:', dashboardCheck);

    // Step 10: Save authentication state
    console.log('1️⃣1️⃣  Saving authentication state...');
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({
      path: path.join(authDir, 'admin.json')
    });

    console.log('   ✅ Saved to .auth/admin.json\n');
    console.log('✨ SUCCESS! Authentication complete!\n');
    console.log('You can now run: npm test\n');

  } catch (error) {
    console.error('\n❌ Authentication failed:', error.message);
    console.error('\nCurrent URL:', page.url());

    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'auth-error.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('Screenshot saved to:', screenshotPath);

    throw error;
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();

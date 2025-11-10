const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = 'https://diveelitebelize.com';

(async () => {
  console.log('🚀 Starting authentication process...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to admin page
    console.log('1️⃣  Navigating to admin page...');
    await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 2: Click "Sign In with Cognito" button
    console.log('2️⃣  Clicking Sign In with Cognito...');
    await page.click('button:has-text("Sign In with Cognito")');

    // Step 3: Wait for Cognito login page
    console.log('3️⃣  Waiting for Cognito login page...');
    await page.waitForURL(/.*cognito.*/, { timeout: 10000 });
    console.log('   ✅ Cognito page loaded:', page.url());

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Step 4: Fill username (using nth(1) to get the visible element)
    console.log('4️⃣  Filling in username...');
    await page.locator('input[name="username"]').nth(1).fill(ADMIN_USERNAME);
    console.log('   ✅ Username filled');

    // Step 5: Fill password (using nth(1) to get the visible element)
    console.log('5️⃣  Filling in password...');
    await page.locator('input[name="password"]').nth(1).fill(ADMIN_PASSWORD);
    console.log('   ✅ Password filled');

    // Step 6: Submit (using nth(1) to get the visible button)
    console.log('6️⃣  Submitting login form...');
    await page.locator('input[name="signInSubmitButton"]').nth(1).click();

    // Step 7: Wait for redirect back
    console.log('7️⃣  Waiting for redirect back to app...');
    await page.waitForURL(`${BASE_URL}/**`, { timeout: 20000 });
    console.log('   ✅ Redirected to:', page.url());

    // Step 8: Wait for authentication to complete
    console.log('8️⃣  Waiting for authentication to complete...');
    await page.waitForTimeout(3000);

    // Step 9: Check if we're authenticated
    console.log('9️⃣  Verifying authentication...');
    const authStatus = await page.evaluate(() => {
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const idToken = sessionStorage.getItem('id_token') || localStorage.getItem('id_token');
      const accessToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');

      return {
        hasAuthToken: !!authToken,
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
        authTokenPreview: authToken ? authToken.substring(0, 30) + '...' : 'none',
        sessionKeys: Object.keys(sessionStorage),
        localKeys: Object.keys(localStorage)
      };
    });

    console.log('   Auth Status:', JSON.stringify(authStatus, null, 2));

    if (!authStatus.hasAuthToken && !authStatus.hasIdToken && !authStatus.hasAccessToken) {
      throw new Error('No authentication tokens found! Login may have failed.');
    }

    console.log('   ✅ Authentication tokens found!');

    // Step 10: Navigate to admin page to verify (IMPORTANT: must be on diveelitebelize.com domain)
    console.log('🔟 Ensuring we are on the correct domain...');

    // The page should already be redirected to BASE_URL/#admin
    // But let's make sure we're on the right page for storage state capture
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (!currentUrl.includes('diveelitebelize.com')) {
      console.log('   Navigating explicitly to admin page...');
      await page.goto(`${BASE_URL}/#admin`);
    }

    await page.waitForTimeout(2000);

    const dashboardCheck = await page.evaluate(() => {
      const hasLogout = document.body.textContent.includes('Logout');
      const hasRefresh = document.body.textContent.includes('Refresh');
      const hasExport = document.body.textContent.includes('Export');
      return { hasLogout, hasRefresh, hasExport };
    });

    console.log('   Dashboard check:', dashboardCheck);

    // Step 11: Save authentication state (must be on diveelitebelize.com domain!)
    console.log('1️⃣1️⃣  Saving authentication state...');

    // Verify we have the token in the right domain
    const storageCheck = await page.evaluate(() => {
      return {
        currentDomain: window.location.hostname,
        hasAuthToken: !!sessionStorage.getItem('authToken'),
        authTokenPreview: sessionStorage.getItem('authToken')?.substring(0, 30) + '...'
      };
    });

    console.log('   Storage check before save:', storageCheck);

    if (!storageCheck.hasAuthToken) {
      throw new Error('authToken not found in sessionStorage on current domain!');
    }

    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({
      path: path.join(authDir, 'admin.json')
    });

    console.log('   ✅ Saved to .auth/admin.json\n');

    // Verify what was saved
    const savedState = JSON.parse(fs.readFileSync(path.join(authDir, 'admin.json'), 'utf8'));
    const hasDiveEliteOrigin = savedState.origins?.some(o => o.origin.includes('diveelitebelize.com'));
    const hasAuthTokenInState = savedState.origins?.some(o =>
      o.localStorage?.some(item => item.name === 'authToken') ||
      o.sessionStorage?.some(item => item.name === 'authToken')
    );

    console.log('   Saved state verification:');
    console.log('     - Has diveelitebelize.com origin:', hasDiveEliteOrigin);
    console.log('     - Has authToken in state:', hasAuthTokenInState);
    console.log('     - Total origins:', savedState.origins?.length || 0);

    // IMPORTANT: Also save the raw authToken to a file since Playwright doesn't persist sessionStorage
    const authToken = await page.evaluate(() => sessionStorage.getItem('authToken'));
    fs.writeFileSync(path.join(authDir, '../.auth-token.txt'), authToken, 'utf8');
    console.log('   ✅ Also saved raw token to .auth-token.txt for test fixtures\n');

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

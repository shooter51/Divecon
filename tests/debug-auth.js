const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = 'https://diveelitebelize.com';

(async () => {
  console.log('🔍 Starting debug authentication process...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to admin page
    console.log('1️⃣  Navigating to admin page...');
    await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click Sign In button
    console.log('2️⃣  Clicking Sign In with Cognito...');
    await page.click('button:has-text("Sign In with Cognito")');

    // Wait for Cognito page
    console.log('3️⃣  Waiting for Cognito login page...');
    await page.waitForURL(/.*cognito.*/, { timeout: 10000 });
    console.log('   ✅ Cognito page loaded:', page.url());

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // DEBUG: List all input elements
    console.log('\n🔍 DEBUG: Examining all input elements on page...');
    const inputs = await page.locator('input').all();
    console.log(`   Found ${inputs.length} input elements total\n`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const visible = await input.isVisible();
      const placeholder = await input.getAttribute('placeholder');

      console.log(`   Input ${i}:`);
      console.log(`     - name: ${name}`);
      console.log(`     - id: ${id}`);
      console.log(`     - type: ${type}`);
      console.log(`     - visible: ${visible}`);
      console.log(`     - placeholder: ${placeholder}\n`);
    }

    // Try multiple selector strategies
    console.log('4️⃣  Attempting to fill username with different strategies...\n');

    // Strategy 1: Use ID selector
    console.log('   Strategy 1: Using #signInFormUsername...');
    try {
      const usernameById = page.locator('#signInFormUsername');
      const visibleById = await usernameById.isVisible();
      console.log(`     Visible: ${visibleById}`);
      if (visibleById) {
        await usernameById.fill(ADMIN_USERNAME);
        console.log('     ✅ Success with ID selector!');
      }
    } catch (e) {
      console.log('     ❌ Failed:', e.message);
    }

    // Strategy 2: Use nth(1) to get second element
    console.log('\n   Strategy 2: Using input[name="username"].nth(1)...');
    try {
      const usernameSecond = page.locator('input[name="username"]').nth(1);
      const visibleSecond = await usernameSecond.isVisible();
      console.log(`     Visible: ${visibleSecond}`);
      if (visibleSecond) {
        await usernameSecond.fill(ADMIN_USERNAME);
        console.log('     ✅ Success with nth(1) selector!');
      }
    } catch (e) {
      console.log('     ❌ Failed:', e.message);
    }

    // Strategy 3: Force fill on first element
    console.log('\n   Strategy 3: Using force: true on first element...');
    try {
      await page.fill('input[name="username"]', ADMIN_USERNAME, { force: true });
      console.log('     ✅ Success with force fill!');
    } catch (e) {
      console.log('     ❌ Failed:', e.message);
    }

    // Strategy 4: Wait for visible state first
    console.log('\n   Strategy 4: Wait for input to become visible...');
    try {
      await page.waitForSelector('input[name="username"]:visible', { timeout: 5000 });
      await page.fill('input[name="username"]:visible', ADMIN_USERNAME);
      console.log('     ✅ Success after waiting for visible!');
    } catch (e) {
      console.log('     ❌ Failed:', e.message);
    }

    // Check if any strategy worked
    const usernameValue = await page.evaluate(() => {
      const input = document.querySelector('input[name="username"]') ||
                    document.querySelector('#signInFormUsername');
      return input ? input.value : '';
    });

    console.log(`\n   Current username field value: "${usernameValue}"`);

    if (usernameValue === ADMIN_USERNAME) {
      console.log('   ✅ Username filled successfully!\n');

      // Now try password
      console.log('5️⃣  Filling password...');
      try {
        await page.fill('input[name="password"]', ADMIN_PASSWORD, { force: true });
        console.log('   ✅ Password filled!\n');

        // Submit
        console.log('6️⃣  Submitting form...');
        await page.click('input[name="signInSubmitButton"]');

        // Wait for redirect
        console.log('7️⃣  Waiting for redirect...');
        await page.waitForURL(url => url.includes(BASE_URL), { timeout: 20000 });
        console.log('   ✅ Redirected to:', page.url());

        // Wait for auth tokens
        await page.waitForTimeout(3000);

        // Check tokens
        const authStatus = await page.evaluate(() => {
          const idToken = sessionStorage.getItem('id_token') || localStorage.getItem('id_token');
          const accessToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
          return {
            hasIdToken: !!idToken,
            hasAccessToken: !!accessToken
          };
        });

        console.log('8️⃣  Auth status:', authStatus);

        if (authStatus.hasIdToken || authStatus.hasAccessToken) {
          console.log('   ✅ Tokens found!\n');

          // Save state
          console.log('9️⃣  Saving authentication state...');
          const authDir = path.join(__dirname, '.auth');
          if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
          }

          await context.storageState({
            path: path.join(authDir, 'admin.json')
          });

          console.log('   ✅ Saved to .auth/admin.json\n');
          console.log('✨ SUCCESS! Authentication complete!\n');
        } else {
          throw new Error('No auth tokens found after login');
        }
      } catch (e) {
        console.log('   ❌ Failed during login flow:', e.message);
      }
    } else {
      console.log('   ❌ Could not fill username field with any strategy\n');
    }

  } catch (error) {
    console.error('\n❌ Authentication failed:', error.message);
    console.error('Current URL:', page.url());

    const screenshotPath = path.join(__dirname, 'debug-error.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('Screenshot saved to:', screenshotPath);
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();

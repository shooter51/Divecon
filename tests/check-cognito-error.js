const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = 'https://diveelitebelize.com';

(async () => {
  console.log('🔍 Checking for Cognito errors...\n');

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

    // Fill credentials
    console.log('4️⃣  Filling in credentials...');
    await page.locator('input[name="username"]').nth(1).fill(ADMIN_USERNAME);
    await page.locator('input[name="password"]').nth(1).fill(ADMIN_PASSWORD);
    console.log('   ✅ Credentials filled');

    // Take screenshot before submit
    await page.screenshot({ path: path.join(__dirname, 'before-submit.png'), fullPage: true });
    console.log('   📸 Screenshot saved: before-submit.png');

    // Submit
    console.log('5️⃣  Submitting login form...');
    await page.locator('input[name="signInSubmitButton"]').nth(1).click();

    // Wait a bit to see if error appears
    await page.waitForTimeout(3000);

    // Check current URL - did we get redirected or stay on Cognito?
    const currentUrl = page.url();
    console.log('\n📍 Current URL after submit:', currentUrl);

    if (currentUrl.includes('cognito')) {
      console.log('\n⚠️  Still on Cognito page - checking for errors...\n');

      // Take screenshot of error state
      await page.screenshot({ path: path.join(__dirname, 'after-submit-error.png'), fullPage: true });
      console.log('   📸 Screenshot saved: after-submit-error.png');

      // Check for error messages
      const errorText = await page.evaluate(() => {
        // Look for common error containers
        const selectors = [
          '.error-message',
          '.alert-error',
          '[role="alert"]',
          '.banner-customizable',
          '#errorMessage',
          '.error'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            return {
              selector: selector,
              text: element.textContent.trim()
            };
          }
        }

        // Get all visible text on page
        const bodyText = document.body.textContent;
        if (bodyText.toLowerCase().includes('error') ||
            bodyText.toLowerCase().includes('incorrect') ||
            bodyText.toLowerCase().includes('invalid')) {
          return {
            selector: 'body',
            text: 'Page contains error-related text - check screenshot'
          };
        }

        return null;
      });

      if (errorText) {
        console.log('   ❌ Error found:');
        console.log('      Selector:', errorText.selector);
        console.log('      Message:', errorText.text);
      } else {
        console.log('   ℹ️  No obvious error message found - check screenshot');
      }

      // Get the page title
      const title = await page.title();
      console.log('\n   Page title:', title);

    } else {
      console.log('\n✅ Redirected away from Cognito to:', currentUrl);

      // Wait for hash processing
      await page.waitForTimeout(3000);

      // Check URL hash for tokens
      const urlHash = await page.evaluate(() => window.location.hash);
      console.log('\n   URL hash:', urlHash.substring(0, 100) + (urlHash.length > 100 ? '...' : ''));

      // Check sessionStorage
      const storage = await page.evaluate(() => {
        return {
          sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
            acc[key] = sessionStorage.getItem(key)?.substring(0, 50) + '...';
            return acc;
          }, {}),
          localStorage: Object.keys(localStorage).reduce((acc, key) => {
            acc[key] = localStorage.getItem(key)?.substring(0, 50) + '...';
            return acc;
          }, {})
        };
      });

      console.log('\n   Storage contents:', JSON.stringify(storage, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    const screenshotPath = path.join(__dirname, 'check-error.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('Screenshot saved to:', screenshotPath);
  } finally {
    console.log('\n\nKeeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();

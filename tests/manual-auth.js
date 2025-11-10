/**
 * Manual Authentication Helper
 * Run this to authenticate and save the session state
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = 'https://diveelitebelize.com';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to admin page...');
    await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle' });

    console.log('Waiting for Admin Login button...');
    await page.waitForSelector('text=Admin Login', { timeout: 10000 });
    await page.click('text=Admin Login');

    console.log('Waiting for Cognito hosted UI...');
    await page.waitForURL(/.*cognito.*/, { timeout: 15000 });

    console.log('Entering credentials...');
    await page.fill('input[name="username"]', ADMIN_USERNAME);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    console.log('Submitting login form...');
    await page.click('input[type="submit"], button[type="submit"]');

    console.log('Waiting for redirect back to admin dashboard...');
    await page.waitForURL(`${BASE_URL}/**`, { timeout: 20000 });

    // Wait a bit for the page to fully load
    await page.waitForTimeout(3000);

    console.log('Checking for admin dashboard...');
    const dashboardVisible = await page.locator('text=Admin Dashboard, text=Logout, text=Refresh').count() > 0;

    if (!dashboardVisible) {
      console.log('Dashboard not visible yet, waiting longer...');
      await page.waitForTimeout(5000);
    }

    console.log('Verifying authentication token...');
    const hasToken = await page.evaluate(() => {
      const token = sessionStorage.getItem('id_token') ||
                    sessionStorage.getItem('access_token') ||
                    localStorage.getItem('id_token') ||
                    localStorage.getItem('access_token');
      console.log('Token found:', token ? 'YES' : 'NO');
      return token !== null;
    });

    if (!hasToken) {
      throw new Error('No authentication token found in storage!');
    }

    console.log('✅ Authentication successful!');
    console.log('Saving authentication state...');

    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({
      path: path.join(authDir, 'admin.json')
    });

    console.log('✅ Authentication state saved to .auth/admin.json');
    console.log('\nYou can now close the browser and run your tests!');
    console.log('Run: npm test');

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error(error.stack);
  } finally {
    // Don't close automatically so user can see the result
    console.log('\nPress Ctrl+C to close the browser...');
    await new Promise(() => {}); // Keep alive
  }
})();

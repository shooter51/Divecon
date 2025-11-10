/**
 * Custom Playwright fixture for admin authentication
 *
 * Since the app stores authToken in sessionStorage (which Playwright doesn't persist),
 * we need to manually inject it before each test.
 */

const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Read the saved auth token from our manual auth script
const getAuthToken = () => {
  const authScriptPath = path.join(__dirname, '../.auth-token.txt');

  if (fs.existsSync(authScriptPath)) {
    return fs.readFileSync(authScriptPath, 'utf8').trim();
  }

  throw new Error(
    'No auth token found! Please run: node working-auth.js to authenticate first'
  );
};

// Extend base test with authenticated context
const test = base.test.extend({
  authenticatedPage: async ({ page }, use) => {
    // Get the auth token
    const authToken = getAuthToken();

    // Navigate to the base URL first
    await page.goto('/');

    // Inject the auth token into sessionStorage
    await page.evaluate((token) => {
      sessionStorage.setItem('authToken', token);
    }, authToken);

    // Now use the authenticated page
    await use(page);
  },
});

module.exports = { test, expect: base.expect };

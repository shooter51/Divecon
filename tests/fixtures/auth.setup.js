/**
 * Authentication setup for Playwright tests
 * This file handles Cognito authentication and saves the session state
 */

const { test as setup, expect } = require('@playwright/test');
const { adminCredentials, waitTimes } = require('./test-data');
const path = require('path');

const authFile = path.join(__dirname, '../.auth/admin.json');

setup('authenticate as admin', async ({ page, context }) => {
  console.log('Starting admin authentication...');

  // Navigate to the site
  await page.goto('/');

  // Click Admin Login link
  await page.click('text=Admin Login');
  await page.waitForURL(/.*#admin/, { timeout: waitTimes.medium });

  // Click login with Cognito button
  await page.click('button:has-text("Login with Cognito")');

  // Wait for Cognito hosted UI to load
  await page.waitForURL(/.*amazoncognito\.com.*/, { timeout: waitTimes.cognitoRedirect });

  console.log('Cognito login page loaded');

  // Fill in credentials
  await page.fill('input[name="username"]', adminCredentials.username);
  await page.fill('input[name="password"]', adminCredentials.password);

  // Click sign in
  await page.click('input[type="submit"][name="signInSubmitButton"]');

  // Handle password change if this is first login
  try {
    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    console.log('First login detected - changing password');

    await page.fill('input[name="password"]', adminCredentials.newPassword);
    await page.fill('input[name="confirmPassword"]', adminCredentials.newPassword);
    await page.click('input[type="submit"]');

    // Update password for subsequent tests
    adminCredentials.password = adminCredentials.newPassword;
  } catch (e) {
    console.log('No password change required');
  }

  // Wait for redirect back to site
  await page.waitForURL(/.*diveelitebelize\.com.*#admin/, { timeout: waitTimes.cognitoRedirect });

  console.log('Redirected back to admin dashboard');

  // Verify we're on the admin page
  await expect(page.locator('h1')).toContainText('Lead Management');

  // Wait for leads to load
  await page.waitForSelector('table', { timeout: waitTimes.apiResponse });

  console.log('Admin authentication successful');

  // Save authenticated state
  await context.storageState({ path: authFile });
});

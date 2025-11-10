/**
 * Authentication Setup for Admin Tests
 * Logs into Cognito and saves the authentication state
 */

const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN_USERNAME = 'admin@eliteadventuresbelize.com';
const ADMIN_PASSWORD = 'wbt2CGP2cxy_tqg1zqf';
const BASE_URL = process.env.BASE_URL || 'https://diveelitebelize.com';

setup('authenticate as admin', async ({ page }) => {
  // Navigate to admin page
  await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle' });

  console.log('Navigating to admin page...');

  // Wait for and click the admin login button
  await page.waitForSelector('text=Admin Login', { timeout: 10000 });
  await page.click('text=Admin Login');

  console.log('Clicked Admin Login, waiting for Cognito...');

  // Wait for Cognito hosted UI to load
  await page.waitForURL(/.*cognito.*/, { timeout: 15000 });

  console.log('Cognito UI loaded, entering credentials...');

  // Fill in credentials on Cognito hosted UI
  await page.fill('input[name="username"]', ADMIN_USERNAME);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);

  console.log('Submitting login...');

  // Submit the login form
  await page.click('input[type="submit"], button[type="submit"]');

  // Wait for redirect back to the admin dashboard
  console.log('Waiting for redirect back to admin...');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });

  // Wait for the admin dashboard to load
  await page.waitForSelector('text=Admin Dashboard, text=Logout, text=Refresh', { timeout: 10000 });

  console.log('Successfully authenticated! Checking for auth token...');

  // Verify we have an auth token
  const hasToken = await page.evaluate(() => {
    return sessionStorage.getItem('id_token') !== null ||
           sessionStorage.getItem('access_token') !== null ||
           localStorage.getItem('id_token') !== null ||
           localStorage.getItem('access_token') !== null;
  });

  expect(hasToken).toBeTruthy();

  console.log('Auth token verified! Saving authentication state...');

  // Save the authenticated state
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.context().storageState({
    path: path.join(authDir, 'admin.json')
  });

  console.log('Authentication state saved to .auth/admin.json');
});

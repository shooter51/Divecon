/**
 * E2E Tests for Admin Authentication
 * Tests Cognito OAuth flow and session management
 */

const { test, expect } = require('@playwright/test');
const { adminCredentials, selectors, waitTimes } = require('../fixtures/test-data');

test.describe.skip('Admin Authentication', () => {

  test('should show admin login link', async ({ page }) => {
    await page.goto('/');

    const adminLink = page.locator(selectors.admin.loginButton);
    await expect(adminLink).toBeVisible();
  });

  test('should navigate to admin page on hash change', async ({ page }) => {
    await page.goto('/');

    // Click admin login link
    await page.click(selectors.admin.loginButton);

    // Should navigate to #admin
    await page.waitForURL(/.*#admin/, { timeout: waitTimes.medium });

    // Should show login button
    await expect(page.locator('button:has-text("Login with Cognito")')).toBeVisible();
  });

  test('should redirect to Cognito hosted UI', async ({ page }) => {
    await page.goto('/#admin');

    // Click login button
    await page.click('button:has-text("Login with Cognito")');

    // Should redirect to Cognito
    await page.waitForURL(/.*amazoncognito\.com.*/, {
      timeout: waitTimes.cognitoRedirect
    });

    // Should show Cognito login form
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/#admin');
    await page.click('button:has-text("Login with Cognito")');

    await page.waitForURL(/.*amazoncognito\.com.*/, {
      timeout: waitTimes.cognitoRedirect
    });

    // Try with wrong password
    await page.fill('input[name="username"]', adminCredentials.username);
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('input[type="submit"][name="signInSubmitButton"]');

    // Should show error message
    await expect(page.locator('text=Incorrect username or password')).toBeVisible({
      timeout: waitTimes.medium
    });
  });

  test('should successfully authenticate with valid credentials', async ({ page }) => {
    await page.goto('/#admin');
    await page.click('button:has-text("Login with Cognito")');

    await page.waitForURL(/.*amazoncognito\.com.*/, {
      timeout: waitTimes.cognitoRedirect
    });

    await page.fill('input[name="username"]', adminCredentials.username);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('input[type="submit"][name="signInSubmitButton"]');

    // Should redirect back to app
    await page.waitForURL(/.*diveelitebelize\.com.*#admin/, {
      timeout: waitTimes.cognitoRedirect
    });

    // Should show admin dashboard
    await expect(page.locator('h1')).toContainText('Lead Management');
  });

  test('should store auth token in sessionStorage', async ({ page }) => {
    await page.goto('/#admin');
    await page.click('button:has-text("Login with Cognito")');

    await page.waitForURL(/.*amazoncognito\.com.*/, {
      timeout: waitTimes.cognitoRedirect
    });

    await page.fill('input[name="username"]', adminCredentials.username);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('input[type="submit"][name="signInSubmitButton"]');

    await page.waitForURL(/.*diveelitebelize\.com.*#admin/, {
      timeout: waitTimes.cognitoRedirect
    });

    // Check sessionStorage for auth token
    const authToken = await page.evaluate(() => sessionStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
    expect(authToken.length).toBeGreaterThan(100); // JWT tokens are long
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    await page.goto('/#admin');
    await page.click('button:has-text("Login with Cognito")');

    await page.waitForURL(/.*amazoncognito\.com.*/, {
      timeout: waitTimes.cognitoRedirect
    });

    await page.fill('input[name="username"]', adminCredentials.username);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('input[type="submit"][name="signInSubmitButton"]');

    await page.waitForURL(/.*diveelitebelize\.com.*#admin/, {
      timeout: waitTimes.cognitoRedirect
    });

    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Lead Management")');

    // Reload the page
    await page.reload();

    // Should still be on admin page
    await expect(page.locator('h1')).toContainText('Lead Management');
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.goto('/#admin');
    await page.click('button:has-text("Login with Cognito")');
    await page.waitForURL(/.*amazoncognito\.com.*/, { timeout: waitTimes.cognitoRedirect });
    await page.fill('input[name="username"]', adminCredentials.username);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('input[type="submit"][name="signInSubmitButton"]');
    await page.waitForURL(/.*diveelitebelize\.com.*#admin/, { timeout: waitTimes.cognitoRedirect });

    // Now logout
    await page.click(selectors.admin.logoutButton);

    // Should clear auth token
    const authToken = await page.evaluate(() => sessionStorage.getItem('authToken'));
    expect(authToken).toBeNull();

    // Should redirect to public form
    await expect(page).toHaveURL(/.*\/$|.*\/#$/);
  });

  test('should not access admin without authentication', async ({ page }) => {
    await page.goto('/#admin');

    // Should show login button, not dashboard
    await expect(page.locator('button:has-text("Login with Cognito")')).toBeVisible();
    await expect(page.locator('h1:has-text("Lead Management")')).not.toBeVisible();
  });
});

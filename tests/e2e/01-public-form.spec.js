/**
 * E2E Tests for Public Lead Submission Form
 * Tests the main user-facing lead capture functionality
 */

const { test, expect } = require('@playwright/test');
const { validLead, invalidLeads, selectors, waitTimes } = require('../fixtures/test-data');

test.describe('Public Lead Submission Form', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the lead capture form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Elite Adventures Belize/);

    // Check header elements
    await expect(page.locator('h1')).toContainText('Elite Adventures Belize');
    await expect(page.locator('img.header-logo')).toBeVisible();

    // Check form fields are present
    await expect(page.locator(selectors.publicForm.firstName)).toBeVisible();
    await expect(page.locator(selectors.publicForm.lastName)).toBeVisible();
    await expect(page.locator(selectors.publicForm.email)).toBeVisible();
    await expect(page.locator(selectors.publicForm.company)).toBeVisible();
    await expect(page.locator(selectors.publicForm.submitButton)).toBeVisible();
  });

  test('should show external link to main website', async ({ page }) => {
    const link = page.locator('a[href="https://eliteadventuresbelize.com"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Visit our website');
  });

  test('should submit a valid lead successfully', async ({ page }) => {
    // Fill out the form
    await page.fill(selectors.publicForm.firstName, validLead.firstName);
    await page.fill(selectors.publicForm.lastName, validLead.lastName);
    await page.fill(selectors.publicForm.email, validLead.email);
    await page.fill(selectors.publicForm.phone, validLead.phone);
    await page.fill(selectors.publicForm.company, validLead.company);
    await page.fill(selectors.publicForm.role, validLead.role);
    await page.selectOption(selectors.publicForm.businessType, validLead.businessType);
    await page.selectOption(selectors.publicForm.tripWindow, validLead.tripWindow);
    await page.fill(selectors.publicForm.groupSize, validLead.groupSize.toString());
    await page.fill(selectors.publicForm.notes, validLead.notes);

    // Check consent boxes
    await page.check(selectors.publicForm.consentContact);
    await page.check(selectors.publicForm.consentMarketing);

    // Submit the form
    await page.click(selectors.publicForm.submitButton);

    // Wait for success message
    await page.waitForSelector(selectors.publicForm.successMessage, {
      timeout: waitTimes.apiResponse
    });

    // Verify success message
    const successMessage = page.locator(selectors.publicForm.successMessage);
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Thank You!');

    // Verify success screen elements
    await expect(page.locator('button:has-text("Submit Another")')).toBeVisible();
    await expect(page.locator('button:has-text("Add to Calendar")')).toBeVisible();

    // Click "Submit Another" to verify form restoration
    await page.click('button:has-text("Submit Another")');

    // Wait for form to be visible again
    await page.waitForSelector(selectors.publicForm.firstName);

    // Verify form was cleared (fields should be empty after clicking Submit Another)
    await expect(page.locator(selectors.publicForm.firstName)).toHaveValue('');
    await expect(page.locator(selectors.publicForm.email)).toHaveValue('');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click(selectors.publicForm.submitButton);

    // Browser native validation should prevent submission
    const firstNameInput = page.locator(selectors.publicForm.firstName);
    const validationMessage = await firstNameInput.evaluate(el => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill(selectors.publicForm.email, invalidLeads.invalidEmail.email);

    const emailInput = page.locator(selectors.publicForm.email);
    const isValid = await emailInput.evaluate(el => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('should require consent to contact', async ({ page }) => {
    // Fill all fields except consent
    await page.fill(selectors.publicForm.firstName, validLead.firstName);
    await page.fill(selectors.publicForm.lastName, validLead.lastName);
    await page.fill(selectors.publicForm.email, validLead.email);
    await page.fill(selectors.publicForm.company, validLead.company);

    // Try to submit without consent
    await page.click(selectors.publicForm.submitButton);

    // Should show validation error
    const consentCheckbox = page.locator(selectors.publicForm.consentContact);
    const isRequired = await consentCheckbox.evaluate(el => el.required);
    expect(isRequired).toBe(true);
  });

  test('should handle multiple interest selections', async ({ page }) => {
    // Select multiple interests
    const interestCheckboxes = page.locator('input[name="interests"]');
    const count = await interestCheckboxes.count();

    // Check at least 2 interests
    if (count >= 2) {
      await interestCheckboxes.nth(0).check();
      await interestCheckboxes.nth(1).check();

      expect(await interestCheckboxes.nth(0).isChecked()).toBe(true);
      expect(await interestCheckboxes.nth(1).isChecked()).toBe(true);
    }
  });

  test('should persist form data in localStorage', async ({ page }) => {
    // Fill some fields
    await page.fill(selectors.publicForm.firstName, validLead.firstName);
    await page.fill(selectors.publicForm.email, validLead.email);

    // Trigger input event to save to localStorage
    await page.locator(selectors.publicForm.email).press('Tab');

    // Wait a bit for localStorage to update
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();

    // Check if data persisted
    const firstName = await page.locator(selectors.publicForm.firstName).inputValue();
    const email = await page.locator(selectors.publicForm.email).inputValue();

    expect(firstName).toBe(validLead.firstName);
    expect(email).toBe(validLead.email);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check form is still visible and usable
    await expect(page.locator(selectors.publicForm.firstName)).toBeVisible();
    await expect(page.locator(selectors.publicForm.submitButton)).toBeVisible();

    // Try to submit a lead
    await page.fill(selectors.publicForm.firstName, validLead.firstName);
    await page.fill(selectors.publicForm.lastName, validLead.lastName);
    await page.fill(selectors.publicForm.email, validLead.email);
    await page.fill(selectors.publicForm.company, validLead.company);
    await page.check(selectors.publicForm.consentContact);

    await page.click(selectors.publicForm.submitButton);

    // Should submit successfully
    await page.waitForSelector(selectors.publicForm.successMessage, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should display service worker for PWA', async ({ page }) => {
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return registrations.length > 0;
      });
    });

    // Service worker should be registered
    expect(swRegistered).toBe(true);
  });
});

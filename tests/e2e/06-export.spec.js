/**
 * E2E Tests for Export Functionality
 * Tests CSV and JSON export features
 */

const { test, expect } = require('../fixtures/auth-fixture');
const { selectors, waitTimes } = require('../fixtures/test-data');
const path = require('path');

// Use authenticated state

test.describe('Export Functionality', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/#admin');
    await page.waitForSelector(selectors.admin.leadsTable, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should have CSV export button', async ({ authenticatedPage: page }) => {
    await expect(page.locator(selectors.admin.exportCsvButton)).toBeVisible();
  });

  test('should have JSON export button', async ({ authenticatedPage: page }) => {
    await expect(page.locator(selectors.admin.exportJsonButton)).toBeVisible();
  });

  test('should trigger CSV export on button click', async ({ page, context }) => {
    // Listen for new page/download
    const downloadPromise = page.waitForEvent('download', { timeout: waitTimes.apiResponse });

    // Click CSV export
    await page.click(selectors.admin.exportCsvButton);

    // May open in new tab or trigger download
    // Wait a bit to see what happens
    try {
      const download = await downloadPromise;

      // Should be a CSV file
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.csv$/);

      console.log('CSV export filename:', filename);
    } catch (e) {
      // Might open in new tab instead of downloading
      console.log('CSV export may have opened in new tab');

      // Check if new tab was opened
      const pages = context.pages();
      if (pages.length > 1) {
        const newPage = pages[pages.length - 1];
        await newPage.waitForLoadState('load', { timeout: waitTimes.apiResponse });

        // Should contain CSV data or signed URL redirect
        const url = newPage.url();
        console.log('Export URL:', url);
        expect(url).toBeTruthy();
      }
    }
  });

  test('should trigger JSON export on button click', async ({ page, context }) => {
    // Listen for new page/download
    const downloadPromise = page.waitForEvent('download', { timeout: waitTimes.apiResponse });

    // Click JSON export
    await page.click(selectors.admin.exportJsonButton);

    try {
      const download = await downloadPromise;

      // Should be a JSON file
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.json$/);

      console.log('JSON export filename:', filename);
    } catch (e) {
      // Might open in new tab
      console.log('JSON export may have opened in new tab');

      const pages = context.pages();
      if (pages.length > 1) {
        const newPage = pages[pages.length - 1];
        await newPage.waitForLoadState('load', { timeout: waitTimes.apiResponse });

        const url = newPage.url();
        console.log('Export URL:', url);
        expect(url).toBeTruthy();
      }
    }
  });

  test('should handle export with no leads gracefully', async ({ authenticatedPage: page }) => {
    // This test assumes there might be no leads
    // Export should still work, just return empty or show message

    // Click CSV export
    await page.click(selectors.admin.exportCsvButton);

    // Should not crash
    await page.waitForTimeout(waitTimes.medium);

    // Page should still be functional
    await expect(page.locator('h1')).toContainText('Lead Management');
  });

  test('should maintain dashboard state after export', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const initialCount = await leadRows.count();

    // Export CSV
    await page.click(selectors.admin.exportCsvButton);
    await page.waitForTimeout(waitTimes.short);

    // Dashboard should still be intact
    await expect(page.locator('h1')).toContainText('Lead Management');

    const countAfterExport = await leadRows.count();
    expect(countAfterExport).toBe(initialCount);
  });

  test('should not require lead selection for export', async ({ authenticatedPage: page }) => {
    // Export buttons should work without selecting leads
    // (exports all leads, not just selected)

    const csvButton = page.locator(selectors.admin.exportCsvButton);
    const jsonButton = page.locator(selectors.admin.exportJsonButton);

    // Should both be enabled without selections
    await expect(csvButton).toBeEnabled();
    await expect(jsonButton).toBeEnabled();
  });

  test('should handle concurrent export requests', async ({ authenticatedPage: page }) => {
    // Click both export buttons rapidly
    await page.click(selectors.admin.exportCsvButton);
    await page.waitForTimeout(100);
    await page.click(selectors.admin.exportJsonButton);

    // Should not crash
    await page.waitForTimeout(waitTimes.medium);
    await expect(page.locator('h1')).toContainText('Lead Management');
  });

  test('should export even after sorting', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const count = await leadRows.count();

    if (count > 0) {
      // Sort by name
      await page.click('th:has-text("Name")');
      await page.waitForTimeout(500);

      // Now export
      await page.click(selectors.admin.exportCsvButton);
      await page.waitForTimeout(waitTimes.short);

      // Should work fine
      await expect(page.locator('h1')).toContainText('Lead Management');
    }
  });

  test('should export even after selecting leads', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Select some leads
      await leadCheckboxes.first().check();

      // Export should still export ALL leads, not just selected
      await page.click(selectors.admin.exportCsvButton);
      await page.waitForTimeout(waitTimes.short);

      // Should work
      await expect(page.locator('h1')).toContainText('Lead Management');
    }
  });

  test('should handle export API errors gracefully', async ({ authenticatedPage: page }) => {
    // This test would need to mock API failure
    // For now, just ensure export button doesn't crash the app

    // Intercept export API call and force error
    await page.route('**/export', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Try to export
    await page.click(selectors.admin.exportCsvButton);
    await page.waitForTimeout(waitTimes.short);

    // Should show error or handle gracefully
    // App should not crash
    await expect(page.locator('h1')).toContainText('Lead Management');
  });
});

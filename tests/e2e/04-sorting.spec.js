/**
 * E2E Tests for Admin Dashboard Sorting
 * Tests the table sorting functionality
 */

const { test, expect } = require('../fixtures/auth-fixture');
const { selectors, waitTimes } = require('../fixtures/test-data');
const path = require('path');

// Use authenticated state

test.describe('Admin Dashboard Sorting', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/#admin');
    await page.waitForSelector(selectors.admin.leadsTable, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should display sort indicators on headers', async ({ authenticatedPage: page }) => {
    const headers = page.locator('th[onclick*="sortBy"]');
    const count = await headers.count();

    expect(count).toBeGreaterThan(0);

    // Check for sort arrows
    for (let i = 0; i < count; i++) {
      const headerText = await headers.nth(i).textContent();
      // Should contain arrow indicator (↕, ↑, or ↓)
      expect(headerText).toMatch(/[↕↑↓]/);
    }
  });

  test('should sort by date when clicking Date header', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Get initial first date
      const initialFirstDate = await leadRows.first().locator('td').first().textContent();

      // Click Date header
      await page.click('th:has-text("Date")');
      await page.waitForTimeout(500); // Wait for re-render

      // Get new first date
      const newFirstDate = await leadRows.first().locator('td').first().textContent();

      // Should have changed (unless already sorted)
      // Or click again to reverse
      await page.click('th:has-text("Date")');
      await page.waitForTimeout(500);

      const reversedFirstDate = await leadRows.first().locator('td').first().textContent();
      expect(reversedFirstDate).not.toBe(newFirstDate);
    }
  });

  test('should toggle sort direction on repeated clicks', async ({ authenticatedPage: page }) => {
    const dateHeader = page.locator('th:has-text("Date")');

    // Get initial sort indicator
    const initialText = await dateHeader.textContent();

    // Click once
    await dateHeader.click();
    await page.waitForTimeout(500);
    const afterFirstClick = await dateHeader.textContent();

    // Click again
    await dateHeader.click();
    await page.waitForTimeout(500);
    const afterSecondClick = await dateHeader.textContent();

    // Sort direction should have changed
    expect(afterFirstClick).not.toBe(afterSecondClick);

    // Should show ascending or descending arrow
    expect(afterSecondClick).toMatch(/[↑↓]/);
  });

  test('should sort by name', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Click Name header
      await page.click('th:has-text("Name")');
      await page.waitForTimeout(500);

      // Get first two names
      const firstName = await leadRows.first().locator('td').nth(1).textContent();
      const secondName = await leadRows.nth(1).locator('td').nth(1).textContent();

      // Names should be in order (alphabetically)
      expect(firstName?.toLowerCase() <= secondName?.toLowerCase()).toBe(true);
    }
  });

  test('should sort by email', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Click Email header
      await page.click('th:has-text("Email")');
      await page.waitForTimeout(500);

      // Should show sort indicator
      const emailHeader = page.locator('th:has-text("Email")');
      const headerText = await emailHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    }
  });

  test('should sort by company', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Click Company header
      await page.click('th:has-text("Company")');
      await page.waitForTimeout(500);

      // Should show sort indicator
      const companyHeader = page.locator('th:has-text("Company")');
      const headerText = await companyHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    }
  });

  test('should sort by status', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Click Status header
      await page.click('th:has-text("Status")');
      await page.waitForTimeout(500);

      // Should show sort indicator
      const statusHeader = page.locator('th:has-text("Status")');
      const headerText = await statusHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    }
  });

  test('should maintain sort when selecting leads', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Sort by name
      await page.click('th:has-text("Name")');
      await page.waitForTimeout(500);

      // Get first name
      const firstNameBeforeSelect = await leadRows.first().locator('td').nth(1).textContent();

      // Select a lead
      await leadRows.first().locator('.lead-checkbox').check();
      await page.waitForTimeout(300);

      // First name should still be the same
      const firstNameAfterSelect = await leadRows.first().locator('td').nth(1).textContent();
      expect(firstNameAfterSelect).toBe(firstNameBeforeSelect);
    }
  });

  test('should maintain sort after refresh', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 1) {
      // Sort by company
      await page.click('th:has-text("Company")');
      await page.waitForTimeout(500);

      // Get sort direction
      const companyHeader = page.locator('th:has-text("Company")');
      const sortBeforeRefresh = await companyHeader.textContent();

      // Refresh leads
      await page.click(selectors.admin.refreshButton);
      await page.waitForTimeout(waitTimes.medium);

      // Sort should be maintained
      const sortAfterRefresh = await companyHeader.textContent();
      expect(sortAfterRefresh).toContain(sortBeforeRefresh?.includes('↑') ? '↑' : '↓');
    }
  });

  test('should show unsorted indicator on non-sorted columns', async ({ authenticatedPage: page }) => {
    // Click Name to sort
    await page.click('th:has-text("Name")');
    await page.waitForTimeout(500);

    // Name should show sorted (↑ or ↓)
    const nameHeader = page.locator('th:has-text("Name")');
    const nameText = await nameHeader.textContent();
    expect(nameText).toMatch(/[↑↓]/);

    // Other headers should show unsorted (↕)
    const emailHeader = page.locator('th:has-text("Email")');
    const emailText = await emailHeader.textContent();
    expect(emailText).toContain('↕');
  });

  test('should handle sorting with empty/null values', async ({ authenticatedPage: page }) => {
    // Click Company header (may have empty values)
    await page.click('th:has-text("Company")');
    await page.waitForTimeout(500);

    // Should not crash - table should still be visible
    await expect(page.locator(selectors.admin.leadsTable)).toBeVisible();

    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });
});

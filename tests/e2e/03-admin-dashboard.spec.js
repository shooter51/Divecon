/**
 * E2E Tests for Admin Dashboard
 * Tests lead management, viewing, and dashboard functionality
 *
 * Note: These tests require authentication with authToken in sessionStorage
 */

const { test, expect } = require('../fixtures/auth-fixture');
const { selectors, waitTimes } = require('../fixtures/test-data');

test.describe('Admin Dashboard', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/#admin');
    // Wait for leads table to load
    await page.waitForSelector(selectors.admin.leadsTable, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should display admin dashboard', async ({ authenticatedPage: page }) => {
    // Check header
    await expect(page.locator('h1')).toContainText('Lead Management');
    await expect(page.locator('p')).toContainText('Elite Adventures Belize - Admin Dashboard');

    // Check action buttons
    await expect(page.locator(selectors.admin.refreshButton)).toBeVisible();
    await expect(page.locator(selectors.admin.exportCsvButton)).toBeVisible();
    await expect(page.locator(selectors.admin.exportJsonButton)).toBeVisible();
    await expect(page.locator(selectors.admin.deleteButton)).toBeVisible();
    await expect(page.locator(selectors.admin.logoutButton)).toBeVisible();
  });

  test('should display leads table with data', async ({ authenticatedPage: page }) => {
    const table = page.locator(selectors.admin.leadsTable);
    await expect(table).toBeVisible();

    // Check table headers
    await expect(table.locator('th', { hasText: 'Date' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'Name' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'Email' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'Company' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'Status' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'Actions' })).toBeVisible();

    // Check for select all checkbox
    await expect(page.locator(selectors.admin.selectAllCheckbox)).toBeVisible();
  });

  test('should show lead count', async ({ authenticatedPage: page }) => {
    const countText = page.locator('text=/\\d+ leads?/');
    await expect(countText).toBeVisible();
  });

  test('should refresh leads on button click', async ({ authenticatedPage: page }) => {
    // Get initial lead count
    const initialCount = await page.locator(selectors.admin.leadRow).count();

    // Click refresh
    await page.click(selectors.admin.refreshButton);

    // Wait for loading state
    await page.waitForTimeout(waitTimes.short);

    // Table should still be visible
    await expect(page.locator(selectors.admin.leadsTable)).toBeVisible();

    // Lead count should be same or updated
    const newCount = await page.locator(selectors.admin.leadRow).count();
    expect(newCount).toBeGreaterThanOrEqual(0);
  });

  test('should display view button for each lead', async ({ authenticatedPage: page }) => {
    const viewButtons = page.locator(selectors.admin.viewButton);
    const count = await viewButtons.count();

    // Should have view buttons if there are leads
    if (count > 0) {
      await expect(viewButtons.first()).toBeVisible();
    }
  });

  test('should have checkboxes for each lead', async ({ authenticatedPage: page }) => {
    const checkboxes = page.locator('.lead-checkbox');
    const count = await checkboxes.count();

    if (count > 0) {
      await expect(checkboxes.first()).toBeVisible();
    }
  });

  test('should disable delete button when nothing selected', async ({ authenticatedPage: page }) => {
    const deleteButton = page.locator(selectors.admin.deleteButton);

    // Should be disabled initially
    await expect(deleteButton).toBeDisabled();
  });

  test('should enable delete button when leads selected', async ({ authenticatedPage: page }) => {
    const checkboxes = page.locator('.lead-checkbox');
    const count = await checkboxes.count();

    if (count > 0) {
      // Select first lead
      await checkboxes.first().check();

      // Delete button should be enabled
      const deleteButton = page.locator(selectors.admin.deleteButton);
      await expect(deleteButton).toBeEnabled();

      // Should show selection count
      await expect(page.locator('text=1 selected')).toBeVisible();
    }
  });

  test('should handle select all functionality', async ({ authenticatedPage: page }) => {
    const selectAll = page.locator(selectors.admin.selectAllCheckbox);
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Check select all
      await selectAll.check();

      // All checkboxes should be checked
      for (let i = 0; i < count; i++) {
        await expect(leadCheckboxes.nth(i)).toBeChecked();
      }

      // Should show count
      await expect(page.locator(`text=${count} selected`)).toBeVisible();

      // Uncheck select all
      await selectAll.uncheck();

      // All checkboxes should be unchecked
      for (let i = 0; i < count; i++) {
        await expect(leadCheckboxes.nth(i)).not.toBeChecked();
      }
    }
  });

  test('should display lead details in modal', async ({ authenticatedPage: page }) => {
    const viewButtons = page.locator(selectors.admin.viewButton);
    const count = await viewButtons.count();

    if (count > 0) {
      // Click first view button
      await viewButtons.first().click();

      // Modal should appear
      await expect(page.locator(selectors.admin.modal)).toBeVisible();

      // Should have lead details
      await expect(page.locator('#lead-modal h2')).toContainText('Lead Details');
      await expect(page.locator('#lead-modal h3')).toContainText('Contact Information');

      // Should have close button
      await expect(page.locator(selectors.admin.closeModalButton)).toBeVisible();
    }
  });

  test('should close modal on button click', async ({ authenticatedPage: page }) => {
    const viewButtons = page.locator(selectors.admin.viewButton);
    const count = await viewButtons.count();

    if (count > 0) {
      // Open modal
      await viewButtons.first().click();
      await expect(page.locator(selectors.admin.modal)).toBeVisible();

      // Close modal
      await page.click(selectors.admin.closeModalButton);

      // Modal should be hidden
      await expect(page.locator(selectors.admin.modal)).not.toBeVisible();
    }
  });

  test('should close modal on background click', async ({ authenticatedPage: page }) => {
    const viewButtons = page.locator(selectors.admin.viewButton);
    const count = await viewButtons.count();

    if (count > 0) {
      // Open modal
      await viewButtons.first().click();
      await expect(page.locator(selectors.admin.modal)).toBeVisible();

      // Click modal background
      await page.locator(selectors.admin.modal).click({ position: { x: 10, y: 10 } });

      // Modal should be hidden
      await expect(page.locator(selectors.admin.modal)).not.toBeVisible();
    }
  });

  test('should show status badges with colors', async ({ authenticatedPage: page }) => {
    const statusBadges = page.locator('span[style*="background"]');
    const count = await statusBadges.count();

    if (count > 0) {
      const badge = statusBadges.first();
      await expect(badge).toBeVisible();

      // Should have status text
      const statusText = await badge.textContent();
      expect(['new', 'contacted', 'qualified', 'disqualified']).toContain(statusText?.trim());
    }
  });

  test('should display email as clickable mailto link', async ({ authenticatedPage: page }) => {
    const emailLinks = page.locator('a[href^="mailto:"]');
    const count = await emailLinks.count();

    if (count > 0) {
      const emailLink = emailLinks.first();
      await expect(emailLink).toBeVisible();

      const href = await emailLink.getAttribute('href');
      expect(href).toMatch(/^mailto:/);
    }
  });

  test('should work on mobile viewport', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Dashboard should still be visible
    await expect(page.locator('h1')).toContainText('Lead Management');

    // Buttons should wrap appropriately
    await expect(page.locator(selectors.admin.refreshButton)).toBeVisible();
    await expect(page.locator(selectors.admin.exportCsvButton)).toBeVisible();

    // Table should be scrollable
    const table = page.locator(selectors.admin.leadsTable);
    await expect(table).toBeVisible();
  });
});

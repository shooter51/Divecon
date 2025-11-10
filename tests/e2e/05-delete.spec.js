/**
 * E2E Tests for Multi-Select and Delete Functionality
 * Tests lead selection and deletion
 */

const { test, expect } = require('../fixtures/auth-fixture');
const { selectors, waitTimes, validLead } = require('../fixtures/test-data');
const path = require('path');

// Use authenticated state

test.describe('Multi-Select and Delete', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/#admin');
    await page.waitForSelector(selectors.admin.leadsTable, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should have checkbox column in table', async ({ authenticatedPage: page }) => {
    const checkboxHeader = page.locator('th input[type="checkbox"]#select-all');
    await expect(checkboxHeader).toBeVisible();
  });

  test('should have checkbox for each lead row', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const rowCount = await leadRows.count();

    if (rowCount > 0) {
      const firstRowCheckbox = leadRows.first().locator('.lead-checkbox');
      await expect(firstRowCheckbox).toBeVisible();
    }
  });

  test('should select individual lead', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      const checkbox = leadCheckboxes.first();

      // Initially unchecked
      await expect(checkbox).not.toBeChecked();

      // Check it
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      // Should show selection count
      await expect(page.locator('text=1 selected')).toBeVisible();

      // Delete button should be enabled
      await expect(page.locator(selectors.admin.deleteButton)).toBeEnabled();
    }
  });

  test('should unselect individual lead', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      const checkbox = leadCheckboxes.first();

      // Check then uncheck
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();

      // Delete button should be disabled
      await expect(page.locator(selectors.admin.deleteButton)).toBeDisabled();
    }
  });

  test('should select multiple leads', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count >= 2) {
      // Select first two
      await leadCheckboxes.nth(0).check();
      await leadCheckboxes.nth(1).check();

      await expect(leadCheckboxes.nth(0)).toBeChecked();
      await expect(leadCheckboxes.nth(1)).toBeChecked();

      // Should show count
      await expect(page.locator('text=2 selected')).toBeVisible();
    }
  });

  test('should select all leads with select-all checkbox', async ({ authenticatedPage: page }) => {
    const selectAll = page.locator(selectors.admin.selectAllCheckbox);
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Check select all
      await selectAll.check();

      // All should be checked
      for (let i = 0; i < count; i++) {
        await expect(leadCheckboxes.nth(i)).toBeChecked();
      }

      // Should show total count selected
      await expect(page.locator(`text=${count} selected`)).toBeVisible();
    }
  });

  test('should deselect all leads with select-all checkbox', async ({ authenticatedPage: page }) => {
    const selectAll = page.locator(selectors.admin.selectAllCheckbox);
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Select all first
      await selectAll.check();

      // Then deselect all
      await selectAll.uncheck();

      // All should be unchecked
      for (let i = 0; i < count; i++) {
        await expect(leadCheckboxes.nth(i)).not.toBeChecked();
      }

      // Delete button should be disabled
      await expect(page.locator(selectors.admin.deleteButton)).toBeDisabled();
    }
  });

  test('should update selection count dynamically', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count >= 3) {
      // Select progressively
      await leadCheckboxes.nth(0).check();
      await expect(page.locator('text=1 selected')).toBeVisible();

      await leadCheckboxes.nth(1).check();
      await expect(page.locator('text=2 selected')).toBeVisible();

      await leadCheckboxes.nth(2).check();
      await expect(page.locator('text=3 selected')).toBeVisible();

      // Deselect one
      await leadCheckboxes.nth(1).uncheck();
      await expect(page.locator('text=2 selected')).toBeVisible();
    }
  });

  test('should show confirmation dialog before delete', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Select a lead
      await leadCheckboxes.first().check();

      // Set up dialog handler
      let dialogShown = false;
      page.on('dialog', dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain('Are you sure');
        dialog.dismiss(); // Dismiss to avoid actual deletion
      });

      // Click delete
      await page.click(selectors.admin.deleteButton);

      // Wait a bit for dialog
      await page.waitForTimeout(500);

      expect(dialogShown).toBe(true);
    }
  });

  test('should cancel delete on dialog dismiss', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      const initialCount = count;

      // Select a lead
      await leadCheckboxes.first().check();

      // Dismiss dialog
      page.on('dialog', dialog => dialog.dismiss());

      // Click delete
      await page.click(selectors.admin.deleteButton);
      await page.waitForTimeout(waitTimes.short);

      // Count should remain the same
      const newCount = await page.locator(selectors.admin.leadRow).count();
      expect(newCount).toBe(initialCount);
    }
  });

  test('should delete lead on confirmation', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      const initialCount = count;

      // Select last lead (less likely to be important)
      await leadCheckboxes.last().check();

      // Accept dialog
      page.on('dialog', dialog => dialog.accept());

      // Click delete
      await page.click(selectors.admin.deleteButton);

      // Wait for deletion to complete
      await page.waitForTimeout(waitTimes.medium);

      // Should show success alert
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Successfully deleted');
        dialog.accept();
      });

      await page.waitForTimeout(waitTimes.short);

      // Count should decrease
      const newCount = await page.locator(selectors.admin.leadRow).count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('should delete multiple leads', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count >= 2) {
      const initialCount = count;

      // Select last two leads
      await leadCheckboxes.nth(count - 1).check();
      await leadCheckboxes.nth(count - 2).check();

      // Accept dialogs
      page.on('dialog', dialog => dialog.accept());

      // Click delete
      await page.click(selectors.admin.deleteButton);

      // Wait for deletion
      await page.waitForTimeout(waitTimes.medium);

      // Count should decrease by 2
      const newCount = await page.locator(selectors.admin.leadRow).count();
      expect(newCount).toBe(initialCount - 2);
    }
  });

  test('should clear selections after successful delete', async ({ authenticatedPage: page }) => {
    const leadCheckboxes = page.locator('.lead-checkbox');
    const count = await leadCheckboxes.count();

    if (count > 0) {
      // Select a lead
      await leadCheckboxes.last().check();

      // Accept dialogs
      page.on('dialog', dialog => dialog.accept());

      // Delete
      await page.click(selectors.admin.deleteButton);
      await page.waitForTimeout(waitTimes.medium);

      // All checkboxes should be unchecked
      const remainingCheckboxes = page.locator('.lead-checkbox');
      const remainingCount = await remainingCheckboxes.count();

      for (let i = 0; i < remainingCount; i++) {
        await expect(remainingCheckboxes.nth(i)).not.toBeChecked();
      }

      // Delete button should be disabled
      await expect(page.locator(selectors.admin.deleteButton)).toBeDisabled();
    }
  });

  test('should maintain sort order after delete', async ({ authenticatedPage: page }) => {
    const leadRows = page.locator(selectors.admin.leadRow);
    const count = await leadRows.count();

    if (count > 1) {
      // Sort by name
      await page.click('th:has-text("Name")');
      await page.waitForTimeout(500);

      // Select and delete last lead
      await leadRows.last().locator('.lead-checkbox').check();

      page.on('dialog', dialog => dialog.accept());
      await page.click(selectors.admin.deleteButton);
      await page.waitForTimeout(waitTimes.medium);

      // Table should still be sorted
      const nameHeader = page.locator('th:has-text("Name")');
      const headerText = await nameHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    }
  });
});

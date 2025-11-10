/**
 * E2E Tests for Delete Error Handling
 * Tests proper error handling for 404 (not found) and 500 (server error) scenarios
 */

const { test, expect } = require('../fixtures/auth-fixture');
const { selectors, waitTimes } = require('../fixtures/test-data');

test.describe('Delete Error Handling', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/#admin');
    // Wait for leads table to load
    await page.waitForSelector(selectors.admin.leadsTable, {
      timeout: waitTimes.apiResponse
    });
  });

  test('should handle 404 error when deleting non-existent lead', async ({ authenticatedPage: page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Intercept DELETE requests and simulate 404
    await page.route('**/leads/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Lead not found' })
        });
      } else {
        route.continue();
      }
    });

    // Wait for leads to load
    await page.waitForTimeout(2000);

    // Check if there are any leads
    const leadRows = await page.locator(selectors.admin.leadRow).count();

    if (leadRows > 0) {
      // Select first lead
      const firstCheckbox = page.locator('tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.check();

      // Click delete button
      await page.click(selectors.admin.deleteButton);

      // Confirm deletion
      page.once('dialog', dialog => {
        expect(dialog.message()).toContain('delete');
        dialog.accept();
      });

      // Wait for delete operation to complete
      await page.waitForTimeout(2000);

      // Verify error was logged
      expect(consoleErrors.some(err => err.includes('Failed to delete lead'))).toBeTruthy();
    } else {
      console.log('No leads available for delete test');
    }
  });

  test('should handle 500 error when delete fails on server', async ({ authenticatedPage: page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Intercept DELETE requests and simulate 500 error
    await page.route('**/leads/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      } else {
        route.continue();
      }
    });

    // Wait for leads to load
    await page.waitForTimeout(2000);

    // Check if there are any leads
    const leadRows = await page.locator(selectors.admin.leadRow).count();

    if (leadRows > 0) {
      // Select first lead
      const firstCheckbox = page.locator('tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.check();

      // Click delete button
      await page.click(selectors.admin.deleteButton);

      // Confirm deletion
      page.once('dialog', dialog => {
        expect(dialog.message()).toContain('delete');
        dialog.accept();
      });

      // Wait for delete operation to complete
      await page.waitForTimeout(2000);

      // Verify error was logged
      expect(consoleErrors.some(err => err.includes('Error deleting leads'))).toBeTruthy();
    } else {
      console.log('No leads available for delete test');
    }
  });

  test('should handle partial failures when deleting multiple leads', async ({ authenticatedPage: page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Intercept DELETE requests - fail every other request
    let requestCount = 0;
    await page.route('**/leads/*', (route) => {
      if (route.request().method() === 'DELETE') {
        requestCount++;
        if (requestCount % 2 === 0) {
          // Fail even-numbered requests
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          // Succeed odd-numbered requests
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Lead deleted' })
          });
        }
      } else {
        route.continue();
      }
    });

    // Wait for leads to load
    await page.waitForTimeout(2000);

    // Check if there are multiple leads
    const leadRows = await page.locator(selectors.admin.leadRow).count();

    if (leadRows >= 2) {
      // Select first two leads
      await page.locator('tbody tr:nth-child(1) input[type="checkbox"]').check();
      await page.locator('tbody tr:nth-child(2) input[type="checkbox"]').check();

      // Click delete button
      await page.click(selectors.admin.deleteButton);

      // Confirm deletion
      page.once('dialog', dialog => {
        dialog.accept();
      });

      // Wait for delete operations to complete
      await page.waitForTimeout(3000);

      // Verify partial failure was logged
      expect(consoleErrors.length).toBeGreaterThan(0);
    } else {
      console.log('Not enough leads available for multi-delete test');
    }
  });

  test('should continue to show UI when delete fails', async ({ authenticatedPage: page }) => {
    // Intercept DELETE requests and simulate failure
    await page.route('**/leads/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      } else {
        route.continue();
      }
    });

    // Wait for leads to load
    await page.waitForTimeout(2000);

    const leadRows = await page.locator(selectors.admin.leadRow).count();

    if (leadRows > 0) {
      // Select first lead
      await page.locator('tbody tr:first-child input[type="checkbox"]').check();

      // Click delete button
      await page.click(selectors.admin.deleteButton);

      // Confirm deletion
      page.once('dialog', dialog => {
        dialog.accept();
      });

      // Wait for delete operation to attempt
      await page.waitForTimeout(2000);

      // Verify dashboard is still functional
      await expect(page.locator('h1')).toContainText('Lead Management');
      await expect(page.locator(selectors.admin.refreshButton)).toBeVisible();
      await expect(page.locator(selectors.admin.exportCsvButton)).toBeVisible();

      // Verify leads table is still displayed
      await expect(page.locator(selectors.admin.leadsTable)).toBeVisible();
    }
  });

  test('should log appropriate error message for 404', async ({ authenticatedPage: page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Intercept DELETE and return 404
    await page.route('**/leads/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Lead not found' })
        });
      } else {
        route.continue();
      }
    });

    await page.waitForTimeout(2000);

    const leadRows = await page.locator(selectors.admin.leadRow).count();

    if (leadRows > 0) {
      await page.locator('tbody tr:first-child input[type="checkbox"]').check();
      await page.click(selectors.admin.deleteButton);

      page.once('dialog', dialog => dialog.accept());

      await page.waitForTimeout(2000);

      // Check for specific error message about failed delete
      const hasErrorMessage = consoleMessages.some(msg =>
        msg.type === 'error' && msg.text.includes('Failed to delete lead')
      );

      expect(hasErrorMessage).toBeTruthy();
    }
  });
});

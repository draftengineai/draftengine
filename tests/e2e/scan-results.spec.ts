import { test, expect } from '@playwright/test';
import { login, openUpdateIntake, mockFeatures } from './helpers';
import { mockScanApi, mockScanApiEmpty, mockUpdateApi } from '../fixtures/mock-anthropic';
import { mockGeneratedArticle } from '../fixtures/mock-article';

test.describe('Scan results', () => {
  test.beforeEach(async ({ page }) => {
    await mockFeatures(page, { updateExisting: true });
    await login(page);
    // Seed an article so landing page shows STATE B with action cards
    await page.request.post('/api/articles', { data: mockGeneratedArticle });
    await page.reload();
    await page.locator('[data-testid="action-card-update"]').waitFor({ timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`).catch(() => {});
  });

  // -----------------------------------------------------------------------
  // Helper: open update mode and fill the form, then scan
  // -----------------------------------------------------------------------

  async function openUpdateModeAndScan(page: import('@playwright/test').Page) {
    await openUpdateIntake(page);
    await page.waitForSelector('[data-testid="mode-toggle"]');

    // Fill required fields
    await page.selectOption('select:below(:text("Module"))', { index: 1 });
    await page.fill('textarea', 'The search criteria panel was redesigned with new filter options.');

    // Click "Find affected articles"
    await page.click('button:has-text("Find affected articles")');
  }

  // -----------------------------------------------------------------------
  // 1. Scan results display with correct confidence badges and titles
  // -----------------------------------------------------------------------

  test('scan results display with correct confidence badges and titles', async ({ page }) => {
    await mockScanApi(page);

    await openUpdateModeAndScan(page);

    // Wait for results
    await page.waitForSelector('[data-testid="scan-results"]');

    // Should show 3 matches
    const matches = page.locator('[data-testid="scan-match"]');
    await expect(matches).toHaveCount(3);

    // Check titles
    await expect(matches.nth(0)).toContainText('Search Criteria for Volunteers');
    await expect(matches.nth(1)).toContainText('Managing Volunteer Assignments');
    await expect(matches.nth(2)).toContainText('Volunteer Overview Dashboard');

    // Check confidence badges
    await expect(page.locator('[data-testid="confidence-high"]')).toHaveText('HIGH');
    await expect(page.locator('[data-testid="confidence-medium"]')).toHaveText('MEDIUM');
    await expect(page.locator('[data-testid="confidence-low"]')).toHaveText('LOW');

    // Check reason text visible
    await expect(matches.nth(0)).toContainText('directly covers the Search Criteria');
    await expect(matches.nth(2)).toContainText('unlikely to need updates');
  });

  // -----------------------------------------------------------------------
  // 2. HIGH/MEDIUM pre-checked, LOW unchecked
  // -----------------------------------------------------------------------

  test('HIGH and MEDIUM are pre-checked, LOW is unchecked', async ({ page }) => {
    await mockScanApi(page);

    await openUpdateModeAndScan(page);
    await page.waitForSelector('[data-testid="scan-results"]');

    const checkboxes = page.locator('[data-testid="scan-match"] input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);

    // HIGH (first) — checked
    await expect(checkboxes.nth(0)).toBeChecked();
    // MEDIUM (second) — checked
    await expect(checkboxes.nth(1)).toBeChecked();
    // LOW (third) — unchecked
    await expect(checkboxes.nth(2)).not.toBeChecked();
  });

  // -----------------------------------------------------------------------
  // 3. Unchecking all disables the "Update selected" button
  // -----------------------------------------------------------------------

  test('unchecking all disables the Update selected button', async ({ page }) => {
    await mockScanApi(page);

    await openUpdateModeAndScan(page);
    await page.waitForSelector('[data-testid="scan-results"]');

    const updateBtn = page.locator('button:has-text("Update selected articles")');
    await expect(updateBtn).toBeVisible();

    // Initially enabled (HIGH + MEDIUM are checked)
    await expect(updateBtn).not.toBeDisabled();

    // Uncheck both checked articles
    const checkboxes = page.locator('[data-testid="scan-match"] input[type="checkbox"]');
    await checkboxes.nth(0).uncheck();
    await checkboxes.nth(1).uncheck();

    // Button should now be disabled
    await expect(updateBtn).toBeDisabled();

    // Re-check one — button should re-enable
    await checkboxes.nth(2).check();
    await expect(updateBtn).not.toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 4. Clicking "Update selected" shows progress and redirects to editor
  // -----------------------------------------------------------------------

  test('clicking Update selected shows progress and redirects to editor', async ({ page }) => {
    await mockScanApi(page);

    // Slow down the update API to make the progress indicator visible
    await page.route('**/api/update', async (route) => {
      const request = route.request();
      const postData = request.postData();
      let articleId = 'mock-article-001';

      if (postData) {
        try {
          const body = JSON.parse(postData);
          articleId = body.articleId || articleId;
        } catch {
          // default
        }
      }

      // Small delay so the progress indicator is visible
      await new Promise((r) => setTimeout(r, 500));

      const now = new Date().toISOString();
      const article = {
        id: articleId,
        title: 'Search Criteria for Volunteers',
        module: 'Volunteers',
        source: 'update',
        changeType: 'enhancement',
        status: 'generated',
        types: ['howto', 'wn'],
        activeType: 'howto',
        writer: null,
        featureId: null,
        featureUrl: null,
        terminologyValidated: false,
        reviewNote: null,
        description: 'Updated article',
        isUpdate: true,
        updatedSteps: [2, 3],
        updateReason: 'Search criteria UI was redesigned',
        originals: {},
        parentArticleIds: [],
        createdAt: now,
        updatedAt: now,
        sharedAt: null,
        approvedAt: null,
        revisionReason: null,
        revisionRequestedAt: null,
        content: { howto: { overview: 'Test', steps: [] } },
        screenshots: { howto: [], wn: [] },
        confidence: { howto: [], wn: [] },
      };

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(article),
      });
    });

    await openUpdateModeAndScan(page);
    await page.waitForSelector('[data-testid="scan-results"]');

    // Click "Update selected articles"
    const updateBtn = page.locator('button:has-text("Update selected articles")');
    await updateBtn.click();

    // Should show progress indicator (delayed mock gives us time to see it)
    await expect(page.locator('[data-testid="update-loading"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="update-loading"]')).toContainText('Updating article');

    // Should redirect to editor for the first updated article
    await page.waitForURL(/\/editor\//, { timeout: 15000 });
    expect(page.url()).toContain('/editor/');
  });

  // -----------------------------------------------------------------------
  // 5. Updated articles show "Updated" badge on landing page
  // -----------------------------------------------------------------------

  test('updated articles show Updated badge on landing page', async ({ page }) => {
    // Seed an updated article
    const updatedArticle = {
      ...mockGeneratedArticle,
      id: 'mock-updated-article-001',
      title: 'Updated Search Criteria',
      isUpdate: true,
      updatedSteps: [2, 3],
      updateReason: 'Search criteria UI was redesigned',
      originals: { 2: 'Original step 3 text' },
    };

    await page.request.post('/api/articles', { data: updatedArticle });
    await page.reload();
    await page.locator('.article-card', { hasText: 'Updated Search Criteria' }).waitFor();

    const card = page.locator('.article-card', { hasText: 'Updated Search Criteria' });

    // Should show the "Updated" badge
    await expect(card.locator('[data-testid="updated-badge"]')).toHaveText('Updated');

    // Should also show the "UPDATING" origin badge
    await expect(card.locator('.ac-origin')).toHaveText('UPDATING');

    // Clean up
    await page.request.delete(`/api/articles/${updatedArticle.id}`);
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  test('empty scan results show no affected articles message', async ({ page }) => {
    await mockScanApiEmpty(page);

    await openUpdateModeAndScan(page);
    await page.waitForSelector('[data-testid="scan-results"]');

    await expect(page.locator('[data-testid="no-matches"]')).toContainText('No affected articles found');
  });
});

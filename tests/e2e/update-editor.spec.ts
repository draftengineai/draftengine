import { test, expect } from '@playwright/test';
import { login, mockFeatures } from './helpers';
import { mockUpdatedArticle } from '../fixtures/mock-article';

test.describe('Editor — Update Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await mockFeatures(page, { updateIndicators: true });
    await login(page);
    // Seed updated article via API
    await page.request.post('/api/articles', { data: mockUpdatedArticle });
    await page.goto(`/editor/${mockUpdatedArticle.id}`);
    await page.locator('[data-toolbar]').waitFor({ timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`/api/articles/${mockUpdatedArticle.id}`);
  });

  // 1. Updated article shows teal border on changed steps only
  test('changed steps have teal left border', async ({ page }) => {
    // Steps at index 1 and 4 are changed
    const step1 = page.locator('[data-step="1"]');
    const step4 = page.locator('[data-step="4"]');

    await expect(step1).toHaveAttribute('data-changed', 'true');
    await expect(step4).toHaveAttribute('data-changed', 'true');

    // Check teal border on changed steps
    await expect(step1).toHaveCSS('border-left-color', 'rgb(13, 148, 136)');
    await expect(step4).toHaveCSS('border-left-color', 'rgb(13, 148, 136)');
  });

  // 2. "Changed" badge appears on updated steps
  test('Changed badge appears on updated steps', async ({ page }) => {
    const step1 = page.locator('[data-step="1"]');
    const step4 = page.locator('[data-step="4"]');

    await expect(step1.locator('[data-testid="changed-badge"]')).toHaveText('Changed');
    await expect(step4.locator('[data-testid="changed-badge"]')).toHaveText('Changed');
  });

  // 3. Unchanged steps have no teal indicator
  test('unchanged steps have no teal indicator', async ({ page }) => {
    const unchangedIndexes = [0, 2, 3];
    for (const idx of unchangedIndexes) {
      const step = page.locator(`[data-step="${idx}"]`);
      await expect(step).not.toHaveAttribute('data-changed', 'true');
      await expect(step.locator('[data-testid="changed-badge"]')).toHaveCount(0);
    }
  });

  // 4. "View original" toggle shows original step text
  test('View original toggle shows original step text', async ({ page }) => {
    const toggleBtn = page.locator('[data-testid="toggle-original-1"]');
    await expect(toggleBtn).toHaveText('View original');

    // Click to expand
    await toggleBtn.click();

    const originalBox = page.locator('[data-testid="original-text-1"]');
    await expect(originalBox).toBeVisible();
    await expect(originalBox).toContainText('Original:');
    // The original text for step index 1
    await expect(originalBox).toContainText('Search Criteria link in the left sidebar navigation');
  });

  // 5. "Hide original" collapses the original text
  test('Hide original collapses the original text', async ({ page }) => {
    const toggleBtn = page.locator('[data-testid="toggle-original-1"]');
    // Open
    await toggleBtn.click();
    await expect(page.locator('[data-testid="original-text-1"]')).toBeVisible();

    // Button should now say "Hide original"
    await expect(toggleBtn).toHaveText('Hide original');

    // Close
    await toggleBtn.click();
    await expect(page.locator('[data-testid="original-text-1"]')).toHaveCount(0);
    await expect(toggleBtn).toHaveText('View original');
  });

  // 6. Update banner shows update reason and step count
  test('update banner shows update reason and step count', async ({ page }) => {
    const banner = page.locator('[data-testid="update-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      'This article was updated based on: Search Criteria button moved to the sidebar in v8.3'
    );
    await expect(banner).toContainText('2 of 5 steps were revised');
  });

  // 7. Sidebar shows "Review changes" checklist item with count
  test('sidebar shows Review changes checklist item with count', async ({ page }) => {
    const sidebar = page.locator('[data-sidebar]');
    await expect(sidebar.getByText('Review changes')).toBeVisible();
    await expect(sidebar.getByText('2 changes')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { login, loginAdmin, mockFeatures } from './helpers';
import { mockGeneratedArticle } from '../fixtures/mock-article';

const toastSelector = '#toast-root [role="alert"]';

test.describe('Admin dashboard', () => {
  // -----------------------------------------------------------------------
  // Auth tests
  // -----------------------------------------------------------------------

  test('admin login with correct password accesses /admin/dashboard', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.locator('h1', { hasText: 'GateDoc Admin' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Feature Flags' })).toBeVisible();
  });

  test('writer login cannot access /admin/dashboard — redirects to landing', async ({ page }) => {
    await login(page);
    await page.goto('/admin/dashboard');
    // Middleware redirects writer to landing page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h1:has-text("GateDoc Admin")')).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Feature flag management
  // -----------------------------------------------------------------------

  test('toggle a feature flag and verify it saves', async ({ page }) => {
    await loginAdmin(page);

    // Wait for flags to load
    await page.locator('[data-testid="toggle-confidenceFlags"]').waitFor();

    // Click the toggle — confidenceFlags defaults to true, so toggling makes it false
    await page.click('[data-testid="toggle-confidenceFlags"]');

    // Should show a toast confirming the change
    await expect(page.locator(toastSelector)).toBeVisible({ timeout: 5000 });

    // Verify the flag was saved by reloading and checking the API
    const res = await page.request.get('/api/admin/features');
    const flags = await res.json();
    expect(flags.confidenceFlags).toBe(false);

    // Toggle back so other tests are not affected
    await page.click('[data-testid="toggle-confidenceFlags"]');
    await expect(page.locator(toastSelector)).toBeVisible({ timeout: 5000 });
  });

  test('disabling updateExisting hides the Update action card on landing page', async ({ page }) => {
    // Mock features with updateExisting disabled
    await mockFeatures(page, { updateExisting: false });

    await login(page);

    // Seed an article so we get STATE B
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
      }
      return route.continue();
    });
    await page.reload();
    await page.locator('[data-testid="action-cards"]').waitFor({ timeout: 10000 });

    // "Generate a new article" card should be visible
    await expect(page.locator('[data-testid="action-card-new"]')).toBeVisible();

    // "Update existing articles" card should NOT be visible
    await expect(page.locator('[data-testid="action-card-update"]')).not.toBeVisible();
  });

  test('disabling shareWithReviewer hides Share link button in editor', async ({ page }) => {
    // Mock features with shareWithReviewer disabled
    await mockFeatures(page, { shareWithReviewer: false });

    await login(page);

    // Seed article (after login so request has auth cookie)
    await page.request.post('/api/articles', { data: mockGeneratedArticle });

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.locator('[data-toolbar]').waitFor({ timeout: 10000 });

    // Share link button should NOT be visible
    await expect(page.locator('button:has-text("Share link")')).not.toBeVisible();

    // Regenerate should still be visible (not disabled)
    await expect(page.locator('[data-testid="regenerate-btn"]')).toBeVisible();

    // Clean up
    await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`);
  });

  test('reset to defaults restores correct default values', async ({ page }) => {
    await loginAdmin(page);
    await page.locator('[data-testid="toggle-confidenceFlags"]').waitFor();

    // Toggle a Core Tools flag off first
    await page.click('[data-testid="toggle-confidenceFlags"]');
    await page.locator(toastSelector).waitFor({ timeout: 5000 });

    // Click reset to defaults
    await page.click('[data-testid="reset-defaults-btn"]');
    await expect(page.locator(toastSelector)).toContainText('defaults', { timeout: 5000 });

    // Verify via API — Core Tools default true, Review Workflow default false
    const res = await page.request.get('/api/admin/features');
    const flags = await res.json();
    // Core Tools — default true
    expect(flags.confidenceFlags).toBe(true);
    expect(flags.regenerate).toBe(true);
    expect(flags.deleteArticles).toBe(true);
    expect(flags.reviewerNote).toBe(true);
    expect(flags.shareWithReviewer).toBe(true);
    // Review Workflow — default false
    expect(flags.updateExisting).toBe(false);
    expect(flags.approveWorkflow).toBe(false);
    expect(flags.updateIndicators).toBe(false);
    expect(flags.completedSection).toBe(false);
    expect(flags.verifiedFacts).toBe(false);
  });
});

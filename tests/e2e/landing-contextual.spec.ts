import { test, expect } from '@playwright/test';
import { login, mockFeatures } from './helpers';
import { mockGeneratedArticle, mockRevisionArticle } from '../fixtures/mock-article';

test.describe('Contextual landing page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -----------------------------------------------------------------------
  // STATE A — Empty (no articles)
  // -----------------------------------------------------------------------

  test('empty state shows welcome card with "Generate your first article" and Get started button', async ({ page }) => {
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [] });
      }
      return route.continue();
    });
    await page.reload();

    const welcome = page.locator('[data-testid="welcome-card"]');
    await expect(welcome).toBeVisible({ timeout: 10000 });
    await expect(welcome.locator('h1')).toContainText('Generate your first article');
    await expect(welcome.locator('[data-testid="get-started-btn"]')).toBeVisible();

    // Should NOT show action cards, article list, or completed section
    await expect(page.locator('[data-testid="action-cards"]')).not.toBeVisible();
    await expect(page.locator('.article-card')).not.toBeVisible();
    await expect(page.locator('[data-testid="completed-section"]')).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  // STATE B — Has articles
  // -----------------------------------------------------------------------

  test('with articles, shows action cards above article list', async ({ page }) => {
    await mockFeatures(page, { updateExisting: true });
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
      }
      return route.continue();
    });
    await page.reload();

    // Action cards container
    await expect(page.locator('[data-testid="action-cards"]')).toBeVisible({ timeout: 10000 });

    // New article card always visible
    await expect(page.locator('[data-testid="action-card-new"]')).toBeVisible();

    // Update card visible (flag enabled via mock, article exists)
    await expect(page.locator('[data-testid="action-card-update"]')).toBeVisible();

    // Article card should be below
    await expect(page.locator('.article-card')).toBeVisible();
  });

  test('"Generate a new article" card opens intake modal', async ({ page }) => {
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
      }
      return route.continue();
    });
    await page.reload();

    await page.locator('[data-testid="action-card-new"]').waitFor({ timeout: 10000 });
    await page.click('[data-testid="action-card-new"]');

    // Intake modal should open
    await expect(page.locator('h2', { hasText: 'New article' })).toBeVisible();
    await expect(page.locator('form#intake-form')).toBeVisible();
  });

  test('update card hidden when feature flag is false', async ({ page }) => {
    await mockFeatures(page, { updateExisting: false });
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
      }
      return route.continue();
    });
    await page.reload();

    await page.locator('[data-testid="action-cards"]').waitFor({ timeout: 10000 });
    await expect(page.locator('[data-testid="action-card-new"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-card-update"]')).not.toBeVisible();
  });

  test('update card hidden when no articles exist (even if flag is true)', async ({ page }) => {
    // Empty articles — should show welcome card, no action cards
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [] });
      }
      return route.continue();
    });
    await page.reload();

    await page.locator('[data-testid="welcome-card"]').waitFor({ timeout: 10000 });
    await expect(page.locator('[data-testid="action-card-update"]')).not.toBeVisible();
  });

  test('revision attention card shows correct count when revision articles exist', async ({ page }) => {
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: [mockGeneratedArticle, mockRevisionArticle],
        });
      }
      return route.continue();
    });
    await page.reload();

    const attentionCard = page.locator('[data-testid="action-card-attention"]');
    await expect(attentionCard).toBeVisible({ timeout: 10000 });
    await expect(attentionCard).toContainText('1 article needs revision');
  });

  test('revision attention card hidden when no revision articles', async ({ page }) => {
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
      }
      return route.continue();
    });
    await page.reload();

    await page.locator('[data-testid="action-cards"]').waitFor({ timeout: 10000 });
    await expect(page.locator('[data-testid="action-card-attention"]')).not.toBeVisible();
  });
});

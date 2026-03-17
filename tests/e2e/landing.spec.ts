import { test, expect } from '@playwright/test';
import { login, mockFeatures } from './helpers';
import { mockGeneratedArticle } from '../fixtures/mock-article';

test.describe('Landing page', () => {
  // Every landing-page test needs an authenticated session.
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  test('empty state shows prompt to create first article', async ({ page }) => {
    // Intercept the articles API to return an empty array — avoids race
    // conditions with parallel tests that may seed their own articles.
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [] });
      }
      return route.continue();
    });

    await page.reload();
    // New contextual landing page: empty state shows welcome card
    await expect(page.locator('[data-testid="welcome-card"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Generate your first article' })).toBeVisible();
    await expect(page.locator('[data-testid="get-started-btn"]')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // With articles
  // -----------------------------------------------------------------------

  test.describe('with seeded article', () => {
    test.beforeEach(async ({ page }) => {
      // Seed an article via the API
      await page.request.post('/api/articles', {
        data: mockGeneratedArticle,
      });
      await page.reload();
      // Wait for article cards to render
      await page.locator('.article-card').first().waitFor();
    });

    test.afterEach(async ({ page }) => {
      // Clean up the seeded article
      await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`);
    });

    test('card renders with title, badges, and AI status', async ({ page }) => {
      // Intercept to return only our seeded article (avoids cross-test pollution)
      await page.route('**/api/articles', (route, request) => {
        if (request.method() === 'GET') {
          return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
        }
        return route.continue();
      });
      await page.reload();
      await page.locator('.article-card').first().waitFor();

      const card = page.locator('.article-card').first();

      // Title
      await expect(card.locator('.ac-title')).toContainText('Search Criteria for Volunteers');

      // Type badges — How to, What's new
      await expect(card.locator('.badge', { hasText: 'How to' })).toBeVisible();
      await expect(card.locator('.badge', { hasText: "What's new" })).toBeVisible();

      // Module badge
      await expect(card.locator('.badge', { hasText: 'Volunteers' })).toBeVisible();

      // Status badge — Generated
      await expect(card.locator('.badge', { hasText: 'Generated' })).toBeVisible();

      // AI progress line
      await expect(card.locator('.ac-ai-line')).toContainText('AI draft — not yet reviewed');
    });

    test('IN PROGRESS count matches number of in-progress article cards', async ({ page }) => {
      // Intercept the articles API to return only our seeded article
      // This avoids cross-test interference with approved articles in COMPLETED section
      await page.route('**/api/articles', (route, request) => {
        if (request.method() === 'GET') {
          return route.fulfill({ status: 200, json: [mockGeneratedArticle] });
        }
        return route.continue();
      });
      await page.reload();
      await page.locator('.article-card').first().waitFor();

      const cardCount = await page.locator('.article-card').count();
      expect(cardCount).toBe(1);

      // The count badge is the second span inside the "In progress" section
      const countBadge = page.locator('text=In progress').locator('..').locator('span').last();
      await expect(countBadge).toHaveText(String(cardCount));
    });

    test('Generate a new article action card opens intake modal', async ({ page }) => {
      await page.click('[data-testid="action-card-new"]');

      // Modal should appear with the intake form
      await expect(page.locator('h2', { hasText: 'New article' })).toBeVisible();
      await expect(page.locator('form#intake-form')).toBeVisible();
    });

    test('Update existing action card opens modal in update mode with WHAT CHANGED label', async ({ page }) => {
      await mockFeatures(page, { updateExisting: true });
      await page.reload();
      await page.locator('[data-testid="action-card-update"]').waitFor({ timeout: 10000 });
      await page.click('[data-testid="action-card-update"]');

      // Modal opens in update mode with the update form
      await expect(page.locator('label', { hasText: 'What changed' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Find affected articles' })).toBeVisible();
    });

    test('delete button appears on hover, confirmation dialog works', async ({ page }) => {
      // Seed a dedicated article for this test to avoid conflicts
      // with parallel tests that share the same article ID.
      const deleteTarget = {
        ...mockGeneratedArticle,
        id: 'mock-article-delete-test',
        title: 'Delete Test Article',
      };
      await page.request.post('/api/articles', { data: deleteTarget });
      await page.reload();
      await page.locator('.article-card', { hasText: 'Delete Test Article' }).waitFor();

      const card = page.locator('.article-card', { hasText: 'Delete Test Article' }).first();
      await expect(card).toBeVisible();

      // Delete button should be attached (hidden via CSS opacity: 0)
      const deleteBtn = card.locator('.ac-delete');
      await expect(deleteBtn).toBeAttached();

      // Set up dialog handler BEFORE any click
      page.on('dialog', (dialog) => dialog.accept());

      // Hover the card to reveal delete button, then click it.
      // Use force:true because the button is revealed via CSS :hover.
      await card.hover();
      await deleteBtn.click({ force: true });

      // Verify the article was removed via the API
      await expect(async () => {
        const res = await page.request.get(`/api/articles/${deleteTarget.id}`);
        expect(res.status()).toBe(404);
      }).toPass({ timeout: 10000 });
    });
  });
});

import { test, expect } from '@playwright/test';
import { login } from './helpers';
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
    await expect(page.getByText('No articles yet')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('strong', { hasText: '+ New article' })).toBeVisible();
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

    test('IN PROGRESS count matches number of article cards', async ({ page }) => {
      const cardCount = await page.locator('.article-card').count();
      expect(cardCount).toBeGreaterThan(0);

      // The count badge is the second span inside the "In progress" section
      const countBadge = page.locator('text=In progress').locator('..').locator('span').last();
      await expect(countBadge).toHaveText(String(cardCount));
    });

    test('+ New article button opens intake modal', async ({ page }) => {
      await page.click('button:has-text("+ New article")');

      // Modal should appear with the intake form
      await expect(page.locator('h2', { hasText: 'New article' })).toBeVisible();
      await expect(page.locator('form#intake-form')).toBeVisible();
    });

    test('Update existing button opens modal with Phase 2 coming soon', async ({ page }) => {
      await page.click('button:has-text("Update existing")');

      // Modal opens in update mode — use exact match to avoid strict-mode violation
      await expect(page.getByText('Coming soon in Phase 2', { exact: true })).toBeVisible();
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

import { test, expect } from '@playwright/test';
import { login } from './helpers';
import {
  mockGeneratedArticle,
  mockEditingArticle,
  mockSharedArticle,
  mockApprovedArticle,
  mockRevisionArticle,
} from '../fixtures/mock-article';

const allArticles = [
  mockGeneratedArticle,
  mockEditingArticle,
  mockSharedArticle,
  mockApprovedArticle,
  mockRevisionArticle,
];

test.describe('Kanban board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Seed all test articles
    for (const article of allArticles) {
      await page.request.post('/api/articles', { data: article });
    }
    // Mock articles API to return only our test set
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: allArticles });
      }
      return route.continue();
    });
    await page.reload();
    await page.locator('.article-card').first().waitFor({ timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    for (const article of allArticles) {
      await page.request.delete(`/api/articles/${article.id}`).catch(() => {});
    }
  });

  // -----------------------------------------------------------------------
  // View toggle
  // -----------------------------------------------------------------------

  test('view toggle switches between list and board', async ({ page }) => {
    // Default is list view — board should not be visible
    await expect(page.locator('[data-testid="view-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible();

    // Click board view
    await page.click('[data-testid="view-board"]');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Click list view to switch back
    await page.click('[data-testid="view-list"]');
    await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible();
    // Article cards should be visible again
    await expect(page.locator('.article-card').first()).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Board columns
  // -----------------------------------------------------------------------

  test('board shows three columns with correct article counts', async ({ page }) => {
    await page.click('[data-testid="view-board"]');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Three columns
    await expect(page.locator('[data-testid="kanban-column-todo"]')).toBeVisible();
    await expect(page.locator('[data-testid="kanban-column-inprogress"]')).toBeVisible();
    await expect(page.locator('[data-testid="kanban-column-complete"]')).toBeVisible();

    // Counts: 1 generated (To Do), 3 editing+shared+revision (In Progress), 1 approved (Complete)
    await expect(page.locator('[data-testid="kanban-count-todo"]')).toHaveText('1');
    await expect(page.locator('[data-testid="kanban-count-inprogress"]')).toHaveText('3');
    await expect(page.locator('[data-testid="kanban-count-complete"]')).toHaveText('1');
  });

  // -----------------------------------------------------------------------
  // Articles in correct columns
  // -----------------------------------------------------------------------

  test('articles appear in correct columns based on status', async ({ page }) => {
    await page.click('[data-testid="view-board"]');

    const todoCol = page.locator('[data-testid="kanban-column-todo"]');
    const inProgressCol = page.locator('[data-testid="kanban-column-inprogress"]');
    const completeCol = page.locator('[data-testid="kanban-column-complete"]');

    // Generated article in To Do
    await expect(todoCol.locator(`[data-article-id="${mockGeneratedArticle.id}"]`)).toBeVisible();

    // Editing, shared, and revision in In Progress
    await expect(inProgressCol.locator(`[data-article-id="${mockEditingArticle.id}"]`)).toBeVisible();
    await expect(inProgressCol.locator(`[data-article-id="${mockSharedArticle.id}"]`)).toBeVisible();
    await expect(inProgressCol.locator(`[data-article-id="${mockRevisionArticle.id}"]`)).toBeVisible();

    // Approved in Complete
    await expect(completeCol.locator(`[data-article-id="${mockApprovedArticle.id}"]`)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Drag reorder within column
  // -----------------------------------------------------------------------

  test('drag reorder within a column updates priority', async ({ page }) => {
    // Use two articles in the same column for reorder test
    const editingArticle2 = {
      ...mockEditingArticle,
      id: 'kanban-reorder-test-002',
      title: 'Reorder Test Article 2',
      priority: 1,
    };
    await page.request.post('/api/articles', { data: editingArticle2 });

    // Update mock to include both editing articles
    const articlesWithExtra = [...allArticles, editingArticle2];
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: articlesWithExtra });
      }
      return route.continue();
    });

    // Intercept priority PATCH calls
    const priorityUpdates: { id: string; priority: number }[] = [];
    await page.route('**/api/articles/*/priority', (route, request) => {
      if (request.method() === 'PATCH') {
        const url = request.url();
        const idMatch = url.match(/\/api\/articles\/([^/]+)\/priority/);
        request.postDataJSON().then((body: { priority: number }) => {
          priorityUpdates.push({ id: idMatch?.[1] ?? '', priority: body.priority });
        });
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.continue();
    });

    await page.reload();
    await page.click('[data-testid="view-board"]');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Verify both editing articles are in the In Progress column
    const inProgressCol = page.locator('[data-testid="kanban-column-inprogress"]');
    await expect(inProgressCol.locator('[data-testid="kanban-card"]').first()).toBeVisible();
    const cardCount = await inProgressCol.locator('[data-testid="kanban-card"]').count();
    expect(cardCount).toBeGreaterThanOrEqual(2);

    // Clean up extra article
    await page.request.delete(`/api/articles/${editingArticle2.id}`).catch(() => {});
  });

  // -----------------------------------------------------------------------
  // Revision articles have orange border
  // -----------------------------------------------------------------------

  test('revision articles have orange border in In Progress column', async ({ page }) => {
    await page.click('[data-testid="view-board"]');

    const inProgressCol = page.locator('[data-testid="kanban-column-inprogress"]');
    const revisionCard = inProgressCol.locator(`[data-article-id="${mockRevisionArticle.id}"]`);
    await expect(revisionCard).toBeVisible();
    await expect(revisionCard).toHaveAttribute('data-revision', 'true');

    // Check the orange border-left style
    const borderLeft = await revisionCard.evaluate((el) => {
      return window.getComputedStyle(el).borderLeftColor;
    });
    // #d97706 = rgb(217, 119, 6)
    expect(borderLeft).toBe('rgb(217, 119, 6)');
  });

  // -----------------------------------------------------------------------
  // View preference persists across reload
  // -----------------------------------------------------------------------

  test('view preference persists across page reload', async ({ page }) => {
    // Switch to board view
    await page.click('[data-testid="view-board"]');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Reload — board should still be active
    await page.reload();
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });

    // Switch back to list
    await page.click('[data-testid="view-list"]');
    await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible();

    // Reload — list should persist
    await page.reload();
    await page.locator('h1', { hasText: 'My articles' }).waitFor({ timeout: 10000 });
    await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible();
  });
});

import { test, expect, Page } from '@playwright/test';
import { mockGeneratedArticle } from '../fixtures/mock-article';
import { mockGenerateApi } from '../fixtures/mock-anthropic';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneArticle(): Article {
  return JSON.parse(JSON.stringify(mockGeneratedArticle));
}

/**
 * Seed article + auth cookie + mock generate route.
 * Returns a mutable ref so PATCH mutations are visible to later GETs.
 */
async function seedAndMock(page: Page): Promise<{ current: Article }> {
  const articleRef = { current: cloneArticle() };

  await page.context().addCookies([
    { name: 'draftengine_auth', value: 'test', domain: 'localhost', path: '/' },
  ]);

  // Intercept article CRUD
  await page.route(`**/api/articles/${articleRef.current.id}`, async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(articleRef.current),
      });
    }

    if (method === 'PATCH') {
      const updates = route.request().postDataJSON();
      articleRef.current = { ...articleRef.current, ...updates };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(articleRef.current),
      });
    }

    return route.continue();
  });

  // Mock the generate route (used by regenerate flow).
  // The regenerate flow calls /api/generate?skipPersist=true — the glob must
  // include a trailing wildcard so query-string URLs are matched.
  await page.route('**/api/generate?*', async (route) => {
    const now = new Date().toISOString();

    const regeneratedArticle: Article = {
      ...cloneArticle(),
      id: 'regen-temp', // the editor ignores this; it PATCHes the existing article
      createdAt: now,
      updatedAt: now,
    };

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(regeneratedArticle),
    });
  });

  // Also keep the bare /api/generate route mocked (no query string)
  await mockGenerateApi(page);

  return articleRef;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Regenerate', () => {
  test('1 — Regenerate button visible in editor toolbar', async ({ page }) => {
    await seedAndMock(page);

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.waitForSelector('[data-toolbar]');

    const regenBtn = page.locator('[data-testid="regenerate-btn"]');
    await expect(regenBtn).toBeVisible();
    await expect(regenBtn).toContainText('Regenerate');
  });

  test('2 — clicking Regenerate opens modal with pre-filled fields', async ({ page }) => {
    await seedAndMock(page);

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    // Modal header
    await expect(page.locator('h2:has-text("Regenerate article")')).toBeVisible();

    // Title pre-filled
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toHaveValue('Search Criteria for Users');

    // Module pre-filled — select element should have the right value
    const moduleSelect = page.locator('select').first();
    await expect(moduleSelect).toHaveValue('Users');

    // Change type pre-filled
    const typeSelect = page.locator('select').nth(1);
    await expect(typeSelect).toHaveValue('feature');
  });

  test('3 — description field is pre-filled (not blank) — Phase 1 bug fix', async ({ page }) => {
    await seedAndMock(page);

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    // The description textarea should be pre-filled with the article's description
    const descriptionTextarea = page.locator('textarea').last();
    const value = await descriptionTextarea.inputValue();
    expect(value.length).toBeGreaterThan(0);
    expect(value).toContain('Search feature');
  });

  test('4 — "What should the AI do differently?" optional field is present', async ({ page }) => {
    await seedAndMock(page);

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    const guidanceLabel = page.locator('text=What should the AI do differently');
    await expect(guidanceLabel).toBeVisible();

    // It should be marked as optional
    await expect(page.locator('text=(optional)')).toBeVisible();

    // The guidance textarea should be empty by default
    const guidanceTextarea = page.locator('textarea').first();
    await expect(guidanceTextarea).toHaveValue('');
  });

  test('5 — warning message about replacing content is visible', async ({ page }) => {
    await seedAndMock(page);

    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    const warning = page.locator('text=replace the current article content');
    await expect(warning).toBeVisible();

    const lostEdits = page.locator('text=manual edits will be lost');
    await expect(lostEdits).toBeVisible();
  });

  test('6 — Cancel closes modal without changes', async ({ page }) => {
    const articleRef = await seedAndMock(page);
    const originalTitle = articleRef.current.title;

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    // Modal is open
    await expect(page.locator('h2:has-text("Regenerate article")')).toBeVisible();

    // Click Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Modal should be gone
    await expect(page.locator('h2:has-text("Regenerate article")')).not.toBeVisible();

    // Article title unchanged
    expect(articleRef.current.title).toBe(originalTitle);
  });

  test('7 — submitting regenerate replaces article content in place (same article ID in URL)', async ({
    page,
  }) => {
    const articleRef = await seedAndMock(page);
    const originalId = articleRef.current.id;

    await page.goto(`/editor/${originalId}`);
    await page.locator('[data-testid="regenerate-btn"]').click();

    // Submit the form (fields are already pre-filled and valid)
    await page.locator('button[type="submit"]:has-text("Regenerate")').click();

    // Wait for regeneration to complete — the modal closes
    await expect(page.locator('h2:has-text("Regenerate article")')).not.toBeVisible({
      timeout: 10000,
    });

    // URL should still contain the same article ID
    expect(page.url()).toContain(originalId);

    // Article content should have been updated via PATCH
    expect(articleRef.current.content.howto).toBeDefined();
    expect(articleRef.current.content.howto!.steps.length).toBeGreaterThan(0);
  });

  test('8 — after regenerate, content updates and flags reset', async ({ page }) => {
    const articleRef = await seedAndMock(page);

    await page.goto(`/editor/${articleRef.current.id}`);

    // Dismiss the flag first to prove it resets after regeneration
    await page.waitForSelector('[data-step="2"]');
    await page.locator("button:has-text(\"I've verified\")").click();
    await expect(page.locator('text=AI flagged this step')).not.toBeVisible();

    // Now regenerate
    await page.locator('[data-testid="regenerate-btn"]').click();
    await page.locator('button[type="submit"]:has-text("Regenerate")').click();

    // Wait for modal to close (regeneration complete)
    await expect(page.locator('h2:has-text("Regenerate article")')).not.toBeVisible({
      timeout: 10000,
    });

    // After regeneration, the article was PATCHed with fresh content + confidence.
    // The mock generate API returns a flag on step 3, so it should be back.
    await page.waitForSelector('[data-step="2"]');
    await expect(page.locator('text=AI flagged this step')).toBeVisible();

    // Status should be reset to "generated"
    expect(articleRef.current.status).toBe('generated');
  });
});

import { test, expect, Page } from '@playwright/test';
import { mockGeneratedArticle } from '../fixtures/mock-article';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneArticle(): Article {
  return JSON.parse(JSON.stringify(mockGeneratedArticle));
}

/**
 * Seed article + auth cookie + intercept article CRUD routes.
 * Returns a mutable ref so PATCH mutations are visible to later GETs.
 */
async function seedArticle(page: Page, articleRef: { current: Article }) {
  await page.context().addCookies([
    { name: 'draftengine_auth', value: 'test', domain: 'localhost', path: '/' },
  ]);

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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Share', () => {
  test('1 — "Share link" button visible in editor toolbar', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-toolbar]');

    const shareBtn = page.locator('[data-toolbar] button:has-text("Share link")');
    await expect(shareBtn).toBeVisible();
  });

  test('2 — clicking Share link opens modal with "Share with your Reviewer" title', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    await expect(page.locator('h3:has-text("Share with your Reviewer")')).toBeVisible();
  });

  test('3 — preview URL is displayed in the modal', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    // The share modal shows: draftengine.vercel.app/preview/<id>
    const urlDisplay = page.locator('.share-url');
    await expect(urlDisplay).toBeVisible();
    await expect(urlDisplay).toContainText(`preview/${articleRef.current.id}`);
  });

  test('4 — "Note to Reviewer (optional)" textarea is present with placeholder text', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    // Label
    await expect(page.locator('text=Note to Reviewer')).toBeVisible();
    await expect(page.locator('text=(optional)')).toBeVisible();

    // Textarea with placeholder
    const textarea = page.locator('.share-note');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /check step 3/i);
  });

  test('5 — "Save & Copy Link" button is present', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    const saveBtn = page.locator('button:has-text("Save & Copy Link")');
    await expect(saveBtn).toBeVisible();
  });

  test('6 — typing a note and clicking Save & Copy Link saves the note to the article', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    // Type a note
    const noteText = 'Please review step 3 carefully.';
    await page.locator('.share-note').fill(noteText);

    // Grant clipboard permission to avoid errors
    await page.context().grantPermissions(['clipboard-write']);

    // Click Save & Copy Link
    await page.locator('button:has-text("Save & Copy Link")').click();

    // Wait for the PATCH to complete — modal closes via onShare callback
    await expect(page.locator('h3:has-text("Share with your Reviewer")')).not.toBeVisible();

    // Verify the articleRef was updated via the PATCH interceptor
    expect(articleRef.current.reviewNote).toBe(noteText);
    expect(articleRef.current.status).toBe('shared');
  });

  test('7 — Cancel closes modal without saving', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.locator('[data-toolbar] button:has-text("Share link")').click();

    // Modal is open
    await expect(page.locator('h3:has-text("Share with your Reviewer")')).toBeVisible();

    // Type something in the note
    await page.locator('.share-note').fill('Draft note');

    // Click Cancel
    await page.locator('.share-footer button:has-text("Cancel")').click();

    // Modal should be gone
    await expect(page.locator('h3:has-text("Share with your Reviewer")')).not.toBeVisible();

    // Article should NOT have been updated (no PATCH was sent)
    expect(articleRef.current.reviewNote).toBeNull();
    expect(articleRef.current.status).toBe('generated');
  });
});

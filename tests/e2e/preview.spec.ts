import { test, expect, Page } from '@playwright/test';
import { mockGeneratedArticle, mockSharedArticle } from '../fixtures/mock-article';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneArticle(source: Article = mockGeneratedArticle): Article {
  return JSON.parse(JSON.stringify(source));
}

/**
 * Intercept the article GET route so the preview page loads mock data.
 * NO auth cookie is set — preview must be accessible without login.
 */
async function seedPreview(page: Page, article: Article) {
  await page.route(`**/api/articles/${article.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(article),
      });
    }
    return route.continue();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Preview Page', () => {
  test('1 — preview page renders with "Shared preview — read-only" banner', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    const banner = page.locator('.preview-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Shared preview — read-only');
  });

  test('2 — "Steward" avatar/label shows in top-right', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // Nav renders with userName="Steward" — shows avatar initial "S" and label
    const stewardLabel = page.locator('nav >> text=Steward');
    await expect(stewardLabel).toBeVisible();

    // Avatar circle with initial "S"
    const avatar = page.locator('nav >> text=S').first();
    await expect(avatar).toBeVisible();
  });

  test('3 — article title, module, and type display correctly', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // Title
    await expect(page.locator('h1')).toContainText('Search Criteria for Volunteers');

    // Module
    await expect(page.locator('text=Module: Volunteers')).toBeVisible();

    // Type
    await expect(page.locator('text=Type: How To')).toBeVisible();
  });

  test('4 — overview text renders (not empty)', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // Overview heading
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible();

    // Overview text content
    const overviewText = page.locator('text=Search Criteria feature in the Volunteers module');
    await expect(overviewText).toBeVisible();
  });

  test('5 — steps render with correct numbering ("Step 1 of X:")', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // All 5 step headings should be visible
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator(`h3:has-text("Step ${i} of 5:")`)).toBeVisible();
    }
  });

  test('6 — bold elements render as bold (not raw HTML tags like <b>)', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // The step text contains <b>Volunteers</b> — should render as bold, not raw tags
    const boldElement = page.locator('b:has-text("Volunteers")').first();
    await expect(boldElement).toBeVisible();

    // Verify it's actually bold (font-weight >= 700)
    const fontWeight = await boldElement.evaluate(
      (el) => window.getComputedStyle(el).fontWeight,
    );
    expect(Number(fontWeight)).toBeGreaterThanOrEqual(700);
  });

  test('7 — screenshot placeholders display with descriptions', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // The mock article has imgPath: null with imgDesc set — renders as placeholder
    const placeholder = page.locator('text=Screenshot placeholder:').first();
    await expect(placeholder).toBeVisible();

    // Verify a specific description is shown
    await expect(
      page.locator('text=Screenshot showing the main menu with Volunteers highlighted'),
    ).toBeVisible();
  });

  test('8 — no raw HTML tags visible anywhere on the page', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // Wait for content to render
    await page.waitForSelector('h1');

    // Get the full visible text of the article content area
    const bodyText = await page.locator('body').innerText();

    // None of these raw HTML tag patterns should appear in visible text
    expect(bodyText).not.toMatch(/<p>/);
    expect(bodyText).not.toMatch(/<\/p>/);
    expect(bodyText).not.toMatch(/<b>/);
    expect(bodyText).not.toMatch(/<\/b>/);
    expect(bodyText).not.toMatch(/<i>/);
    expect(bodyText).not.toMatch(/<\/i>/);
    expect(bodyText).not.toMatch(/<br\s*\/?>/);
  });

  test('9 — if article has a Steward note, it displays as a banner above article content', async ({
    page,
  }) => {
    // Use the mockSharedArticle which has a reviewNote
    const article = cloneArticle(mockSharedArticle);
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // The steward note banner
    const noteBanner = page.locator('.steward-note-banner');
    await expect(noteBanner).toBeVisible();

    // Contains the "Writer's note:" label
    await expect(noteBanner.locator('strong')).toContainText("Writer's note:");

    // Contains the actual note text
    await expect(noteBanner).toContainText(
      'Please verify step 3',
    );
  });

  test('10 — preview page accessible WITHOUT auth (no login required)', async ({ page }) => {
    const article = cloneArticle();
    await seedPreview(page, article);

    // Explicitly do NOT set any auth cookie
    // Navigate directly to the preview page
    await page.goto(`/preview/${article.id}`);

    // Should NOT redirect to /login — the preview banner should be visible
    expect(page.url()).toContain('/preview/');
    expect(page.url()).not.toContain('/login');

    await expect(page.locator('.preview-banner')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Search Criteria for Volunteers');
  });
});

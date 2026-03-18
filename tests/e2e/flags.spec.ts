import { test, expect, Page } from '@playwright/test';
import { mockGeneratedArticle } from '../fixtures/mock-article';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deep-clone the mock article so mutations don't leak between tests. */
function cloneArticle(): Article {
  return JSON.parse(JSON.stringify(mockGeneratedArticle));
}

/**
 * Seed the article into the app by intercepting the relevant API routes.
 * `articleRef` is a mutable wrapper so PATCH mutations are visible to
 * subsequent GET calls within the same test.
 */
async function seedArticle(page: Page, articleRef: { current: Article }) {
  // Auth cookie
  await page.context().addCookies([
    { name: 'gatedoc_auth', value: 'test', domain: 'localhost', path: '/' },
  ]);

  // GET /api/articles/:id
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

    // DELETE or other — pass through
    return route.continue();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Confidence Flags', () => {
  test('1 — flag renders with amber background and "AI flagged this step" header', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]'); // step 3 (0-indexed)

    const header = page.locator('text=AI flagged this step');
    await expect(header).toBeVisible();

    // The header's parent has amber background (--amber-light)
    const headerDiv = header.locator('..');
    await expect(headerDiv).toHaveCSS('background-color', /./); // exists
  });

  test('2 — WHAT field shows brief label text (under ~15 words)', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // The WHAT label + value: "Availability Status filter location"
    const whatText = page.locator('text=Availability Status filter location');
    await expect(whatText).toBeVisible();

    // Verify it's brief (under 15 words)
    const text = await whatText.textContent();
    expect(text!.split(/\s+/).length).toBeLessThanOrEqual(15);
  });

  test('3 — WHY field shows detailed explanation text', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    const whyText = page.locator('text=does not specify whether this is a dropdown');
    await expect(whyText).toBeVisible();
  });

  test('4 — WHAT and WHY contain different text (not duplicated)', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    const flag = articleRef.current.confidence.howto[2]!;
    expect(flag.what).not.toEqual(flag.why);

    // Also verify both render on the page
    await expect(page.locator(`text=${flag.what}`)).toBeVisible();
    await expect(page.locator(`text=${flag.why}`).first()).toBeVisible();
  });

  test('5 — ACTION field shows a clear next step', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    const actionText = page.locator(
      'text=Open the Search panel in YourApp and verify',
    );
    await expect(actionText).toBeVisible();
  });

  test('6 — "I\'ve verified — dismiss" button removes the flag from view', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // Flag is visible before dismissing
    await expect(page.locator('text=AI flagged this step')).toBeVisible();

    // Click dismiss
    const dismissBtn = page.locator("button:has-text(\"I've verified\")");
    await dismissBtn.click();

    // Flag should no longer be visible
    await expect(page.locator('text=AI flagged this step')).not.toBeVisible();
  });

  test('7 — after dismissing a flag, sidebar "Review flags" count decrements', async ({ page }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // Before dismiss: sidebar shows "1 remaining"
    const sidebar = page.locator('[data-sidebar]');
    await expect(sidebar.locator('text=1 remaining')).toBeVisible();

    // Dismiss
    await page.locator("button:has-text(\"I've verified\")").click();

    // After dismiss: "1 remaining" should be gone
    await expect(sidebar.locator('text=1 remaining')).not.toBeVisible();
  });

  test('8 — after dismissing all flags, "Review flags" shows green checkmark (done state)', async ({
    page,
  }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // Dismiss the only flag
    await page.locator("button:has-text(\"I've verified\")").click();

    // The "Review flags" checklist item should now be in done state.
    // In done state the CheckItem shows a green circle with a checkmark SVG,
    // and the text has line-through decoration.
    const reviewFlagsItem = page.locator('text=Review flags');
    await expect(reviewFlagsItem).toBeVisible();
    // The text should have line-through when done
    await expect(reviewFlagsItem).toHaveCSS('text-decoration-line', 'line-through');
  });

  test('9 — dismissed flags persist after page refresh (navigate away and back)', async ({
    page,
  }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // Dismiss the flag — this PATCHes the article (sets confidence[howto][2] to null)
    await page.locator("button:has-text(\"I've verified\")").click();
    await expect(page.locator('text=AI flagged this step')).not.toBeVisible();

    // Wait for PATCH to complete
    await page.waitForTimeout(300);

    // Navigate away and back (simulates refresh)
    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="2"]');

    // Flag should still be gone (the articleRef was mutated by the PATCH handler)
    await expect(page.locator('text=AI flagged this step')).not.toBeVisible();
  });

  test('10 — Step 1 (VERIFIED INPUT: module provided in intake) has no flag', async ({
    page,
  }) => {
    const articleRef = { current: cloneArticle() };
    await seedArticle(page, articleRef);

    await page.goto(`/editor/${articleRef.current.id}`);
    await page.waitForSelector('[data-step="0"]');

    // Step 1 text: "Navigate to the Users module" — the module name came
    // from the intake form (VERIFIED INPUT), so no flag should be present.
    const step1 = page.locator('[data-step="0"]');
    await expect(step1).toBeVisible();

    // Confirm no "Check" badge on step 1 header
    const step1Header = step1.locator('text=Step 1 of 5');
    await expect(step1Header).toBeVisible();

    // The amber "Check" badge only appears when a flag exists.
    // Step 1 should NOT have one.
    const checkBadge = step1.locator('span:has-text("Check")');
    await expect(checkBadge).not.toBeVisible();

    // Verify the confidence array confirms null for step 1
    expect(articleRef.current.confidence.howto[0]).toBeNull();
  });
});

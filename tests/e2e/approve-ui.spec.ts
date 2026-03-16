import { test, expect, Page } from '@playwright/test';
import { login } from './helpers';
import {
  mockSharedArticle,
  mockApprovedArticle,
  mockRevisionArticle,
  mockGeneratedArticle,
} from '../fixtures/mock-article';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneArticle(source: Article): Article {
  return JSON.parse(JSON.stringify(source));
}

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
// Preview Page — Steward Actions
// ---------------------------------------------------------------------------

test.describe('Preview Page — Steward Actions', () => {
  test('1 — shows Approve and Request revision buttons for shared article', async ({ page }) => {
    const article = cloneArticle(mockSharedArticle);
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    await expect(page.getByTestId('approve-btn')).toBeVisible();
    await expect(page.getByTestId('request-revision-btn')).toBeVisible();
  });

  test('2 — clicking Approve calls API and shows success banner', async ({ page }) => {
    const article = cloneArticle(mockSharedArticle);
    await seedPreview(page, article);

    // Mock the approve API
    await page.route('**/api/approve', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        expect(body.articleId).toBe(article.id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, factsExtracted: 5 }),
        });
      }
      return route.continue();
    });

    await page.goto(`/preview/${article.id}`);

    await page.getByTestId('approve-btn').click();

    // Success banner should appear
    await expect(page.getByTestId('approve-success')).toBeVisible();
    await expect(page.getByTestId('approve-success')).toContainText(
      'Article approved. Verified facts have been extracted.'
    );

    // Action buttons should be gone
    await expect(page.getByTestId('approve-btn')).not.toBeVisible();
    await expect(page.getByTestId('request-revision-btn')).not.toBeVisible();
  });

  test('3 — Request revision expands textarea, submitting shows confirmation', async ({
    page,
  }) => {
    const article = cloneArticle(mockSharedArticle);
    await seedPreview(page, article);

    // Mock the request-revision API
    await page.route('**/api/request-revision', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        expect(body.articleId).toBe(article.id);
        expect(body.reason).toBeTruthy();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto(`/preview/${article.id}`);

    // Textarea should not be visible initially
    await expect(page.getByTestId('revision-form')).not.toBeVisible();

    // Click Request revision to expand the form
    await page.getByTestId('request-revision-btn').click();

    // Textarea and submit button should appear
    await expect(page.getByTestId('revision-form')).toBeVisible();
    await expect(page.getByTestId('revision-reason-input')).toBeVisible();
    await expect(page.getByTestId('submit-revision-btn')).toBeVisible();

    // Submit button should be disabled when textarea is empty
    await expect(page.getByTestId('submit-revision-btn')).toBeDisabled();

    // Type a reason
    await page.getByTestId('revision-reason-input').fill('Step 3 needs a different screenshot.');

    // Submit button should now be enabled
    await expect(page.getByTestId('submit-revision-btn')).toBeEnabled();

    // Submit the revision request
    await page.getByTestId('submit-revision-btn').click();

    // Success banner should appear
    await expect(page.getByTestId('revision-success')).toBeVisible();
    await expect(page.getByTestId('revision-success')).toContainText(
      'Revision requested. The writer will see your feedback.'
    );
  });

  test('4 — already-approved article shows "Approved on [date]" instead of buttons', async ({
    page,
  }) => {
    const article = cloneArticle(mockApprovedArticle);
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    // Should show approved status, not action buttons
    await expect(page.getByTestId('approved-status')).toBeVisible();
    await expect(page.getByTestId('approved-status')).toContainText('Approved on');
    await expect(page.getByTestId('approved-status')).toContainText('March 16, 2026');

    // Action buttons should NOT be present
    await expect(page.getByTestId('approve-btn')).not.toBeVisible();
    await expect(page.getByTestId('request-revision-btn')).not.toBeVisible();
  });

  test('5 — revision-status article shows revision reason in amber banner', async ({ page }) => {
    const article = cloneArticle(mockRevisionArticle);
    await seedPreview(page, article);

    await page.goto(`/preview/${article.id}`);

    await expect(page.getByTestId('revision-status')).toBeVisible();
    await expect(page.getByTestId('revision-status')).toContainText('Revision requested:');
    await expect(page.getByTestId('revision-status')).toContainText(
      'Step 3 screenshot does not match the current UI'
    );

    // Action buttons should NOT be present
    await expect(page.getByTestId('approve-btn')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Landing Page — Status Badges
// ---------------------------------------------------------------------------

test.describe('Landing Page — Status Badges', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('6 — shows correct status badges for Generated, Shared, Approved, Revision', async ({
    page,
  }) => {
    const generated = cloneArticle(mockGeneratedArticle);
    generated.id = 'badge-test-generated';
    generated.title = 'Badge Test Generated';

    const shared = cloneArticle(mockSharedArticle);
    shared.id = 'badge-test-shared';
    shared.title = 'Badge Test Shared';

    const approved = cloneArticle(mockApprovedArticle);
    approved.id = 'badge-test-approved';
    approved.title = 'Badge Test Approved';

    const revision = cloneArticle(mockRevisionArticle);
    revision.id = 'badge-test-revision';
    revision.title = 'Badge Test Revision';

    // Intercept to return controlled data (avoids cross-test pollution)
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [generated, shared, approved, revision] });
      }
      return route.continue();
    });

    await page.reload();
    await page.locator('.article-card').first().waitFor();

    // Generated badge
    const generatedCard = page.locator('.article-card', { hasText: 'Badge Test Generated' });
    await expect(generatedCard.locator('.badge', { hasText: 'Generated' })).toBeVisible();

    // Shared badge
    const sharedCard = page.locator('.article-card', { hasText: 'Badge Test Shared' });
    await expect(sharedCard.locator('.badge', { hasText: 'Shared' })).toBeVisible();

    // Approved badge (in Completed section)
    const approvedCard = page.locator('.article-card', { hasText: 'Badge Test Approved' });
    await expect(approvedCard.locator('.badge', { hasText: 'Approved' })).toBeVisible();

    // Revision badge
    const revisionCard = page.locator('.article-card', { hasText: 'Badge Test Revision' });
    await expect(revisionCard.locator('.badge', { hasText: 'Revision' })).toBeVisible();
  });

  test('7 — revision articles sort to top of landing page', async ({ page }) => {
    const normal = cloneArticle(mockGeneratedArticle);
    normal.id = 'sort-test-normal';
    normal.title = 'Sort Normal Article';

    const revision = cloneArticle(mockRevisionArticle);
    revision.id = 'sort-test-revision';
    revision.title = 'Sort Revision Article';

    // Intercept to return controlled data (avoids cross-test pollution)
    await page.route('**/api/articles', (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: [normal, revision] });
      }
      return route.continue();
    });

    await page.reload();
    await page.locator('.article-card').first().waitFor();

    // The revision article should be the first card in the IN PROGRESS section
    const cards = page.locator('.article-card');
    const firstCardTitle = await cards.first().locator('.ac-title').textContent();
    expect(firstCardTitle).toContain('Sort Revision Article');
  });
});

// ---------------------------------------------------------------------------
// Editor — Revision Banner
// ---------------------------------------------------------------------------

test.describe('Editor — Revision Banner', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('8 — editor shows revision reason banner when status is "revision"', async ({ page }) => {
    const article = cloneArticle(mockRevisionArticle);
    article.id = 'editor-revision-test';

    await page.request.post('/api/articles', { data: article });

    await page.goto(`/editor/${article.id}`);

    // Revision banner should be visible
    const banner = page.getByTestId('revision-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Revision requested by Steward:');
    await expect(banner).toContainText(
      'Step 3 screenshot does not match the current UI'
    );

    // Clean up
    await page.request.delete(`/api/articles/${article.id}`);
  });
});

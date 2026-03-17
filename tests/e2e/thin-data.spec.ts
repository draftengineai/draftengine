import { test, expect } from '@playwright/test';
import { login, openNewArticleIntake } from './helpers';
import { mockGenerateApiThinData } from '../fixtures/mock-anthropic';

/** The thin article object returned by mockGenerateApiThinData. */
const THIN_ARTICLE_ID = 'mock-thin-article-001';

const thinArticle = {
  id: THIN_ARTICLE_ID,
  title: 'New Feature',
  module: 'Settings',
  source: 'feature',
  changeType: 'feature',
  status: 'generated',
  types: ['howto', 'wn'],
  activeType: 'howto',
  writer: null,
  featureId: null,
  featureUrl: null,
  terminologyValidated: false,
  reviewNote: null,
  description: 'A search feature',
  isUpdate: false,
  updatedSteps: [],
  updateReason: null,
  originals: {},
  parentArticleIds: [],
  createdAt: '2026-03-16T00:00:00.000Z',
  updatedAt: '2026-03-16T00:00:00.000Z',
  sharedAt: null,
  approvedAt: null,
  revisionReason: null,
  revisionRequestedAt: null,
  content: {
    howto: {
      overview:
        '[INSUFFICIENT CONTEXT] The description provided does not contain enough detail to generate a complete overview.',
      steps: [],
    },
    wn: {
      overview:
        "[INSUFFICIENT CONTEXT] Unable to generate What's New content from the provided description.",
      introduction: '',
      whereToFind: '',
      closing: '',
    },
  },
  screenshots: { howto: [], wn: [] },
  confidence: { howto: [], wn: [] },
};

test.describe('Thin data handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * Helper: seed the thin article, mock the generate API, fill the form,
   * and wait for the editor to load.
   */
  async function generateThinArticle(page: import('@playwright/test').Page) {
    // Seed article so the editor can fetch it after redirect
    await page.request.post('/api/articles', { data: thinArticle });

    await mockGenerateApiThinData(page);

    await openNewArticleIntake(page);
    await page.fill('input[placeholder="e.g. Bulk volunteer import"]', 'New Feature');
    await page.locator('form#intake-form select').first().selectOption({ label: 'Settings' });
    await page.fill('textarea', 'A search feature');
    await page.click('button:has-text("Generate articles")');

    await page.waitForURL(/\/editor\//, { timeout: 15000 });
    // Wait for editor toolbar to show the article title
    await expect(page.locator('[data-toolbar]')).toContainText('New Feature', { timeout: 10000 });
  }

  test.afterEach(async ({ page }) => {
    // Clean up the seeded article
    await page.request.delete(`/api/articles/${THIN_ARTICLE_ID}`);
  });

  // -----------------------------------------------------------------------
  // 1. Generate with minimal description — mock returns thin data
  // -----------------------------------------------------------------------

  test('generate with minimal description returns thin data with INSUFFICIENT CONTEXT', async ({
    page,
  }) => {
    await generateThinArticle(page);

    // The overview area should contain the insufficient context marker
    const overview = page.locator('[data-article-overview]');
    await expect(overview).toContainText('INSUFFICIENT CONTEXT');
  });

  // -----------------------------------------------------------------------
  // 2. Editor shows thin data banner
  // -----------------------------------------------------------------------

  test('editor shows thin data banner when content has insufficient context', async ({ page }) => {
    await generateThinArticle(page);

    const banner = page.locator('[data-testid="thin-content-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      "The AI didn't have enough context to generate complete content",
    );
  });

  // -----------------------------------------------------------------------
  // 3. "Write manually" button creates empty step templates
  // -----------------------------------------------------------------------

  test('"Write manually" button creates empty step templates', async ({ page }) => {
    await generateThinArticle(page);

    // Click Write manually
    const writeManuallyBtn = page.locator('[data-testid="write-manually-btn"]');
    await expect(writeManuallyBtn).toBeVisible();
    await writeManuallyBtn.click();

    // After clicking, empty step templates should appear (Step 1, Step 2, Step 3)
    await expect(page.getByText('Step 1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 2')).toBeVisible();
    await expect(page.getByText('Step 3')).toBeVisible();

    // The thin content banner should disappear (overview cleared)
    await expect(page.locator('[data-testid="thin-content-banner"]')).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 4. Regenerate button in toolbar opens modal (recovery path)
  // -----------------------------------------------------------------------

  test('regenerate button in toolbar opens regenerate modal', async ({ page }) => {
    await generateThinArticle(page);

    // Click Regenerate in the toolbar
    const regenBtn = page.locator('[data-testid="regenerate-btn"]');
    await expect(regenBtn).toBeVisible();
    await regenBtn.click();

    // Regenerate modal should open with a description textarea
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // 5. Overview shows "[INSUFFICIENT CONTEXT]" text
  // -----------------------------------------------------------------------

  test('overview area displays INSUFFICIENT CONTEXT text', async ({ page }) => {
    await generateThinArticle(page);

    const overview = page.locator('[data-article-overview]');
    await expect(overview).toBeVisible();

    // The overview should literally contain the insufficient context marker
    const text = await overview.innerText();
    expect(text).toContain('[INSUFFICIENT CONTEXT]');
  });
});

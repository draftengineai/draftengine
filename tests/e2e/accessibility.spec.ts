/**
 * Accessibility tests — axe-core automated audit + keyboard navigation.
 *
 * Runs axe.analyze() against every major screen and asserts zero critical/serious
 * violations. Moderate and minor violations are logged as warnings.
 */
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, openNewArticleIntake, openUpdateIntake, mockFeatures } from './helpers';
import { mockGenerateApi } from '../fixtures/mock-anthropic';
import { mockGeneratedArticle, mockSharedArticle } from '../fixtures/mock-article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AxeViolation {
  id: string;
  impact: string | undefined;
  description: string;
  nodes: { html: string; target: string[] }[];
}

/**
 * Run axe-core and split results into critical/serious vs moderate/minor.
 * Fails on critical/serious, warns on the rest.
 */
async function auditPage(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  const critical: AxeViolation[] = [];
  const warnings: AxeViolation[] = [];

  for (const v of results.violations) {
    if (v.impact === 'critical' || v.impact === 'serious') {
      critical.push(v as AxeViolation);
    } else {
      warnings.push(v as AxeViolation);
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn(
      `[a11y] ${label} — ${warnings.length} moderate/minor warning(s):\n` +
        warnings.map((w) => `  - [${w.impact}] ${w.id}: ${w.description}`).join('\n')
    );
  }

  // Fail on critical/serious
  if (critical.length > 0) {
    const details = critical
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n` +
          v.nodes.map((n) => `    ${n.target.join(' > ')}\n    ${n.html.slice(0, 120)}`).join('\n')
      )
      .join('\n\n');

    expect(critical.length, `${label} has ${critical.length} critical/serious a11y violation(s):\n${details}`).toBe(0);
  }

  return { critical: critical.length, warnings: warnings.length, total: results.violations.length };
}

/**
 * Seed a mock article via the real POST API.
 */
async function seedArticle(page: Page, article: typeof mockGeneratedArticle) {
  await page.request.post('/api/articles', { data: article });
}

/**
 * Route-intercept an article by id (for GET and PATCH).
 */
async function routeArticleById(page: Page, article: typeof mockGeneratedArticle) {
  await page.route(`**/api/articles/${article.id}`, (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(article) });
    }
    if (request.method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(article) });
    }
    return route.continue();
  });
}

async function routeArticleList(page: Page, articles: typeof mockGeneratedArticle[]) {
  await page.route('**/api/articles', (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articles) });
    }
    return route.continue();
  });
}

/**
 * Navigate to editor with a seeded article via route interception.
 */
async function gotoEditor(page: Page, article: typeof mockGeneratedArticle) {
  await routeArticleById(page, article);
  await page.goto(`/editor/${article.id}`);
  await page.waitForSelector('[data-step="0"]', { timeout: 15000 });
}

// ===========================
// AXE-CORE SCREEN AUDITS
// ===========================

test.describe('Axe-core accessibility audit', () => {
  test('Login page has no critical or serious violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('h1');
    await auditPage(page, 'Login page');
  });

  test('Landing page has no critical or serious violations', async ({ page }) => {
    await login(page);
    await routeArticleList(page, [mockGeneratedArticle, mockSharedArticle]);
    await page.reload();
    await page.locator('.article-card').first().waitFor({ timeout: 10000 });
    await auditPage(page, 'Landing page');
  });

  test('Editor — How to tab has no critical or serious violations', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    await auditPage(page, 'Editor — How to tab');
  });

  test('Editor — What\'s new tab has no critical or serious violations', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    // Switch to What's New tab
    const wnTab = page.locator('button[role="tab"]', { hasText: "What's new" });
    if (await wnTab.isVisible()) {
      await wnTab.click();
      await page.waitForTimeout(500);
    }
    await auditPage(page, "Editor — What's new tab");
  });

  test('Preview page has no critical or serious violations', async ({ page }) => {
    await routeArticleById(page, mockSharedArticle);
    await page.goto(`/preview/${mockSharedArticle.id}`);
    await page.waitForSelector('h1', { timeout: 15000 });
    await auditPage(page, 'Preview page');
  });

  test('Intake modal (New article) has no critical or serious violations', async ({ page }) => {
    await login(page);
    await openNewArticleIntake(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await auditPage(page, 'Intake modal (New article)');
  });

  test('Intake modal (Update existing) has no critical or serious violations', async ({ page }) => {
    await login(page);
    await mockFeatures(page, { updateExisting: true });
    // Need articles for STATE B to show the Update action card
    await routeArticleList(page, [mockGeneratedArticle]);
    await page.reload();
    await page.locator('[data-testid="action-card-update"]').waitFor({ timeout: 10000 });
    await openUpdateIntake(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await auditPage(page, 'Intake modal (Update existing)');
  });

  test('Share modal has no critical or serious violations', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    await page.click('button:has-text("Share link")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await auditPage(page, 'Share modal');
  });

  test('Regenerate modal has no critical or serious violations', async ({ page }) => {
    await mockGenerateApi(page);
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    await page.click('[data-testid="regenerate-btn"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await auditPage(page, 'Regenerate modal');
  });
});

// ===========================
// KEYBOARD NAVIGATION TESTS
// ===========================

test.describe('Keyboard navigation', () => {
  test('Escape closes Intake modal', async ({ page }) => {
    await login(page);
    await openNewArticleIntake(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Escape closes Share modal', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    await page.click('button:has-text("Share link")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Escape closes Regenerate modal', async ({ page }) => {
    await mockGenerateApi(page);
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);
    await page.click('[data-testid="regenerate-btn"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Enter/Space activates article card on landing page', async ({ page }) => {
    await login(page);
    await routeArticleList(page, [mockGeneratedArticle]);
    await routeArticleById(page, mockGeneratedArticle);
    await page.reload();
    await page.locator('.article-card').first().waitFor({ timeout: 10000 });
    const card = page.locator('.article-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/editor\//, { timeout: 15000 });
    expect(page.url()).toContain('/editor/');
  });

  test('Tab order through editor toolbar buttons', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);

    // Focus regenerate button and tab through toolbar
    const regenBtn = page.locator('[data-testid="regenerate-btn"]');
    await regenBtn.focus();
    expect(await regenBtn.getAttribute('aria-label')).toBe('Regenerate article');

    // Tab to Share link button
    await page.keyboard.press('Tab');
    const focused1 = page.locator(':focus');
    await expect(focused1).toHaveAttribute('aria-label', 'Share link with Reviewer');

    // Tab to Export button
    await page.keyboard.press('Tab');
    const focused2 = page.locator(':focus');
    await expect(focused2).toHaveAttribute('aria-label', 'Export article');

    // Tab to Print button
    await page.keyboard.press('Tab');
    const focused3 = page.locator(':focus');
    await expect(focused3).toHaveAttribute('aria-label', 'Print article');
  });

  test('Enter/Space activates sidebar checklist items', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);

    // Sidebar checklist items with role="button" are keyboard accessible
    const checkItems = page.locator('[role="button"][aria-label*="Review"]');
    const firstItem = checkItems.first();
    if (await firstItem.isVisible()) {
      await firstItem.focus();
      await page.keyboard.press('Enter');
    }
  });

  test('Tab navigates between sidebar type tabs', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);

    // Type tabs have role="tab"
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Focus first tab and verify aria-selected
    const firstTab = tabs.first();
    await firstTab.focus();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Modals have correct role and aria attributes', async ({ page }) => {
    await login(page);
    await openNewArticleIntake(page);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'intake-modal-title');

    const title = page.locator('#intake-modal-title');
    await expect(title).toBeVisible();
  });

  test('Mode toggle has tablist/tab roles', async ({ page }) => {
    await login(page);
    await openNewArticleIntake(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    const tabs = tablist.locator('[role="tab"]');
    expect(await tabs.count()).toBe(2);

    const firstTab = tabs.first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    const secondTab = tabs.nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(firstTab).toHaveAttribute('aria-selected', 'false');
  });

  test('Format toolbar has toolbar role', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);

    const toolbar = page.locator('[role="toolbar"]');
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveAttribute('aria-label', 'Text formatting');

    const boldBtn = toolbar.locator('button[aria-label*="Bold"]');
    await expect(boldBtn).toBeVisible();
  });

  test('ContentEditable sections have textbox role and labels', async ({ page }) => {
    await login(page);
    await gotoEditor(page, mockGeneratedArticle);

    const overview = page.locator('[role="textbox"][aria-label="Article overview"]');
    await expect(overview).toBeVisible();

    const stepTextbox = page.locator('[role="textbox"][aria-label="Step 1 text"]');
    await expect(stepTextbox).toBeVisible();
  });
});

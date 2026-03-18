import { Page } from '@playwright/test';

const TEST_PASSWORD = process.env.GATEDOC_PASSWORD || 'test';
const TEST_ADMIN_PASSWORD = process.env.GATEDOC_ADMIN_PASSWORD || 'admin-test';

/**
 * Log in via the login page as a writer. After this call the browser has the
 * `gatedoc_auth` cookie and is redirected to the landing page.
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="password"]#login-password', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // Next.js uses client-side routing (router.push), so wait for the
  // landing page heading instead of a full-page navigation event.
  await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]', { timeout: 15000 });
}

/**
 * Log in as admin via the login page.
 */
export async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.click('[data-testid="admin-access-link"]');
  await page.fill('[data-testid="admin-password-input"]', TEST_ADMIN_PASSWORD);
  await page.click('[data-testid="admin-login-btn"]');
  await page.waitForSelector('h1:has-text("GateDoc Admin")', { timeout: 15000 });
}

/**
 * Open the intake modal for a new article.
 * Works in both STATE A (empty, "Get started" button) and STATE B (has articles, action card).
 */
export async function openNewArticleIntake(page: Page) {
  const getStarted = page.locator('[data-testid="get-started-btn"]');
  const actionCard = page.locator('[data-testid="action-card-new"]');
  // Wait for either to appear
  await page.waitForSelector('[data-testid="get-started-btn"], [data-testid="action-card-new"]', { timeout: 10000 });
  if (await getStarted.isVisible()) {
    await getStarted.click();
  } else {
    await actionCard.click();
  }
}

/**
 * Open the intake modal in update mode.
 * Requires STATE B (articles exist) with updateExisting flag enabled.
 */
export async function openUpdateIntake(page: Page) {
  await page.locator('[data-testid="action-card-update"]').waitFor({ timeout: 10000 });
  await page.click('[data-testid="action-card-update"]');
}

/**
 * Mock the features API to return custom feature flags.
 */
export async function mockFeatures(page: Page, flags: Record<string, boolean>) {
  const defaults = {
    updateExisting: true,
    shareWithReviewer: true,
    approveWorkflow: true,
    confidenceFlags: true,
    completedSection: true,
    verifiedFacts: true,
    reviewerNote: true,
    regenerate: true,
    deleteArticles: true,
    updateIndicators: true,
  };
  const merged = { ...defaults, ...flags };
  await page.route('**/api/admin/features', (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, json: merged });
    }
    return route.fulfill({ status: 200, json: { success: true } });
  });
}

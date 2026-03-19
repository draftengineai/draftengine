import { Page } from '@playwright/test';

const TEST_PASSWORD = process.env.DRAFTENGINE_PASSWORD || 'test';
const TEST_ADMIN_PASSWORD = process.env.DRAFTENGINE_ADMIN_PASSWORD || 'admin-test';

/**
 * Log in via the login page as a writer. After this call the browser has the
 * `draftengine_auth` cookie and is redirected to the landing page.
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="password"]#login-password', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for navigation to /dashboard, then for the page content to render.
  // Production builds are slower to hydrate on CI runners.
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]', { timeout: 30000 });
}

/**
 * Log in as admin via the login page.
 */
export async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.click('[data-testid="admin-access-link"]');
  await page.fill('[data-testid="admin-password-input"]', TEST_ADMIN_PASSWORD);
  await page.click('[data-testid="admin-login-btn"]');
  await page.waitForSelector('h1:has-text("DraftEngine Admin")', { timeout: 30000 });
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

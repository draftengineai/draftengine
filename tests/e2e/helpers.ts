import { Page } from '@playwright/test';
import { SignJWT } from 'jose';

const TEST_PASSWORD = process.env.DRAFTENGINE_PASSWORD || 'test';
const TEST_ADMIN_PASSWORD = process.env.DRAFTENGINE_ADMIN_PASSWORD || 'admin-test';
const TEST_SECRET = process.env.DRAFTENGINE_SECRET || 'dev-secret-not-for-production';

/**
 * Generate a signed auth cookie value for tests.
 */
export async function signTestCookie(role: string = 'writer'): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/**
 * Set a signed auth cookie and navigate to /dashboard.
 * This is the standard way to authenticate in tests — it bypasses the login UI
 * and goes straight to the dashboard, which is fast and reliable on CI.
 *
 * Use `loginViaUI` only in auth.spec.ts where the login page itself is under test.
 */
export async function login(page: Page) {
  const token = await signTestCookie('writer');
  await page.context().addCookies([
    { name: 'draftengine_auth', value: token, domain: 'localhost', path: '/' },
  ]);
  await page.goto('/dashboard');
  await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]', { timeout: 15000 });
}

/**
 * Set a signed admin auth cookie and navigate to /admin/dashboard.
 */
export async function loginAdmin(page: Page) {
  const token = await signTestCookie('admin');
  await page.context().addCookies([
    { name: 'draftengine_auth', value: token, domain: 'localhost', path: '/' },
  ]);
  await page.goto('/admin/dashboard');
  await page.waitForSelector('h1:has-text("DraftEngine Admin")', { timeout: 15000 });
}

/**
 * Log in via the actual login page UI. Only use this in tests that specifically
 * test the login flow (auth.spec.ts).
 */
export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="password"]#login-password', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 60000 });
  await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]', { timeout: 60000 });
}

/**
 * Log in as admin via the actual login page UI.
 */
export async function loginAdminViaUI(page: Page) {
  await page.goto('/login');
  await page.click('[data-testid="admin-access-link"]');
  await page.fill('[data-testid="admin-password-input"]', TEST_ADMIN_PASSWORD);
  await page.click('[data-testid="admin-login-btn"]');
  await page.waitForSelector('h1:has-text("DraftEngine Admin")', { timeout: 60000 });
}

/**
 * Open the intake modal for a new article.
 * Works in both STATE A (empty, "Get started" button) and STATE B (has articles, action card).
 */
export async function openNewArticleIntake(page: Page) {
  const getStarted = page.locator('[data-testid="get-started-btn"]');
  const actionCard = page.locator('[data-testid="action-card-new"]');
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

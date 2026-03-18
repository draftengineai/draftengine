import { test, expect } from '@playwright/test';
import { login } from './helpers';

const TEST_PASSWORD = process.env.GATEDOC_PASSWORD || 'test';

test.describe('Authentication', () => {
  test('login page renders at /login with password field and Sign in button', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toHaveText('GateDoc');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');
  });

  test('wrong password shows error message, stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'wrong-password-xyz');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Incorrect password')).toBeVisible();
    expect(page.url()).toContain('/login');
  });

  test('correct password redirects to landing page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]#login-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Landing page shows either "My articles" (has articles) or "Generate your first article" (empty)
    await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]', { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('protected routes redirect to /login without auth cookie', async ({ page }) => {
    await page.goto('/editor/any-id');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('preview routes are accessible without auth', async ({ page }) => {
    // Preview pages are public for Reviewers — no redirect to /login.
    // The page may show a 404 for a non-existent article, but it should
    // NOT redirect to /login.
    const response = await page.goto('/preview/any-id');
    expect(page.url()).toContain('/preview/any-id');
    expect(page.url()).not.toContain('/login');
  });

  test('after login, refreshing the page stays authenticated', async ({ page }) => {
    await login(page);
    // Landing page shows either "My articles" or welcome card
    await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]');

    // Reload — cookie should persist
    await page.reload();
    await page.waitForSelector('h1:has-text("My articles"), [data-testid="welcome-card"]');
    expect(page.url()).not.toContain('/login');
  });
});

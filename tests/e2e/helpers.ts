import { Page } from '@playwright/test';

const TEST_PASSWORD = process.env.GATEDOC_PASSWORD || 'test';

/**
 * Log in via the login page. After this call the browser has the
 * `gatedoc_auth` cookie and is redirected to the landing page.
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // Next.js uses client-side routing (router.push), so wait for the
  // landing page heading instead of a full-page navigation event.
  await page.waitForSelector('h1:has-text("My articles")', { timeout: 15000 });
}

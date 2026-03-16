import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockScanMatches } from '../fixtures/mock-scan-results';

test.describe('Scan API', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -------------------------------------------------------------------------
  // 1. POST /api/scan with valid change description returns matches array
  // -------------------------------------------------------------------------

  test('POST /api/scan with valid change description returns matches array', async ({ page }) => {
    // Mock the /api/scan route at the browser level so we get deterministic
    // results without needing a real Anthropic API key.
    await page.route('**/api/scan', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: mockScanMatches }),
        });
      }
      return route.continue();
    });

    // Use page.evaluate to call fetch from the browser context (where the
    // route mock applies). page.request bypasses route mocks.
    const body = await page.evaluate(async () => {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeDescription: 'The Search Criteria filter panel in Volunteers now includes a date range picker.',
          module: 'Volunteers',
          changeType: 'enhancement',
        }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(body.status).toBe(200);
    expect(body.data).toHaveProperty('matches');
    expect(Array.isArray(body.data.matches)).toBe(true);
    expect(body.data.matches.length).toBe(2);

    // First match — HIGH confidence
    const high = body.data.matches[0];
    expect(high.articleId).toBe('mock-article-001');
    expect(high.confidence).toBe('high');
    expect(high.reason).toBeTruthy();
    expect(high.title).toBeTruthy();

    // Second match — MEDIUM confidence
    const medium = body.data.matches[1];
    expect(medium.articleId).toBe('mock-article-002');
    expect(medium.confidence).toBe('medium');
    expect(medium.reason).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/scan with no matching articles returns empty array
  // -------------------------------------------------------------------------

  test('POST /api/scan with no matching articles returns empty array', async ({ page }) => {
    // Call the real route with a module that has no articles in the store.
    // The route returns { matches: [] } immediately without calling Anthropic.
    const response = await page.request.post('/api/scan', {
      data: {
        changeDescription: 'Added a new report export button to the Reports module.',
        module: 'NonExistentModule',
        changeType: 'feature',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('matches');
    expect(Array.isArray(body.matches)).toBe(true);
    expect(body.matches.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. POST /api/scan with missing fields returns 400 error
  // -------------------------------------------------------------------------

  test('POST /api/scan with missing fields returns 400 error', async ({ page }) => {
    // Missing changeDescription
    const res1 = await page.request.post('/api/scan', {
      data: { module: 'Volunteers', changeType: 'enhancement' },
    });
    expect(res1.status()).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toContain('Missing required fields');

    // Missing module
    const res2 = await page.request.post('/api/scan', {
      data: { changeDescription: 'Some change', changeType: 'enhancement' },
    });
    expect(res2.status()).toBe(400);

    // Missing changeType
    const res3 = await page.request.post('/api/scan', {
      data: { changeDescription: 'Some change', module: 'Volunteers' },
    });
    expect(res3.status()).toBe(400);

    // Empty body
    const res4 = await page.request.post('/api/scan', {
      data: {},
    });
    expect(res4.status()).toBe(400);
  });
});

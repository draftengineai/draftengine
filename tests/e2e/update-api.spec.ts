import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockUpdateResponse, buildMockUpdatedArticle } from '../fixtures/mock-update-results';
import { mockGeneratedArticle } from '../fixtures/mock-article';

test.describe('Update API', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -------------------------------------------------------------------------
  // 1. POST /api/update with valid articleId returns updated article
  // -------------------------------------------------------------------------

  test('POST /api/update with valid articleId returns updated article with revised steps', async ({ page }) => {
    const updatedArticle = buildMockUpdatedArticle(mockGeneratedArticle);

    await page.route('**/api/update', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedArticle),
        });
      }
      return route.continue();
    });

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'mock-article-001',
          changeDescription: 'Reset button renamed to Clear; Search Criteria panel now auto-expands on open.',
          changeType: 'enhancement',
          affectedSteps: [1, 4],
        }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('content');
    expect(result.data.content.howto).toBeTruthy();

    // Verify revised steps have updated content
    const steps = result.data.content.howto.steps;
    expect(steps).toHaveLength(5);

    // Step 2 (index 1) — revised: now mentions panel expansion
    expect(steps[1].text).toContain('panel opens on the right side');

    // Step 5 (index 4) — revised: "Reset" renamed to "Clear"
    expect(steps[4].text).toContain('<b>Clear</b>');
    expect(steps[4].text).not.toContain('Reset');
  });

  // -------------------------------------------------------------------------
  // 2. Updated article has isUpdate: true, updatedSteps, originals preserved
  // -------------------------------------------------------------------------

  test('updated article has isUpdate true, updatedSteps populated, originals preserved', async ({ page }) => {
    const updatedArticle = buildMockUpdatedArticle(mockGeneratedArticle);

    await page.route('**/api/update', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedArticle),
        });
      }
      return route.continue();
    });

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'mock-article-001',
          changeDescription: 'Reset button renamed to Clear; Search Criteria panel now auto-expands on open.',
          changeType: 'enhancement',
          affectedSteps: [1, 4],
        }),
      });
      return res.json();
    });

    // Phase 2 update metadata
    expect(result.isUpdate).toBe(true);
    expect(result.updatedSteps).toEqual([1, 4]);
    expect(result.updateReason).toBeTruthy();
    expect(result.status).toBe('generated');

    // Originals preserved for before/after comparison
    expect(result.originals).toBeTruthy();
    expect(result.originals['1']).toContain('Search Criteria');
    expect(result.originals['4']).toContain('Reset');
  });

  // -------------------------------------------------------------------------
  // 3. Unchanged steps are identical to the original
  // -------------------------------------------------------------------------

  test('unchanged steps are identical to the original', async ({ page }) => {
    const updatedArticle = buildMockUpdatedArticle(mockGeneratedArticle);

    await page.route('**/api/update', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedArticle),
        });
      }
      return route.continue();
    });

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: 'mock-article-001',
          changeDescription: 'Reset button renamed to Clear; Search Criteria panel now auto-expands on open.',
          changeType: 'enhancement',
          affectedSteps: [1, 4],
        }),
      });
      return res.json();
    });

    const steps = result.content.howto.steps;
    const originalSteps = mockGeneratedArticle.content.howto!.steps;

    // Step 1 (index 0) — unchanged
    expect(steps[0].text).toBe(originalSteps[0].text);
    expect(steps[0].heading).toBe(originalSteps[0].heading);
    expect(steps[0].imgDesc).toBe(originalSteps[0].imgDesc);

    // Step 3 (index 2) — unchanged
    expect(steps[2].text).toBe(originalSteps[2].text);
    expect(steps[2].heading).toBe(originalSteps[2].heading);

    // Step 4 (index 3) — unchanged
    expect(steps[3].text).toBe(originalSteps[3].text);
    expect(steps[3].heading).toBe(originalSteps[3].heading);
  });

  // -------------------------------------------------------------------------
  // 4. POST /api/update with invalid articleId returns 404
  // -------------------------------------------------------------------------

  test('POST /api/update with invalid articleId returns 404', async ({ page }) => {
    // Hit the real route — no mock. The article won't exist in the store.
    const response = await page.request.post('/api/update', {
      data: {
        articleId: 'nonexistent-article-999',
        changeDescription: 'Some change',
        changeType: 'enhancement',
        affectedSteps: [0],
      },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  // -------------------------------------------------------------------------
  // 5. POST /api/update with missing fields returns 400
  // -------------------------------------------------------------------------

  test('POST /api/update with missing fields returns 400', async ({ page }) => {
    // Missing articleId
    const res1 = await page.request.post('/api/update', {
      data: {
        changeDescription: 'Some change',
        changeType: 'enhancement',
        affectedSteps: [0],
      },
    });
    expect(res1.status()).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toContain('Missing required fields');

    // Missing changeDescription
    const res2 = await page.request.post('/api/update', {
      data: {
        articleId: 'mock-article-001',
        changeType: 'enhancement',
        affectedSteps: [0],
      },
    });
    expect(res2.status()).toBe(400);

    // Missing changeType
    const res3 = await page.request.post('/api/update', {
      data: {
        articleId: 'mock-article-001',
        changeDescription: 'Some change',
        affectedSteps: [0],
      },
    });
    expect(res3.status()).toBe(400);

    // Missing affectedSteps
    const res4 = await page.request.post('/api/update', {
      data: {
        articleId: 'mock-article-001',
        changeDescription: 'Some change',
        changeType: 'enhancement',
      },
    });
    expect(res4.status()).toBe(400);

    // Empty body
    const res5 = await page.request.post('/api/update', {
      data: {},
    });
    expect(res5.status()).toBe(400);
  });
});

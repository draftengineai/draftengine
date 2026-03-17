import { test, expect } from '@playwright/test';
import { login, openNewArticleIntake, openUpdateIntake, mockFeatures } from './helpers';
import { mockScanMatches } from '../fixtures/mock-scan-results';
import { mockGeneratedArticle } from '../fixtures/mock-article';
import { buildMockUpdatedArticle } from '../fixtures/mock-update-results';

test.describe('Update Intake', () => {
  test.beforeEach(async ({ page }) => {
    await mockFeatures(page, { updateExisting: true });
    await login(page);
  });

  // -------------------------------------------------------------------------
  // 1. Mode toggle switches between New article and Update existing
  // -------------------------------------------------------------------------

  test('mode toggle switches between New article and Update existing', async ({ page }) => {
    await openNewArticleIntake(page);

    // Starts in New article mode — form has "Feature title" and "Generate articles"
    await expect(page.locator('label', { hasText: 'Feature title' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Generate articles' })).toBeVisible();

    // Switch to Update existing via modal's mode toggle
    await page.locator('[data-testid="mode-update"]').click();

    // Now shows update-specific UI — "What changed" label and "Find affected articles"
    await expect(page.locator('label', { hasText: 'What changed' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Find affected articles' })).toBeVisible();
    // "Feature title" should NOT be visible (not required for updates)
    await expect(page.locator('form#intake-form')).toHaveCount(0);

    // Switch back to New article via modal's mode toggle
    await page.locator('[data-testid="mode-new"]').click();
    await expect(page.locator('label', { hasText: 'Feature title' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Generate articles' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Update mode shows "WHAT CHANGED" label and "Find affected articles" button
  // -------------------------------------------------------------------------

  test('update mode shows WHAT CHANGED label and Find affected articles button', async ({ page }) => {
    // Open directly in update mode via the landing page button
    await openUpdateIntake(page);

    // "What changed" label visible (uppercase rendered by CSS)
    const whatChangedLabel = page.locator('label', { hasText: 'What changed' });
    await expect(whatChangedLabel).toBeVisible();

    // Description textarea has the update-specific placeholder
    const textarea = page.locator('form#update-form textarea');
    await expect(textarea).toHaveAttribute(
      'placeholder',
      /Describe what changed about this feature/,
    );

    // Module and Type of change fields present
    await expect(page.locator('form#update-form label', { hasText: 'Module' })).toBeVisible();
    await expect(page.locator('form#update-form label', { hasText: 'Type of change' })).toBeVisible();

    // "Find affected articles" button visible but disabled (no fields filled)
    const scanBtn = page.locator('button', { hasText: 'Find affected articles' });
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toBeDisabled();

    // No How to / What's new checkboxes in update mode
    await expect(page.locator('label', { hasText: 'How to' }).locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(page.locator('label', { hasText: "What's new" }).locator('input[type="checkbox"]')).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // 3. Find affected articles calls /api/scan and displays results
  // -------------------------------------------------------------------------

  test('Find affected articles calls /api/scan and displays results with confidence badges', async ({ page }) => {
    // Mock /api/scan
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

    await openUpdateIntake(page);

    // Fill required fields
    await page.locator('form#update-form select').first().selectOption({ label: 'Volunteers' });
    await page.locator('form#update-form textarea').fill(
      'The Search Criteria filter panel now includes a date range picker for availability.',
    );

    // Click "Find affected articles"
    await page.click('button:has-text("Find affected articles")');

    // Scan results appear (loading state may flash too quickly to assert with mocked route)
    await expect(page.locator('[data-testid="scan-results"]')).toBeVisible({ timeout: 10000 });

    // Two matches displayed
    const matches = page.locator('[data-testid="scan-match"]');
    await expect(matches).toHaveCount(2);

    // First match — HIGH confidence badge (red)
    const firstMatch = matches.first();
    await expect(firstMatch).toContainText('Search Criteria for Volunteers');
    await expect(firstMatch.locator('[data-testid="confidence-high"]')).toBeVisible();
    await expect(firstMatch.locator('[data-testid="confidence-high"]')).toContainText('HIGH');

    // Second match — MEDIUM confidence badge (amber)
    const secondMatch = matches.nth(1);
    await expect(secondMatch).toContainText('Managing Volunteer Assignments');
    await expect(secondMatch.locator('[data-testid="confidence-medium"]')).toBeVisible();
    await expect(secondMatch.locator('[data-testid="confidence-medium"]')).toContainText('MEDIUM');

    // "Update selected articles" button should now be visible
    await expect(page.locator('button', { hasText: 'Update selected articles' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Checkboxes pre-checked for HIGH/MEDIUM, unchecked for LOW
  // -------------------------------------------------------------------------

  test('checkboxes pre-checked for HIGH/MEDIUM, unchecked for LOW', async ({ page }) => {
    // Add a LOW confidence match to the mock results
    const matchesWithLow = [
      ...mockScanMatches,
      {
        articleId: 'mock-article-003',
        title: 'Volunteer FAQ',
        module: 'Volunteers',
        types: ['howto'] as const,
        confidence: 'low' as const,
        reason: 'Tangentially related — mentions Volunteers module but no overlapping UI elements.',
      },
    ];

    await page.route('**/api/scan', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: matchesWithLow }),
        });
      }
      return route.continue();
    });

    await openUpdateIntake(page);

    await page.locator('form#update-form select').first().selectOption({ label: 'Volunteers' });
    await page.locator('form#update-form textarea').fill('Date range picker added to Search Criteria panel.');
    await page.click('button:has-text("Find affected articles")');

    await expect(page.locator('[data-testid="scan-results"]')).toBeVisible({ timeout: 10000 });

    const matches = page.locator('[data-testid="scan-match"]');
    await expect(matches).toHaveCount(3);

    // HIGH (index 0) — pre-checked
    const highCheckbox = matches.nth(0).locator('input[type="checkbox"]');
    await expect(highCheckbox).toBeChecked();

    // MEDIUM (index 1) — pre-checked
    const mediumCheckbox = matches.nth(1).locator('input[type="checkbox"]');
    await expect(mediumCheckbox).toBeChecked();

    // LOW (index 2) — NOT checked
    const lowCheckbox = matches.nth(2).locator('input[type="checkbox"]');
    await expect(lowCheckbox).not.toBeChecked();

    // LOW confidence badge visible
    await expect(matches.nth(2).locator('[data-testid="confidence-low"]')).toContainText('LOW');
  });

  // -------------------------------------------------------------------------
  // 5. "Update selected articles" calls /api/update for checked articles
  // -------------------------------------------------------------------------

  test('Update selected articles calls /api/update for checked articles', async ({ page }) => {
    const updatedArticle = buildMockUpdatedArticle(mockGeneratedArticle);

    // Seed the article so the editor can load it after redirect
    await page.request.post('/api/articles', { data: updatedArticle });

    // Mock scan
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

    // Mock update — track which article IDs were updated
    const updateCalls: string[] = [];
    await page.route('**/api/update', (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const body = JSON.parse(postData);
          updateCalls.push(body.articleId);
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedArticle),
        });
      }
      return route.continue();
    });

    await openUpdateIntake(page);
    await page.locator('form#update-form select').first().selectOption({ label: 'Volunteers' });
    await page.locator('form#update-form textarea').fill('Reset button renamed to Clear.');
    await page.click('button:has-text("Find affected articles")');

    await expect(page.locator('[data-testid="scan-results"]')).toBeVisible({ timeout: 10000 });

    // Both HIGH and MEDIUM are pre-checked — click Update
    await page.click('button:has-text("Update selected articles")');

    // Should redirect to editor
    await page.waitForURL(/\/editor\//, { timeout: 15000 });

    // Verify both articles were sent to the update API
    expect(updateCalls).toContain('mock-article-001');
    expect(updateCalls).toContain('mock-article-002');

    // Cleanup
    await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`);
  });

  // -------------------------------------------------------------------------
  // 6. No matches shows appropriate message
  // -------------------------------------------------------------------------

  test('no matches shows appropriate message', async ({ page }) => {
    // Mock scan to return empty results
    await page.route('**/api/scan', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matches: [] }),
        });
      }
      return route.continue();
    });

    await openUpdateIntake(page);
    await page.locator('form#update-form select').first().selectOption({ label: 'Volunteers' });
    await page.locator('form#update-form textarea').fill('Some change that matches nothing.');
    await page.click('button:has-text("Find affected articles")');

    // Wait for results
    await expect(page.locator('[data-testid="scan-results"]')).toBeVisible({ timeout: 10000 });

    // No matches message
    await expect(page.locator('[data-testid="no-matches"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-matches"]')).toContainText(
      'No affected articles found',
    );

    // "Update selected articles" button should NOT appear when there are no matches
    await expect(page.locator('button', { hasText: 'Update selected articles' })).toHaveCount(0);
  });
});

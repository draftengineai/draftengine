import { test, expect } from '@playwright/test';
import { login, openNewArticleIntake } from './helpers';
import { ftr3849Intake } from '../fixtures/sample-intake';
import { mockGenerateApi } from '../fixtures/mock-anthropic';
import { mockGeneratedArticle } from '../fixtures/mock-article';

test.describe('Generate flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -----------------------------------------------------------------------
  // 1. Intake form opens with all required + optional fields
  // -----------------------------------------------------------------------

  test('intake form opens with all required and optional fields', async ({ page }) => {
    await openNewArticleIntake(page);

    // Required fields
    await expect(page.locator('label', { hasText: 'Feature title' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Module' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Type of change' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Description' })).toBeVisible();

    // Optional fields
    await expect(page.locator('label', { hasText: 'Feature or ticket link' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'UX behavior rules' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'User stories' })).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 2. Submit with empty required fields shows validation errors
  // -----------------------------------------------------------------------

  test('submit with empty required fields keeps button disabled', async ({ page }) => {
    await openNewArticleIntake(page);

    // The Generate button should be disabled when required fields are empty
    const generateBtn = page.locator('button[type="submit"]', { hasText: 'Generate articles' });
    await expect(generateBtn).toBeDisabled();

    // Fill only title — still disabled (module + description missing)
    await page.fill('input[placeholder="e.g. Bulk volunteer import"]', 'Test Feature');
    await expect(generateBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 3. Short description shows warning but allows generation
  // -----------------------------------------------------------------------

  test('short description shows warning but generate button stays enabled', async ({ page }) => {
    await openNewArticleIntake(page);

    // Fill all required fields
    await page.fill('input[placeholder="e.g. Bulk volunteer import"]', 'Test Feature');
    await page.locator('form#intake-form select').first().selectOption({ label: 'Volunteers' });
    await page.fill('textarea', 'Short desc');

    // Warning appears for description under 50 chars
    await expect(page.locator('[data-testid="thin-description-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="thin-description-warning"]')).toContainText(
      'Your description is very brief',
    );

    // Generate button should still be enabled
    const generateBtn = page.locator('button[type="submit"]', { hasText: 'Generate articles' });
    await expect(generateBtn).toBeEnabled();
  });

  // -----------------------------------------------------------------------
  // 4. Successful generation: fill form, mock API, verify loading + redirect
  // -----------------------------------------------------------------------

  test('successful generation shows loading screen then redirects to editor', async ({ page }) => {
    // Seed the article so the editor can fetch it after redirect
    await page.request.post('/api/articles', { data: mockGeneratedArticle });

    // Install mock that returns the same article
    await mockGenerateApi(page);

    await openNewArticleIntake(page);

    // Fill form with sample-intake fixture data
    await page.fill('input[placeholder="e.g. Bulk volunteer import"]', ftr3849Intake.title);
    await page.locator('form#intake-form select').first().selectOption({ label: ftr3849Intake.module });
    await page.fill('textarea', ftr3849Intake.description);

    // Submit
    await page.click('button:has-text("Generate articles")');

    // Loading screen should appear with animated steps
    await expect(page.getByRole('heading', { name: 'Generating' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Reading feature details')).toBeVisible();

    // After mock resolves, should redirect to editor
    await page.waitForURL(/\/editor\//, { timeout: 15000 });

    // Editor should show the article title and content
    await expect(page.locator('[data-toolbar]')).toContainText('Search Criteria for Volunteers', { timeout: 10000 });

    // Cleanup
    await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`);
  });

  // -----------------------------------------------------------------------
  // 5. Both How To and What's New checkboxes checked by default
  // -----------------------------------------------------------------------

  test('How To and What\'s New checkboxes are checked by default', async ({ page }) => {
    await openNewArticleIntake(page);

    const howToCheckbox = page.locator('label', { hasText: 'How to' }).locator('input[type="checkbox"]');
    const whatsNewCheckbox = page.locator('label', { hasText: "What's new" }).locator('input[type="checkbox"]');

    await expect(howToCheckbox).toBeChecked();
    await expect(whatsNewCheckbox).toBeChecked();
  });

  // -----------------------------------------------------------------------
  // 6. Unchecking What's New generates only How To (no WN tab in editor)
  // -----------------------------------------------------------------------

  test('unchecking What\'s New generates only How To article', async ({ page }) => {
    const howtoOnlyArticle = {
      ...mockGeneratedArticle,
      id: 'mock-howto-only',
      types: ['howto'],
      content: {
        howto: mockGeneratedArticle.content.howto,
      },
      screenshots: { howto: [false, false, false, false, false] },
      confidence: { howto: [null, null, null, null, null], wn: [] },
    };

    // Seed the article so the editor can fetch it
    await page.request.post('/api/articles', { data: howtoOnlyArticle });

    // Mock generate API to return howto-only article
    await page.route('**/api/generate', (route) => {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(howtoOnlyArticle),
      });
    });

    await openNewArticleIntake(page);

    // Uncheck What's New
    const whatsNewCheckbox = page.locator('label', { hasText: "What's new" }).locator('input[type="checkbox"]');
    await whatsNewCheckbox.uncheck();
    await expect(whatsNewCheckbox).not.toBeChecked();

    // Fill required fields
    await page.fill('input[placeholder="e.g. Bulk volunteer import"]', ftr3849Intake.title);
    await page.locator('form#intake-form select').first().selectOption({ label: ftr3849Intake.module });
    await page.fill('textarea', ftr3849Intake.description);

    // Submit
    await page.click('button:has-text("Generate articles")');

    // Wait for redirect to editor
    await page.waitForURL(/\/editor\//, { timeout: 15000 });

    // The sidebar should show How to but NOT What's new
    await expect(page.locator('[data-sidebar]')).toContainText('How to', { timeout: 10000 });
    const wnTab = page.locator('[data-sidebar]').getByText("What's new");
    await expect(wnTab).toHaveCount(0);

    // Cleanup
    await page.request.delete('/api/articles/mock-howto-only');
  });
});

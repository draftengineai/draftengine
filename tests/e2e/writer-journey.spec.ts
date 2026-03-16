import { test, expect } from '@playwright/test';

test.describe('Phase 1: New Article Writer Journey', () => {
  test('landing page loads with article list', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('My articles');
  });

  test('new article button opens intake modal', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New article');
    await expect(page.locator('text=New article')).toBeVisible();
  });

  test('shows thin-description warning when description is brief', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New article');

    // Type a short description (under 50 chars)
    const descriptionField = page.locator('textarea[placeholder*="Explain what the feature"]');
    await descriptionField.fill('A feature');

    // Warning should appear
    const warning = page.getByTestId('thin-description-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Your description is very brief');

    // Generate button should NOT be disabled (warning is non-blocking)
    // Fill required fields first
    await page.locator('input[placeholder*="Bulk volunteer"]').fill('Test Feature');
    await page.locator('select').first().selectOption({ index: 1 });

    const generateBtn = page.locator('button:has-text("Generate articles")');
    await expect(generateBtn).toBeEnabled();
  });

  test('thin-description warning disappears when description is long enough', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New article');

    const descriptionField = page.locator('textarea[placeholder*="Explain what the feature"]');

    // Short description shows warning
    await descriptionField.fill('A feature');
    await expect(page.getByTestId('thin-description-warning')).toBeVisible();

    // Longer description hides warning
    await descriptionField.fill(
      'This feature allows users to import volunteers in bulk using a CSV file from the Settings > Import page.'
    );
    await expect(page.getByTestId('thin-description-warning')).not.toBeVisible();
  });

  test.skip('full generation flow', async ({ page }) => {
    // TODO: Requires ANTHROPIC_API_KEY
    await page.goto('/');
    await page.click('text=New article');
    await page.fill('input[placeholder*="Search for an Applicant"]', 'Test Feature');
    // ... complete flow
  });

  test.skip('regenerate button opens modal in editor', async ({ page }) => {
    // TODO: Requires a generated article (ANTHROPIC_API_KEY)
    // Navigate to editor with an existing article
    // Verify Regenerate button is visible in toolbar
    // Click Regenerate → modal opens with title, module, type pre-filled
    // Fill description, click Regenerate → new content replaces old
  });
});

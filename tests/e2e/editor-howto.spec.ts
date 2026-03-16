import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockGeneratedArticle } from '../fixtures/mock-article';

test.describe('Editor — How To', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Seed article via API
    await page.request.post('/api/articles', { data: mockGeneratedArticle });
    await page.goto(`/editor/${mockGeneratedArticle.id}`);
    // Wait for the editor toolbar to confirm the article loaded
    await page.locator('[data-toolbar]').waitFor({ timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`/api/articles/${mockGeneratedArticle.id}`);
  });

  // 1. Editor loads with article title and "How to" badge in header
  test('editor loads with article title and How to badge', async ({ page }) => {
    const toolbar = page.locator('[data-toolbar]');
    await expect(toolbar).toContainText('Search Criteria for Volunteers');
    await expect(toolbar.locator('span', { hasText: 'How to' })).toBeVisible();
  });

  // 2. Overview renders in italics within the purple overview band
  test('overview renders in italics within the purple overview band', async ({ page }) => {
    const overview = page.locator('[data-article-overview]');
    await expect(overview).toBeVisible();
    // The overview band has fontStyle: italic
    await expect(overview).toHaveCSS('font-style', 'italic');
    // Contains the mock overview text
    await expect(overview).toContainText(
      'Search Criteria feature in the Volunteers module'
    );
  });

  // 3. Steps numbered correctly ("Step 1 of X:", "Step 2 of X:", etc.)
  test('steps numbered correctly', async ({ page }) => {
    const steps = page.locator('[data-step]');
    await expect(steps).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      await expect(steps.nth(i)).toContainText(`Step ${i + 1} of 5:`);
    }
  });

  // 4. Bold elements render as bold in step text
  test('bold elements render as bold in step text', async ({ page }) => {
    // Step 1 has <b>Volunteers</b>
    const step0 = page.locator('[data-step="0"]');
    await expect(step0.locator('b', { hasText: 'Volunteers' })).toBeVisible();

    // Step 2 has <b>Search Criteria</b>
    const step1 = page.locator('[data-step="1"]');
    await expect(step1.locator('b', { hasText: 'Search Criteria' })).toBeVisible();

    // Step 4 has <b>Apply</b>
    const step3 = page.locator('[data-step="3"]');
    await expect(step3.locator('b', { hasText: 'Apply' })).toBeVisible();
  });

  // 5. Screenshot placeholders show camera icon and description text
  test('screenshot placeholders show camera icon and description', async ({ page }) => {
    // All 5 steps should have unfilled screenshot slots
    const slots = page.locator('[data-screenshot-slot]');
    await expect(slots).toHaveCount(5);

    // First slot should have camera icon (svg) and description text
    const firstSlot = slots.first();
    await expect(firstSlot.locator('svg')).toBeVisible();
    await expect(firstSlot).toContainText('Click to add');
    await expect(firstSlot).toContainText('Screenshot showing the main menu with Volunteers highlighted');
  });

  // 6. Contenteditable typing works correctly (not backwards)
  test('contenteditable typing works correctly', async ({ page }) => {
    // Focus the first step's contenteditable text area
    const step0Text = page.locator('[data-step="0"] [contenteditable="true"]').first();
    await step0Text.click();

    // Clear existing content and type new text
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('test text');

    // Verify the typed text appears in correct order
    await expect(step0Text).toContainText('test text');
  });

  // 7. Sidebar shows "How to" tab with "Editing" badge and "What's new" tab with "View" badge
  test('sidebar shows correct tabs with badges', async ({ page }) => {
    const sidebar = page.locator('[data-sidebar]');

    // How to tab should show "Editing" badge (it's the active tab)
    const howToTab = sidebar.locator('button', { hasText: 'How to' });
    await expect(howToTab).toBeVisible();
    await expect(howToTab.locator('span', { hasText: 'Editing' })).toBeVisible();

    // What's new tab should show "View" badge
    const wnTab = sidebar.locator('button', { hasText: "What's new" });
    await expect(wnTab).toBeVisible();
    await expect(wnTab.locator('span', { hasText: 'View' })).toBeVisible();
  });

  // 8. Sidebar checklist shows expected items
  test('sidebar checklist shows review, screenshots, flags, and share items', async ({ page }) => {
    const sidebar = page.locator('[data-sidebar]');

    // Review and edit text
    await expect(sidebar.getByText('Review and edit text')).toBeVisible();

    // Add screenshots with count (0/5 for 5 steps, all unfilled)
    await expect(sidebar.getByText('Add screenshots')).toBeVisible();
    await expect(sidebar.getByText('0/5', { exact: true })).toBeVisible();

    // Review flags with remaining count (1 flag on step 3)
    await expect(sidebar.getByText('Review flags')).toBeVisible();
    await expect(sidebar.getByText('1 remaining')).toBeVisible();

    // Share with Steward
    await expect(sidebar.getByText('Share with Steward')).toBeVisible();
  });
});

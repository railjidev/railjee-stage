import { test, expect } from '@playwright/test';

/**
 * Department tests — authenticated (uses storageState: 'e2e/auth.json').
 * Tests the /departments list page and /departments/[deptId] detail page.
 */

const VALID_DEPT_IDS = [
  'civil-engineering', 'mechanical', 'electrical', 'commercial',
  'personnel', 'operating', 'signal-telecom', 'others',
];

// ─── Department List Page ─────────────────────────────────────────────────────

test.describe('departments list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/departments');
    // Departments are fetched from the API — wait for network to settle
    await page.waitForLoadState('networkidle');
  });

  test('renders the page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'What are you preparing for?' })
    ).toBeVisible();
  });

  test('renders at least one department card', async ({ page }) => {
    // Each department is a <button> inside the grid
    const deptCards = page.locator('main button.bounce-card');
    await expect(deptCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await deptCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('each department card shows a name', async ({ page }) => {
    const firstCard = page.locator('main button.bounce-card').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    // Every card has an h3 with the department short name
    const heading = firstCard.locator('h3');
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('clicking a department card navigates to its detail page', async ({ page }) => {
    // Department cards are buttons in main that contain an h3 heading
    const firstCard = page.locator('main button').filter({ has: page.locator('h3') }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // Should navigate to /departments/<slug> (slug may include hyphens)
    await expect(page).toHaveURL(/\/departments\/[a-z][a-z-]+/, { timeout: 15_000 });
  });
});

// ─── Department Detail Page ───────────────────────────────────────────────────

// Use 'civil-engineering' as the canonical test department — matches the actual API slug
const TEST_DEPT = 'civil-engineering';

test.describe('department detail page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/departments/${TEST_DEPT}`);
    // Client fetches department data from the API — wait for it
    await page.waitForLoadState('networkidle');
    // Also wait until the loading screen has disappeared
    await expect(page.locator('[class*="LoadingScreen"], [data-loading]')).toHaveCount(0, {
      timeout: 15_000,
    }).catch(() => {
      // LoadingScreen might not be in DOM at all — that's fine
    });
  });

  test('renders the department header / navbar', async ({ page }) => {
    // DepartmentHeader renders the site navbar at the top
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });
  });

  test('renders the Papers tab active by default', async ({ page }) => {
    // TabNavigation renders "X Papers" button; it starts active
    await expect(
      page.getByRole('button', { name: /papers/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders the Materials tab', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /materials/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders the "Previous Year" filter button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Previous Year' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Previous Year" filter is active by default', async ({ page }) => {
    const prevYearBtn = page.getByRole('button', { name: 'Previous Year' });
    await expect(prevYearBtn).toBeVisible({ timeout: 10_000 });
    // It should have the active orange background class
    await expect(prevYearBtn).toHaveClass(/bg-orange-500/);
  });

  test('shows paper cards when data loads', async ({ page }) => {
    // Wait for the papers count paragraph to confirm papers have loaded
    // Scope to <p> elements in main to avoid strict-mode multi-element match
    const papersCounter = page.locator('main p').filter({ hasText: /Showing \d+ papers/ });
    await expect(papersCounter).toBeVisible({ timeout: 15_000 });
    // PaperCard buttons are inside the papers grid <div class="grid"> — excludes the sort button
    const paperCards = page.locator('main div.grid button');
    await expect(paperCards.first()).toBeVisible({ timeout: 5_000 });
    const count = await paperCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('switching to Materials tab shows materials content', async ({ page }) => {
    // Match by text content (not accessible name) to avoid SVG interference.
    // /^Materials$/ matches the tab button text but NOT "All Materials" filter button.
    const materialsTab = page.locator('button').filter({ hasText: /^Materials$/ });
    await expect(materialsTab).toBeVisible({ timeout: 10_000 });
    await materialsTab.click();

    // After click, the tab button should have the active orange text class
    await expect(materialsTab).toHaveClass(/text-orange-600/, { timeout: 5_000 });
  });

  test('URL stays on the correct department slug', async ({ page }) => {
    await expect(page).toHaveURL(`/departments/${TEST_DEPT}`);
  });
});

// ─── All department slugs resolve without 404 ─────────────────────────────────

test.describe('all department detail pages load', () => {
  for (const deptId of VALID_DEPT_IDS) {
    test(`/departments/${deptId} loads without error`, async ({ page }) => {
      await page.goto(`/departments/${deptId}`);
      await page.waitForLoadState('networkidle');

      // Page should not show an error state
      await expect(page.getByText('Failed to Load')).not.toBeVisible({ timeout: 10_000 });
      // Should still be on the correct URL (no redirect to /auth/signin or /)
      await expect(page).toHaveURL(`/departments/${deptId}`);
    });
  }
});

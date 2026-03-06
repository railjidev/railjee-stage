import { test, expect } from '@playwright/test';

/**
 * Authenticated tests — these run with storageState: 'e2e/auth.json'
 * so every test starts already logged in as the test account.
 *
 * Requires TEST_EMAIL + TEST_PASSWORD in .env.test.local pointing to
 * a Supabase account whose email is already confirmed.
 */

// ─── Sign-in flow ─────────────────────────────────────────────────────────────
// Override the project-level storageState for this block so the browser
// starts with NO cookies — simulating a fresh logged-out user.
test.describe('login flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login with valid credentials redirects to home', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.getByLabel('Email Address').fill(process.env.TEST_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
    await page.locator('button[type="submit"]').click();

    // After successful login, app navigates to '/'
    await expect(page).toHaveURL('/', { timeout: 15_000 });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.getByLabel('Email Address').fill(process.env.TEST_EMAIL!);
    await page.getByLabel('Password').fill('definitelywrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });
    // Must stay on signin page — no redirect
    await expect(page).toHaveURL('/auth/signin');
  });
});

// ─── Protected route access ───────────────────────────────────────────────────

test('authenticated user can access /departments', async ({ page }) => {
  await page.goto('/departments');
  // Should NOT be redirected to signin
  await expect(page).not.toHaveURL(/\/auth\/signin/);
  await expect(page).toHaveURL('/departments');
  // Check if the page is loaded
  await expect(page.getByRole('heading', { name: 'What are you preparing for?' })).toBeVisible();
});

test('authenticated user can access /profile', async ({ page }) => {
  await page.goto('/profile');
  // Server Component calls supabase.auth.getUser() — a real network trip.
  // Wait for the network to settle before asserting content.
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 15_000 });
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Account Info')).toBeVisible({ timeout: 10_000 });
});

test('authenticated user can access /stats', async ({ page }) => {
  await page.goto('/stats');
  await expect(page).not.toHaveURL(/\/auth\/signin/);
  await expect(page).toHaveURL('/stats');
});

// ─── Auth route behaviour when already logged in ──────────────────────────────

test('authenticated user visiting /auth/signin is redirected away', async ({ page }) => {
  await page.goto('/auth/signin');
  // Middleware should redirect an already-authenticated user away from auth pages
  await expect(page).not.toHaveURL(/\/auth\/signin/);
});

test('authenticated user visiting /auth/signup is redirected away', async ({ page }) => {
  await page.goto('/auth/signup');
  await expect(page).not.toHaveURL(/\/auth\/signup/);
});

// ─── Sign-out ─────────────────────────────────────────────────────────────────

test('signing out via user menu returns user to home, then protected routes redirect to signin', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // The UserMenu trigger is the only <button> that contains the avatar circle
  // (a div with from-blue-600 gradient). This avoids matching the "Go to Exams" link.
  const userMenuTrigger = page.locator('button', {
    has: page.locator('div[class*="from-blue-600"]'),
  });
  await userMenuTrigger.click();

  // Wait for the dropdown to appear
  const signOutButton = page.locator('button', { hasText: 'Sign Out' });
  await expect(signOutButton).toBeVisible({ timeout: 5_000 });

  // Wait for the Supabase /auth/v1/logout response AND the subsequent
  // window.location.href = '/' hard reload to fully settle.
  // We can't use waitForURL('/') because we're already on '/'.
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('/auth/v1/logout'),
      { timeout: 10_000 }
    ),
    signOutButton.click(),
  ]);

  // window.location.href = '/' fires after signOut() resolves — wait for the reload
  await page.waitForLoadState('load', { timeout: 10_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Now a protected route should redirect to signin (session is gone)
  await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 15_000 });
});

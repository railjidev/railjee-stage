import { chromium, FullConfig } from '@playwright/test';

/**
 * Runs once before all tests.
 * Logs in using the test account from .env.test.local and saves the
 * authenticated browser state to e2e/auth.json.
 *
 * Required env vars in .env.test.local:
 *   TEST_EMAIL=your-test-account@example.com
 *   TEST_PASSWORD=your-test-password
 */
export default async function globalSetup(_config: FullConfig) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_EMAIL or TEST_PASSWORD in .env.test.local.\n' +
      'Create the file with those two variables pointing to a confirmed Supabase test account.'
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/auth/signin');

  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait until we leave the signin page (redirect to '/' on success)
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
    timeout: 15_000,
  });

  // Let the page fully settle so Supabase's Set-Cookie headers are all processed
  await page.waitForLoadState('networkidle');

  // Persist cookies + localStorage so authenticated tests can reuse the session
  await page.context().storageState({ path: 'e2e/auth.json' });

  await browser.close();
}

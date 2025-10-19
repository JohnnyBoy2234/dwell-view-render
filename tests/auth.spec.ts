import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

test('authenticate and save storage state', async ({ page }) => {
  const TEST_EMAIL = process.env.TEST_EMAIL!;
  const TEST_PASSWORD = process.env.TEST_PASSWORD!;

  console.log('Running login with:', TEST_EMAIL);

  try {
    // Navigate to auth page
    await page.goto('http://localhost:5173/auth');
    console.log('Loaded auth page');

    // Fill in credentials
    await page.locator('#signin-email').fill(TEST_EMAIL);
    await page.locator('#signin-password').fill(TEST_PASSWORD);
    console.log('Filled in credentials');

    // Click sign in and wait for navigation
    await Promise.all([
      page.waitForNavigation({ 
        url: url => 
          url.pathname === '/' || 
          url.pathname.startsWith('/dashboard') || 
          url.pathname.startsWith('/messages') || 
          url.pathname.startsWith('/home')
      }),
      page.getByRole('button', { name: /sign in/i }).click()
    ]);

    console.log('Login successful, current URL:', page.url());
    
    // Save storage state
    await page.context().storageState({ path: 'storageState.json' });
    console.log('✅ Storage state saved successfully.');
  } catch (error) {
    console.error('Test failed:', error);
    // Take a screenshot on failure
    await page.screenshot({ path: 'test-failure.png' });
    throw error;
  }
});
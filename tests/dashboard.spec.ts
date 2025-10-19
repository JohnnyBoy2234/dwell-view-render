import { test, expect } from '@playwright/test';

test.use({ storageState: 'storageState.json' });

test('Dashboard loads successfully', async ({ page }) => {
  await page.goto('http://localhost:5173/dashboard');

  // Check for something visible to logged-in users
  await expect(page.getByText(/welcome/i)).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();

  console.log('✅ Dashboard loaded successfully');
});

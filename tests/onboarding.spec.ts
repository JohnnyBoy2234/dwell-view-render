import { test, expect } from '@playwright/test';

test('Landlord can sign up and see dashboard', async ({ page }) => {
  await page.goto('/auth');

  await page.getByLabel('Email').fill('jttrading34@gmail.com');
  await page.getByLabel('Password').fill('Koopies008@');
  

  await page.click('button:has-text("Sign in")');

  // Adjust this according to your actual UI
  await expect(page.getByText('Welcome,')).toBeVisible();
  await expect(page).toHaveURL(/enhancedlandlorddashboard/);
});

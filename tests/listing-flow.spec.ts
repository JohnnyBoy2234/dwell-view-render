import { test, expect } from '@playwright/test';

test('Landlord can create a listing and see it appear in search', async ({ page }) => {
  // Log in
  await page.goto('/auth');
  await page.getByLabel('Email').fill('jttrading34@gmail.com');
  await page.getByLabel('Password').fill('Koopies008@');
  await page.click('button:has-text("Sign in")');

  await expect(page).toHaveURL(/enhancedlandlorddashboard/);

  // Create listing
  await page.click('text=Add Your First Property');
  await page.fill('input[name="property type"]', 'House');
  await page.fill('input[name="property location"]', '6 fourjay rd');
  await page.fill('input[name="property descrpition"]', 'afdshshdfhsdhfhshdjfhsdkhdjfkskfhsdkjhfksfkhkdhasdllskadlfhsldkahjf');
  await page.fill('input[name="bedrooms"]', '2');
  await page.fill('input[name="bathrooms"]', '2');
  await page.fill('input[name="parking"]', '1');
  await page.fill('input[name="size (sqm)"]', '160');
  await page.fill('input[name="amenities"]', 'Garden,Security,DSTV,WiFi');
  await page.fill('input[name="monthly rent"]', '12000');
 

  await page.click('button:has-text("Publish Property")');

  // Validate listing appears in landlord view
  await expect(page.getByText('R12000')).toBeVisible();

  // Now search as tenant (simple way: visit search page)
  await page.goto('/search?city=Cape%20Town');
  await expect(page.getByText('R12000')).toBeVisible();
});

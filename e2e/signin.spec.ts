import { test, expect, parseAppMeta, gotoSignIn, submitSignIn, toasts } from './support/fixtures';

test.describe('sign in', () => {
  test('a confirmed user signs in and reaches the app', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const user = await users.create({ role: meta.role, confirm: true });

    await gotoSignIn(page);
    await submitSignIn(page, user.email, user.password);

    if (meta.app === 'landlord') {
      await page.waitForURL(/\/landlord\/dashboard/, { timeout: 15_000 });
    } else {
      await expect(page).toHaveURL(/\/$/);
    }
    await expect(page.locator('#signin-email')).toHaveCount(0);
  });

  test('a wrong password is rejected and stays on /auth', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const user = await users.create({ role: meta.role });

    await gotoSignIn(page);
    await submitSignIn(page, user.email, 'WrongPass1!');

    await expect(toasts(page).getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('an unknown account is rejected', async ({ page }) => {
    await gotoSignIn(page);
    await submitSignIn(page, `e2e-nobody-${Date.now()}@example.com`, 'WhateverPass1!');

    await expect(toasts(page).getByText(/invalid email or password|no account found/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('a malformed email triggers client-side validation', async ({ page }) => {
    await gotoSignIn(page);
    // "a@b" passes the native type=email check but fails the app's stricter regex.
    await submitSignIn(page, 'a@b', 'Abcdef1!');

    await expect(toasts(page).getByText(/enter a valid email address/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('an unverified account is blocked with a verify-email message', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const user = await users.create({ role: meta.role, confirm: false });

    await gotoSignIn(page);
    await submitSignIn(page, user.email, user.password);

    await expect(toasts(page).getByText(/verify your email|email not confirmed/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('forgot-password shows the check-your-email screen', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const user = await users.create({ role: meta.role });

    await gotoSignIn(page);
    await page.getByRole('button', { name: /forgot your password/i }).click();
    await page.fill('#forgot-email', user.email);
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('the OAuth buttons render and are enabled', async ({ page }) => {
    await gotoSignIn(page);
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /continue with apple/i })).toBeEnabled();
  });

  test('a wrong-role user is shown the wrong-app screen', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    // The hard window.location redirect is a dead path in the password flow
    // (navigate('/') unmounts Auth before roles resolve); the RoleGuard is what
    // the user actually sees. Stub the vercel host so a stray redirect can't hit prod.
    await page.route(/mzanzihomes-(tenant|landlord)\.vercel\.app/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }),
    );
    const user = await users.create({ role: meta.otherRole, confirm: true });

    await gotoSignIn(page);
    await submitSignIn(page, user.email, user.password);

    await expect(page.getByRole('heading', { name: /wrong app/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });
});

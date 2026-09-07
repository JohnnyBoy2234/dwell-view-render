import { test, expect, parseAppMeta, gotoSignUp, gotoSignIn, submitSignIn, fillSignUp, toasts } from './support/fixtures';
import { waitForConfirmationLink } from './support/mailbox';

const STRONG = 'Abcdef1!';

test.describe('sign up', () => {
  test('a mismatched confirmation is flagged inline', async ({ page }) => {
    await gotoSignUp(page);
    await page.fill('#signup-email', `e2e-mismatch-${Date.now()}@example.com`);
    await page.fill('#signup-password', STRONG);
    await page.fill('#confirm-password', 'Different1!');

    await expect(page.getByText(/passwords don't match/i)).toBeVisible();
  });

  test('submit is gated on accepting the terms', async ({ page }) => {
    await gotoSignUp(page);
    await page.fill('#signup-email', `e2e-terms-${Date.now()}@example.com`);
    await page.fill('#signup-password', STRONG);
    await page.fill('#confirm-password', STRONG);

    const submit = page.locator('form button[type="submit"]');
    await expect(submit).toBeDisabled();
    await page.getByRole('checkbox').check();
    await expect(submit).toBeEnabled();
  });

  test('the password strength checklist reacts to input', async ({ page }) => {
    await gotoSignUp(page);
    await page.fill('#signup-password', 'abc');
    await expect(page.getByText('Uppercase')).toBeVisible();
    await page.fill('#signup-password', STRONG);
    await expect(page.getByText('Special char')).toBeVisible();
  });

  test('a duplicate email is rejected', async ({ page, users }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const existing = await users.create({ role: meta.role, confirm: true });

    await gotoSignUp(page);
    await fillSignUp(page, existing.email, STRONG);
    await page.locator('form button[type="submit"]').click();

    await expect(toasts(page).getByText(/already registered/i)).toBeVisible();
  });

  test('full signup → email confirmation → sign in', async ({ page, request }) => {
    const meta = parseAppMeta(test.info().project.metadata);
    const email = `e2e-signup-${meta.role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

    await gotoSignUp(page);
    await fillSignUp(page, email, STRONG);
    await page.locator('form button[type="submit"]').click();

    // The app hands off to the "Check Your Email" verification screen.
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(email)).toBeVisible();

    // Consume the real confirmation link delivered to Inbucket (confirms the account server-side).
    const link = await waitForConfirmationLink(email);
    await request.get(link, { maxRedirects: 0 });

    // The now-confirmed account can sign in and reach the app.
    await gotoSignIn(page);
    await submitSignIn(page, email, STRONG);

    if (meta.app === 'landlord') {
      await page.waitForURL(/\/landlord\/dashboard/, { timeout: 15_000 });
    } else {
      await expect(page).toHaveURL(/\/$/);
    }
    await expect(page.locator('#signin-email')).toHaveCount(0);
  });
});

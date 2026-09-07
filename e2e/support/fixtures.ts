import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { createUser, deleteUser, type AppRole, type CreatedUser } from './supabaseAdmin';

export { expect };

export interface AppMeta {
  app: AppRole;
  role: AppRole;
  /** The role that belongs to the *other* app (for wrong-app redirect tests). */
  otherRole: AppRole;
  /** Regex source matched against the URL after a wrong-role sign-in. */
  crossAppUrlPattern: string;
}

interface UsersFixture {
  create(options: { role: AppRole; confirm?: boolean; password?: string }): Promise<CreatedUser>;
  uniqueEmail(prefix?: string): string;
}

export const test = base.extend<{ users: UsersFixture }>({
  users: async ({}, use) => {
    const created: string[] = [];
    const factory: UsersFixture = {
      uniqueEmail: (prefix = 'e2e') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
      create: async ({ role, confirm = true, password = 'Abcdef1!' }) => {
        const email = factory.uniqueEmail(`e2e-${role}`);
        const user = await createUser({ email, password, role, confirm });
        created.push(user.id);
        return user;
      },
    };
    await use(factory);
    for (const id of created) await deleteUser(id);
  },
});

function isAppRole(value: unknown): value is AppRole {
  return value === 'tenant' || value === 'landlord';
}

export function parseAppMeta(metadata: unknown): AppMeta {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'app' in metadata &&
    'role' in metadata &&
    'otherRole' in metadata &&
    'crossAppUrlPattern' in metadata
  ) {
    const { app, role, otherRole, crossAppUrlPattern } = metadata;
    if (isAppRole(app) && isAppRole(role) && isAppRole(otherRole) && typeof crossAppUrlPattern === 'string') {
      return { app, role, otherRole, crossAppUrlPattern };
    }
  }
  throw new Error('Invalid e2e project metadata; expected { app, role, otherRole, crossAppUrlPattern }.');
}

export async function gotoSignIn(page: Page): Promise<void> {
  await page.goto('/auth');
  await page.locator('#signin-email').waitFor({ state: 'visible' });
}

export async function submitSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.fill('#signin-email', email);
  await page.fill('#signin-password', password);
  await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();
}

export async function gotoSignUp(page: Page): Promise<void> {
  await page.goto('/auth');
  // The pill tab and the submit button share the label "Create Account";
  // the tab (type=button) is first in the DOM.
  await page.locator('button[type="button"]', { hasText: 'Create Account' }).first().click();
  await page.locator('#signup-email').waitFor({ state: 'visible' });
}

export async function fillSignUp(page: Page, email: string, password: string): Promise<void> {
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  await page.fill('#confirm-password', password);
  await page.getByRole('checkbox').check();
}

/**
 * The *visible* toast region. Radix renders a second, screen-reader-only
 * "Notifications alt+T" region that mirrors (and concatenates) toast text;
 * scoping here avoids strict-mode matches against that hidden duplicate.
 */
export function toasts(page: Page): Locator {
  return page.getByRole('region', { name: /Notifications \(F8\)/i });
}

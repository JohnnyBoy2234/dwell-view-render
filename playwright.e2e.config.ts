import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { resolveSupabaseEnv } from './e2e/support/env';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Resolve local Supabase creds once, up front. This also surfaces a clear error
// at config load if the stack isn't running.
const supabase = resolveSupabaseEnv();

const appEnv = {
  VITE_SUPABASE_URL: supabase.url,
  VITE_SUPABASE_PUBLISHABLE_KEY: supabase.anonKey,
};

const TENANT_URL = 'http://127.0.0.1:5199';
const LANDLORD_URL = 'http://127.0.0.1:5198';

// Allow the confirmation-link redirect_to (app origins) to be honored locally.
process.env.SUPABASE_URL ??= supabase.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= supabase.serviceKey;
process.env.INBUCKET_URL ??= supabase.inbucketUrl;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    headless: true,
    trace: 'on-first-retry',
    // Prefer a system Chromium when provided (Playwright browsers may not be installed).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    {
      name: 'tenant',
      use: { baseURL: TENANT_URL },
      metadata: {
        app: 'tenant',
        role: 'tenant',
        otherRole: 'landlord',
        crossAppUrlPattern: 'mzanzihomes-landlord\\.vercel\\.app',
      },
    },
    {
      name: 'landlord',
      use: { baseURL: LANDLORD_URL },
      metadata: {
        app: 'landlord',
        role: 'landlord',
        otherRole: 'tenant',
        crossAppUrlPattern: 'mzanzihomes-tenant\\.vercel\\.app',
      },
    },
  ],
  webServer: [
    {
      command: 'npx vite --port 5199 --strictPort',
      cwd: path.resolve(rootDir, 'apps/tenant'),
      url: TENANT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: appEnv,
    },
    {
      command: 'npx vite --port 5198 --strictPort',
      cwd: path.resolve(rootDir, 'apps/landlord'),
      url: LANDLORD_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: appEnv,
    },
  ],
});

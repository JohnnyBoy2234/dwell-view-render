import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://rentlekker.com',
    headless: true,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
});

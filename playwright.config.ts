import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://mzanzihomes.com',
    headless: true,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
});

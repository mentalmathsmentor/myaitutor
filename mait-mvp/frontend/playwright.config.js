import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined } },
    ...(process.env.PLAYWRIGHT_CROSS_BROWSER ? [
      { name: 'webkit', use: { browserName: 'webkit' } },
      { name: 'firefox', use: { browserName: 'firefox' } },
    ] : []),
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});

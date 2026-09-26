import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  // Full lesson + quiz scenarios take ~25 s under parallel load.
  timeout: 60_000,
  fullyParallel: true,
  // Locally the 8 GB dev machine runs out of memory with several browsers (exit 134).
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'ru-RU',
    // Endless decorative animations (bouncing map node) never become "stable" for clicks;
    // reduced motion also exercises the app's motion setting.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});

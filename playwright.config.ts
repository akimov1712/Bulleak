import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** Site built with VITE_API_URL, for account tests (the main build stays guest-only). */
const ACCOUNTS_PORT = 4174;
const API_PORT = 8788;
/** The test API writes letters here; e2e/auth.spec.ts reads the links from it. */
export const MAIL_OUTBOX = fileURLToPath(
  new URL('./test-results/mail-outbox.jsonl', import.meta.url),
);
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

/**
 * A time zone where it is now about noon. Hour-based achievements («Ночная сова», «Ранняя
 * пташка») add extra toasts that cover buttons, so a run at night would fail; real time keeps
 * flowing (reading timers need it), only the local hour moves. Etc/GMT signs are inverted.
 */
const noonOffset = ((12 - new Date().getUTCHours() + 36) % 24) - 12;
const timezoneId =
  noonOffset === 0 ? 'Etc/GMT' : `Etc/GMT${noonOffset > 0 ? '-' : '+'}${Math.abs(noonOffset)}`;

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
    timezoneId,
    // Endless decorative animations (bouncing map node) never become "stable" for clicks;
    // reduced motion also exercises the app's motion setting.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /(auth|sync)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      testIgnore: /(auth|sync)\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
    // Needs the local API, so not against an external site.
    ...(externalBaseUrl
      ? []
      : [
          {
            name: 'accounts',
            testMatch: /(auth|sync)\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1280, height: 800 },
              baseURL: `http://127.0.0.1:${ACCOUNTS_PORT}`,
            },
          },
        ]),
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: `npm run build && npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
          url: `http://127.0.0.1:${PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          // In-memory database: every run starts empty.
          command: 'npm run start -w server',
          url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
          reuseExistingServer: false,
          timeout: 60_000,
          env: {
            NODE_ENV: 'test',
            PORT: String(API_PORT),
            APP_ORIGIN: `http://127.0.0.1:${ACCOUNTS_PORT}`,
            MAIL_OUTBOX,
          },
        },
        {
          command: `npm run build -- --outDir dist-accounts && npx vite preview --outDir dist-accounts --port ${ACCOUNTS_PORT} --strictPort --host 127.0.0.1`,
          url: `http://127.0.0.1:${ACCOUNTS_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
          env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}/api/v1` },
        },
      ],
});

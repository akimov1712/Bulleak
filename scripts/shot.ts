/**
 * Dev helper: full-page screenshots of the running dev server for visual review.
 * Usage: npx tsx scripts/shot.ts <hash> [width=1280] [theme=light|dark] [out=shot.png] [height=900]
 * Example: npx tsx scripts/shot.ts "#/dev/ui" 375 dark tmp/ui-mobile-dark.png
 * SHOT_PROGRESS=path/to/state.json preloads localStorage['tc-progress'] (persist format).
 */
import { chromium } from '@playwright/test';

const [hash = '#/', widthArg = '1280', theme = 'light', out = 'shot.png', heightArg = '900'] =
  process.argv.slice(2);
const base = process.env.SHOT_BASE_URL ?? 'http://127.0.0.1:5173/';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(widthArg), height: Number(heightArg) },
  deviceScaleFactor: 1,
  colorScheme: theme === 'dark' ? 'dark' : 'light',
  locale: 'ru-RU',
});
const seed = process.env.SHOT_PROGRESS;
if (seed) {
  const { readFileSync } = await import('node:fs');
  const value = readFileSync(seed, 'utf8');
  await page.addInitScript((v) => localStorage.setItem('tc-progress', v), value);
}
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(`${base}${hash}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: process.env.SHOT_FULL !== '0' });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
await browser.close();
console.log(JSON.stringify({ out, overflow, errors }));

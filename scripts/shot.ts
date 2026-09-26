/**
 * Dev helper: full-page screenshots of the running dev server for visual review.
 * Usage: npx tsx scripts/shot.ts <hash> [width=1280] [theme=light|dark] [out=shot.png] [height=900]
 * Example: npx tsx scripts/shot.ts "#/dev/ui" 375 dark tmp/ui-mobile-dark.png
 * SHOT_PROGRESS=path/to/state.json preloads localStorage['tc-progress'] (persist format).
 * SHOT_ELEMENTS=<css selector> saves every matching element as <out>-<n>.png instead.
 * SHOT_SLICE=<px> cuts a full-page shot into <out>-<n>.png pieces of that height (long lessons).
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
const selector = process.env.SHOT_ELEMENTS;
const files: string[] = [];
if (selector) {
  // Lazy chunks (diagrams, charts) can take a while on a cold dev server.
  await page.locator(selector).first().waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  // Fixed/sticky bars (header, bottom nav) would cover the element shots.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const { position } = getComputedStyle(el);
      if (position === 'fixed' || position === 'sticky') el.style.visibility = 'hidden';
    }
  });
  const elements = await page.locator(selector).all();
  for (const [i, el] of elements.entries()) {
    // Skip hidden matches (e.g. inside the fixed header/nav hidden above).
    if (!(await el.isVisible())) continue;
    const file = out.replace(/.png$/, `-${i}.png`);
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: file });
    files.push(file);
  }
} else if (process.env.SHOT_SLICE) {
  const slice = Number(process.env.SHOT_SLICE);
  await page.waitForTimeout(500);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = page.viewportSize()?.width ?? 1280;
  for (let y = 0, i = 0; y < height; y += slice, i++) {
    const file = out.replace(/.png$/, `-${i}.png`);
    await page.screenshot({
      path: file,
      fullPage: true,
      clip: { x: 0, y, width, height: Math.min(slice, height - y) },
    });
    files.push(file);
  }
} else {
  await page.screenshot({ path: out, fullPage: process.env.SHOT_FULL !== '0' });
  files.push(out);
}
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
// When the page scrolls sideways, name the widest offenders to make the fix obvious.
const offenders = overflow
  ? await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.getBoundingClientRect().right > vw + 1)
        .slice(0, 8)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
          return `${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)} text=${(el.textContent ?? '').slice(0, 40)}`;
        });
    })
  : [];
await browser.close();
console.log(JSON.stringify({ files, overflow, offenders, errors }));

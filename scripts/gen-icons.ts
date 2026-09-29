/**
 * Favicon and PWA icons from the Bulleak brand mark (src/components/brand/mark.ts).
 * Usage: `npx tsx scripts/gen-icons.ts` (no dev server needed).
 * Output: public/favicon.svg, public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png
 */
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { markSvg } from '../src/components/brand/mark';

const ICONS: { file: string; size: number; radius: number; scale: number }[] = [
  { file: 'icon-192.png', size: 192, radius: 14, scale: 1 },
  { file: 'icon-512.png', size: 512, radius: 14, scale: 1 },
  // Maskable: full-bleed tile, the glyph inside the 80 % safe zone.
  { file: 'maskable-512.png', size: 512, radius: 0, scale: 0.78 },
  // iOS rounds the corners itself.
  { file: 'apple-touch-icon.png', size: 180, radius: 0, scale: 0.9 },
];

fs.writeFileSync('public/favicon.svg', `${markSvg()}\n`);
console.log('saved favicon.svg');

fs.mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${icon.size}px;height:${icon.size}px}</style>` +
      markSvg({ radius: icon.radius, scale: icon.scale }),
  );
  await page.locator('svg').screenshot({
    path: `public/icons/${icon.file}`,
    omitBackground: icon.radius > 0,
  });
  console.log('saved', icon.file);
}
await browser.close();

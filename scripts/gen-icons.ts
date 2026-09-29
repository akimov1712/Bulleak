/**
 * PWA icons from the own mascot artwork: clones the mascot SVG rendered by the running dev
 * server (theme classes resolved by the app stylesheet) onto a brand-green tile and saves PNGs.
 * Usage: npm run dev, then `npx tsx scripts/gen-icons.ts` (ICONS_BASE_URL overrides the URL).
 * Output: public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png
 */
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.ICONS_BASE_URL ?? 'http://127.0.0.1:5173/';
const GREEN = '#16C26A';
const ICONS: { file: string; size: number; mascot: number; radius: number }[] = [
  { file: 'icon-192.png', size: 192, mascot: 0.8, radius: 0.22 },
  { file: 'icon-512.png', size: 512, mascot: 0.8, radius: 0.22 },
  // Maskable: full-bleed background, artwork inside the 80 % safe zone.
  { file: 'maskable-512.png', size: 512, mascot: 0.62, radius: 0 },
  { file: 'apple-touch-icon.png', size: 180, mascot: 0.78, radius: 0 },
];

fs.mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: 'light' });
await page.goto(`${base}#/`);
await page.locator('svg[data-mood="happy"]').first().waitFor({ state: 'attached' });
// Only the tile is drawn: rounded corners stay transparent.
await page.addStyleTag({
  content:
    'html, body { background: transparent !important; } body > *:not(#icon-tile) { visibility: hidden; }',
});

for (const icon of ICONS) {
  await page.evaluate(
    ({ size, mascot, radius, green }) => {
      document.getElementById('icon-tile')?.remove();
      const source = document.querySelector('svg[data-mood="happy"]');
      if (!source) throw new Error('mascot svg not found');
      const tile = document.createElement('div');
      tile.id = 'icon-tile';
      Object.assign(tile.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        zIndex: '9999',
        width: `${size}px`,
        height: `${size}px`,
        display: 'grid',
        placeItems: 'center',
        background: green,
        borderRadius: `${radius * size}px`,
      });
      const clone = source.cloneNode(true) as SVGElement;
      clone.setAttribute('width', String(size * mascot));
      clone.setAttribute('height', String(size * mascot));
      clone.style.animation = 'none';
      tile.appendChild(clone);
      document.body.appendChild(tile);
    },
    { ...icon, green: GREEN },
  );
  await page
    .locator('#icon-tile')
    .screenshot({ path: `public/icons/${icon.file}`, omitBackground: icon.radius > 0 });
  console.log('saved', icon.file);
}
await browser.close();

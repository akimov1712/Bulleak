/**
 * Screenshots of public Bybit pages for the lessons (docs/03-content/bybit-mockups.md).
 * Uses testnet.bybit.com: the same web interface as bybit.com, open without an account
 * (the main site's web terminal is not available from every region).
 * Usage: `npx tsx scripts/bybit-shots.ts [name…]` → public/img/bybit/<name>.webp
 */
import fs from 'node:fs';
import { chromium, type Page } from '@playwright/test';

interface Shot {
  name: string;
  url: string;
  /** CSS viewport; captured at 2× and saved at `width` px. */
  viewport: { width: number; height: number };
  width: number;
  /** Extra preparation before the capture (close banners, pick tabs…). */
  prepare?: (page: Page) => Promise<void>;
  /** Part of the page to capture, CSS px (default — the whole viewport). */
  clip?: (page: Page) => Promise<Box>;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Box of the smallest visible element whose text is exactly `text`. */
async function textBox(page: Page, text: string, pick: 'first' | 'last' = 'last'): Promise<Box> {
  const box = await page.getByText(text, { exact: true })[pick]().boundingBox();
  if (!box) throw new Error(`not found: ${text}`);
  return box;
}

const BASE = 'https://testnet.bybit.com/ru-RU';

const SHOTS: Shot[] = [
  {
    // Perpetual BTCUSDT: the testnet spot market is too thin, its chart would mislead.
    name: 'terminal',
    url: `${BASE}/trade/usdt/BTCUSDT`,
    viewport: { width: 1440, height: 900 },
    width: 1600,
  },
  {
    // Index / mark price, open interest (m02-l05, m07-l03, m08-l04).
    name: 'contract-data',
    url: `${BASE}/trade/usdt/BTCUSDT`,
    viewport: { width: 1920, height: 1200 },
    width: 640,
    prepare: async (page) => {
      await page.getByText('Показать', { exact: true }).last().click();
      await page.waitForTimeout(800);
    },
    clip: async (page) => {
      const head = await textBox(page, 'Данные Контракта BTCUSDT');
      const end = await textBox(page, 'Скрыть');
      const x = head.x - 16;
      return {
        x,
        y: head.y - 14,
        width: 1920 - x - 2,
        height: end.y + end.height + 14 - (head.y - 14),
      };
    },
  },
  {
    // Funding rate and countdown in the ticker bar (m02-l04, m08-l05).
    name: 'funding-bar',
    url: `${BASE}/trade/usdt/BTCUSDT`,
    viewport: { width: 1440, height: 900 },
    width: 1400,
    clip: async (page) => {
      const pair = await textBox(page, 'BTCUSDT', 'first');
      const rate = await textBox(page, 'Ставка', 'first');
      const y = pair.y - 14;
      return { x: 4, y, width: rate.x + 260, height: 64 };
    },
  },
  {
    // Contract rules page: funding every 8 h, premium index (m08-l05).
    name: 'contract-detail',
    url: `${BASE}/announcement-info/contract-detail`,
    viewport: { width: 1440, height: 900 },
    width: 1400,
    clip: async (page) => {
      const title = await textBox(page, 'BTCUSDT Данные контракта');
      return { x: title.x - 24, y: title.y - 24, width: 1440 - (title.x - 24) - 24, height: 300 };
    },
  },
];

const OUT = 'public/img/bybit';

/** PNG buffer → WebP of the given width, encoded by the browser (no image libraries needed). */
async function toWebp(page: Page, png: Buffer, width: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    async ({ src, width }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round((img.height * width) / img.width);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.86);
    },
    { src: `data:image/png;base64,${png.toString('base64')}`, width },
  );
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
}

const only = new Set(process.argv.slice(2));
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const shot of SHOTS.filter((s) => only.size === 0 || only.has(s.name))) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // The terminal streams prices and draws the chart after load.
  await page.waitForTimeout(10_000);
  await shot.prepare?.(page);
  const png = await page.screenshot(shot.clip ? { clip: await shot.clip(page) } : {});
  const encoder = await context.newPage();
  const webp = await toWebp(encoder, png, shot.width);
  fs.writeFileSync(`${OUT}/${shot.name}.webp`, webp);
  console.log(`saved ${shot.name}.webp`, Math.round(webp.length / 1024), 'KB');
  await context.close();
}
await browser.close();

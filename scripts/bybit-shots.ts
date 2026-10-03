/**
 * Screenshots of public Bybit pages for the lessons (docs/03-content/bybit-mockups.md).
 * Uses testnet.bybit.com: the same web interface as bybit.com, open without an account
 * (the main site's web terminal is not available from every region).
 * Usage: `npx tsx scripts/bybit-shots.ts [name…]` → public/img/bybit/<name>.webp
 *
 * Account screens (`account: true`) need a signed-in browser profile: BYBIT_PROFILE (or the
 * git-ignored file scripts/.bybit-profile) points to a
 * Chromium profile folder where the user has signed in themselves (Claude never types
 * credentials). bybit.com blocks headless browsers, so those shots run in a visible window.
 * Personal data (e-mail, UID, phone, wallet addresses, QR codes) is replaced before every
 * capture; review each image before committing it.
 */
import fs from 'node:fs';
import { chromium, type Page } from '@playwright/test';

interface Shot {
  name: string;
  /** Needs the signed-in profile (BYBIT_PROFILE); runs on bybit.com in a visible window. */
  account?: boolean;
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

/** Replaces personal data on the page. Runs in the browser before every account capture. */
function redactPersonalData() {
  const patterns = [
    /\S*@\S*/g, // e-mail, also masked (aki***@****)
    /\+?\d[\d*\s-]{6,}\d/g, // phone, UID: long digit runs without thousand separators
    /\b(UID|ID)\s*:?\s*\d+/gi,
    /\b[a-zA-Z0-9]{25,}\b/g, // wallet addresses and other long tokens
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    let text = node.nodeValue ?? '';
    for (const p of patterns) text = text.replace(p, '••••••');
    if (text !== node.nodeValue) node.nodeValue = text;
  }
  for (const input of document.querySelectorAll('input')) {
    if (/@|\d{6,}|[a-zA-Z0-9]{25,}/.test(input.value)) input.value = '••••••';
  }
  for (const el of document.querySelectorAll<HTMLElement>('canvas, img')) {
    if (/qr/i.test(`${el.className} ${el.getAttribute('src') ?? ''}`))
      el.style.filter = 'blur(16px)';
  }
}

/** Hides banners and pop-ups that are not part of the lesson (KYC reminder, news toasts). */
async function tidy(page: Page) {
  await page.evaluate(() => {
    const noise = [/верификацию KYC/, /Делистинг/, /Выписка с аккаунта/, /Больше не показывать/];
    const hit = (el: Element) => noise.some((n) => n.test((el as HTMLElement).innerText ?? ''));
    for (const el of document.querySelectorAll<HTMLElement>('div')) {
      if (!hit(el)) continue;
      const box = el.getBoundingClientRect();
      // the box that holds the message (a banner or toast), not a whole page section
      if (box.height > 0 && box.height < 260 && ![...el.children].some(hit)) {
        // climb to the toast / banner frame (still small), so no empty coloured box remains
        let target: HTMLElement = el;
        while (target.parentElement) {
          const parent = target.parentElement.getBoundingClientRect();
          if (parent.height > 140 || parent.width > 1500) break;
          target = target.parentElement;
        }
        target.style.visibility = 'hidden';
      }
    }
  });
}

/** The element with exactly this text inside the order form column (right side). */
async function inForm(page: Page, text: string) {
  const all = page.getByText(text, { exact: true });
  for (let k = 0; k < (await all.count()); k++) {
    const box = await all.nth(k).boundingBox();
    if (box && box.x > 1130 && box.y > 100) return all.nth(k);
  }
  throw new Error(`not in the order form: ${text}`);
}

/** The form remembers the last order type: start every form shot from the «Лимитный» tab. */
async function limitTab(page: Page) {
  await (await inForm(page, 'Лимитный')).click();
  await page.waitForTimeout(800);
}

const MAIN = 'https://www.bybit.com/ru-RU';
const FORM = { x: 1136, y: 100, width: 300 };

/** Account screens: bybit.com with the signed-in profile. Nothing is ever confirmed or saved. */
const ACCOUNT_SHOTS: Shot[] = [
  {
    // Full order form: margin mode, leverage, type, price, qty, TP/SL, Long / Short (m02-l05).
    name: 'order-form',
    account: true,
    url: `${MAIN}/trade/usdt/BTCUSDT`,
    viewport: { width: 1440, height: 900 },
    width: 600,
    prepare: async (page) => {
      await limitTab(page);
      await (await inForm(page, 'TP/SL')).click();
      await page.waitForTimeout(1000);
    },
    clip: async () => ({ ...FORM, height: 585 }),
  },
  {
    // Leverage list with Bybit's own hint about cross margin (m08-l03).
    name: 'leverage',
    account: true,
    url: `${MAIN}/trade/usdt/BTCUSDT`,
    viewport: { width: 1440, height: 900 },
    width: 600,
    prepare: async (page) => {
      await limitTab(page);
      await (await inForm(page, '10.00x')).click();
      await page.waitForTimeout(700);
      // rest the pointer on the list: the button hint goes away, the list stays open
      const last = await page.getByText('150x', { exact: true }).last().boundingBox();
      if (last) await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2);
      await page.waitForTimeout(500);
    },
    // From the button to the end of the list, measured after it opened.
    clip: async (page) => {
      // the page scrolls a little when the list opens: find the button anywhere
      const button = await page.getByText('10.00x', { exact: true }).last().boundingBox();
      const end = await page.getByText('Настроить', { exact: true }).last().boundingBox();
      if (!button || !end) throw new Error('leverage list not open');
      const x = Math.min(button.x, end.x) - 24;
      return {
        x,
        y: button.y - 16,
        width: 1436 - x,
        height: end.y + end.height + 20 - (button.y - 16),
      };
    },
  },
  {
    // Margin mode: isolated / cross («Марж. торговля») / portfolio (m08-l03).
    name: 'margin-mode',
    account: true,
    url: `${MAIN}/trade/usdt/BTCUSDT`,
    viewport: { width: 1440, height: 900 },
    width: 600,
    prepare: async (page) => {
      await limitTab(page);
      await (await inForm(page, 'Марж. торговля')).click();
      await page.waitForTimeout(700);
    },
    clip: async () => ({ ...FORM, height: 230 }),
  },
  {
    // Security settings: anti-phishing code, e-mail, SMS, Google 2FA, passkeys (m02-l01).
    name: 'security',
    account: true,
    url: `${MAIN}/app/user/security`,
    viewport: { width: 1440, height: 1100 },
    width: 1600,
    clip: async () => ({ x: 200, y: 96, width: 1225, height: 945 }),
  },
  {
    // Advanced security: withdrawal settings, devices (m02-l01).
    name: 'security-advanced',
    account: true,
    url: `${MAIN}/app/user/security`,
    viewport: { width: 1440, height: 1100 },
    width: 1600,
    prepare: async (page) => {
      // the page scrolls inside its own container: put the section heading near the top
      await page
        .getByText('Advanced Protect', { exact: true })
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(800);
    },
    clip: async (page) => {
      const head = await page.getByText('Advanced Protect', { exact: true }).first().boundingBox();
      if (!head) throw new Error('no Advanced Protect');
      return { x: 200, y: head.y - 24, width: 1225, height: Math.min(915, 1100 - (head.y - 24)) };
    },
  },
  {
    // Funding and Unified Trading accounts, balances hidden by Bybit (m02-l02).
    name: 'assets',
    account: true,
    url: `${MAIN}/user/assets/home/overview`,
    viewport: { width: 1440, height: 900 },
    width: 1400,
    prepare: async (page) => {
      // Onboarding hint of the assets page: hide it, do not click through.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll<HTMLElement>('div')) {
          const box = el.getBoundingClientRect();
          if (
            /используется в основном для транзакций/.test(el.innerText ?? '') &&
            box.width < 320
          ) {
            el.style.visibility = 'hidden';
          }
        }
      });
    },
    clip: async () => ({ x: 200, y: 96, width: 800, height: 450 }),
  },
  {
    // Crypto deposit: coin chosen, list of networks open; no address is shown (m02-l02).
    name: 'deposit-network',
    account: true,
    url: `${MAIN}/user/assets/deposit`,
    viewport: { width: 1440, height: 1100 },
    width: 1400,
    prepare: async (page) => {
      await page.getByText('USDT', { exact: true }).first().click();
      await page.waitForTimeout(1500);
      await page.getByText('Выбрать сеть', { exact: true }).first().click();
      await page.waitForTimeout(3500);
    },
    clip: async () => ({ x: 100, y: 110, width: 740, height: 664 }),
  },
];

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
const wanted = [...SHOTS, ...ACCOUNT_SHOTS].filter((s) => only.size === 0 || only.has(s.name));
fs.mkdirSync(OUT, { recursive: true });

async function capture(page: Page, shot: Shot, encoder: Page) {
  // tsx (esbuild keepNames) wraps functions passed to page.evaluate in __name(): define it there.
  await page.addInitScript({ content: 'window.__name = (f) => f;' });
  await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // The terminal streams prices and draws the chart after load.
  await page.waitForTimeout(10_000);
  if (shot.account) {
    // Dropdowns close when the window loses focus.
    await page.bringToFront();
    await tidy(page);
  }
  await shot.prepare?.(page);
  if (shot.account) {
    // Never capture without redaction: wait until the document is there again after any reload.
    await page.waitForFunction(() => document.body !== null && document.readyState !== 'loading');
    await page.waitForTimeout(1500);
    await tidy(page); // toasts that arrived while preparing
    await page.evaluate(redactPersonalData);
  }
  const png = await page.screenshot(shot.clip ? { clip: await shot.clip(page) } : {});
  const webp = await toWebp(encoder, png, shot.width);
  fs.writeFileSync(`${OUT}/${shot.name}.webp`, webp);
  console.log(`saved ${shot.name}.webp`, Math.round(webp.length / 1024), 'KB');
}

const publicShots = wanted.filter((s) => !s.account);
if (publicShots.length > 0) {
  const browser = await chromium.launch();
  for (const shot of publicShots) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      deviceScaleFactor: 2,
      locale: 'ru-RU',
      colorScheme: 'dark',
    });
    await capture(await context.newPage(), shot, await context.newPage());
    await context.close();
  }
  await browser.close();
}

const accountShots = wanted.filter((s) => s.account);
if (accountShots.length > 0) {
  // Path of the signed-in profile: env or a local git-ignored file (scripts/.bybit-profile).
  const profileFile = 'scripts/.bybit-profile';
  const profile =
    process.env.BYBIT_PROFILE ||
    (fs.existsSync(profileFile) ? fs.readFileSync(profileFile, 'utf8').trim() : '');
  if (!profile) throw new Error('Account screens need BYBIT_PROFILE (a signed-in browser profile)');
  for (const shot of accountShots) {
    const context = await chromium.launchPersistentContext(profile, {
      headless: false,
      viewport: shot.viewport,
      deviceScaleFactor: 2,
      locale: 'ru-RU',
      colorScheme: 'dark',
    });
    try {
      await capture(await context.newPage(), shot, await context.newPage());
    } catch (error) {
      console.log(`failed ${shot.name}:`, (error as Error).message.split('\n')[0]);
    } finally {
      await context.close();
    }
  }
}

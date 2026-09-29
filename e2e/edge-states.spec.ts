import { expect, test, type BrowserContext } from '@playwright/test';

/** Broken environments (T-905): the app explains the problem and never shows a blank page. */
const FREE = JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 });

const ROUTES = ['/', '/lesson/m03-l02', '/simulator', '/journal', '/journal/new', '/stats'];

async function expectNoBlankPages(context: BrowserContext) {
  const page = await context.newPage();
  for (const route of ROUTES) {
    await page.goto(`/#${route}`);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  return page;
}

test('blocked localStorage: pages work and warn that progress is not saved', async ({
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  const page = await expectNoBlankPages(context);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Прогресс не сохраняется' }),
  ).toBeVisible();
});

test('no IndexedDB: journal explains the problem instead of loading forever', async ({
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => undefined });
  });
  await context.addInitScript((s) => localStorage.setItem('tc-settings', s), FREE);
  const page = await expectNoBlankPages(context);
  await page.goto('/#/journal');
  await expect(page.getByText(/хранилище браузера недоступно/)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'IndexedDB' })).toBeVisible();
});

test('corrupt storage: the app starts from clean state', async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('tc-progress', '{broken json');
    localStorage.setItem('tc-settings', '{"state":{"freeMode":"yes","theme":42},"version":1}');
  });
  await expectNoBlankPages(context);
});

test('missing candle data: charts show a retry instead of crashing', async ({ context }) => {
  await context.route('**/data/*.json', (route) => route.fulfill({ status: 404, body: 'nope' }));
  await context.addInitScript((s) => localStorage.setItem('tc-settings', s), FREE);
  const page = await expectNoBlankPages(context);
  await page.goto('/#/simulator');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Не удалось загрузить график' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
});

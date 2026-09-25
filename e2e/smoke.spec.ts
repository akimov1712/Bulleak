import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

test('home opens without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Главная' })).toBeVisible();
  await expect(page).toHaveTitle(/Трейдинг на Bybit с нуля/);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

const pages: [string, string][] = [
  ['#/path', 'Карта курса'],
  ['#/lesson/m00-l01', 'Урок m00-l01'],
  ['#/simulator', 'Тренажёр'],
  ['#/tools', 'Инструменты'],
  ['#/journal', 'Журнал сделок'],
  ['#/glossary', 'Глоссарий'],
  ['#/stats', 'Статистика'],
  ['#/achievements', 'Достижения'],
  ['#/settings', 'Настройки'],
  ['#/definitely-missing', 'Такой страницы нет'],
];

for (const [hash, heading] of pages) {
  test(`${hash} renders "${heading}"`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

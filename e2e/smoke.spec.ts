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
  await page.goto('./');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Добро пожаловать в курс!' }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Bulleak/);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

const pages: [string, string][] = [
  ['#/path', 'Карта курса'],
  ['#/lesson/m00-l01', 'Добро пожаловать: что такое трейдинг и чем он не является'],
  ['#/simulator', 'Тренажёр'],
  ['#/tools', 'Инструменты'],
  ['#/journal', 'Журнал сделок'],
  ['#/glossary', 'Глоссарий'],
  ['#/stats', 'Статистика'],
  ['#/achievements', 'Достижения'],
  ['#/settings', 'Настройки'],
  ['#/about', 'О курсе'],
  ['#/definitely-missing', 'Такой страницы нет'],
];

test('navigation reaches sections on every screen size', async ({ page, isMobile }) => {
  await page.goto('./');
  if (isMobile) {
    const bottomNav = page.getByRole('navigation', { name: 'Основная навигация' });
    await bottomNav.getByRole('link', { name: 'Тренажёр' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Тренажёр' })).toBeVisible();
    await bottomNav.getByRole('button', { name: 'Ещё' }).click();
    await page
      .getByRole('dialog', { name: 'Разделы' })
      .getByRole('link', { name: 'Глоссарий' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Глоссарий' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else {
    await page.getByRole('link', { name: 'Статистика' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Статистика' })).toBeVisible();
    await page.getByRole('link', { name: 'О курсе' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'О курсе' })).toBeVisible();
  }
});

test('theme toggle switches and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const [hash, heading] of pages) {
  test(`${hash} renders "${heading}"`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`./${hash}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

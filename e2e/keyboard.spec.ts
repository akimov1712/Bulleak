import { expect, test, type Locator, type Page } from '@playwright/test';

/** Keyboard-only paths (T-902): skip link, a quiz answer, simulator and journal controls. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 }),
    ),
  );
});

/** Press Tab until one of the target's elements is focused (no clicks, no .focus()). */
async function tabTo(page: Page, target: Locator, max = 150) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluateAll((els) =>
      els.some((el) => el === document.activeElement),
    );
    if (focused) return;
  }
  throw new Error(`Tab never reached ${target.toString()}`);
}

test('skip link moves focus to the content without changing the route', async ({ page }) => {
  await page.goto('/#/lesson/m09-l02');
  await page.locator('main h1').waitFor();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(page.url()).toContain('#/lesson/m09-l02');
});

test('a quiz question can be answered with the keyboard', async ({ page }) => {
  await page.goto('/#/lesson/m00-l01/quiz');
  await tabTo(page, page.getByRole('button', { name: 'Начать' }));
  await page.keyboard.press('Enter');
  const check = page.getByRole('button', { name: 'Проверить' });
  await expect(check).toBeVisible();
  // Questions are shuffled, so work with whatever comes first: Space on the question's
  // controls, a digit in a number field — until «Проверить» becomes available.
  await tabTo(page, page.getByRole('button', { name: 'Выйти из теста' }));
  for (let i = 0; i < 20 && !(await check.isEnabled()); i++) {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    if (tag === 'INPUT') await page.keyboard.type('1');
    else await page.keyboard.press('Space');
  }
  await expect(check).toBeEnabled();
  await tabTo(page, check);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Дальше' })).toBeVisible();
});

test('simulator and journal controls are reachable with Tab', async ({ page }) => {
  await page.goto('/#/simulator');
  // «Открыть сделку» is enabled once a side is picked.
  await tabTo(page, page.getByRole('radio', { name: 'Long' }));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('button', { name: 'Открыть сделку' }));
  await page.goto('/#/journal/new');
  await tabTo(page, page.getByRole('button', { name: 'Сохранить' }));
});

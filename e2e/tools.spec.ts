import { expect, test } from '@playwright/test';

/** E10: the position calculator computes the size from risk and stop; bad input shows a hint. */
test('position calculator: correct size, and a hint for impossible input', async ({ page }) => {
  await page.goto('/#/tools/position');
  const field = (name: string) => page.getByRole('textbox', { name });
  await field('Баланс').fill('2000');
  await field('Риск на сделку').fill('1');
  await field('Цена входа').fill('60000');
  await field('Стоп-лосс').fill('59000');
  // 2000 × 1 % = 20 $ risk, 1000 $ to the stop → 0,02 BTC.
  await expect(page.getByText('Объём позиции').locator('..')).toContainText('0,02 монет');

  // Stop equal to the entry: no size can be computed — the card explains what is missing.
  await field('Стоп-лосс').fill('60000');
  await expect(page.getByText('Объём позиции')).toBeHidden();
  await expect(page.getByText(/стоп не должен совпадать со входом/)).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { addJournalTrade, expectNoHorizontalScroll, kpi } from './helpers';

test.describe('journal (T-612)', () => {
  test('three trades give the right metrics and survive reload', async ({ page }) => {
    // +2R, −1R, +1R (risk $10 each: entry 100, stop 90, qty 1)
    await addJournalTrade(page, {
      entry: '100',
      stop: '90',
      qty: '1',
      openedAt: '2026-09-01T10:00',
      exit: '120',
      closedAt: '2026-09-02T10:00',
    });
    await addJournalTrade(page, {
      entry: '100',
      stop: '90',
      qty: '1',
      openedAt: '2026-09-03T10:00',
      exit: '90',
      closedAt: '2026-09-03T18:00',
    });
    await addJournalTrade(page, {
      entry: '100',
      stop: '110',
      qty: '1',
      side: 'Short',
      openedAt: '2026-09-05T10:00',
      exit: '90',
      closedAt: '2026-09-06T10:00',
    });

    await expect(kpi(page, 'Сделок')).toHaveText('3');
    await expect(kpi(page, 'Винрейт')).toHaveText('67%');
    await expect(kpi(page, 'Профит-фактор')).toHaveText('3');
    await expect(kpi(page, 'Средний R')).toHaveText('+0,67R');
    await expect(page.getByRole('img', { name: /Кривая капитала/ })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.reload();
    await expect(kpi(page, 'Сделок')).toHaveText('3');
  });

  test('a stop on the wrong side is rejected in the form', async ({ page }) => {
    await page.goto('/#/journal/new');
    await page.getByLabel('Цена входа').fill('100');
    await page.getByLabel('Стоп-лосс').fill('110');
    await page.getByLabel('Объём (в монетах)').fill('1');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByText(/Стоп должен быть по другую сторону/)).toBeVisible();
    await expect(page).toHaveURL(/journal\/new/);
  });
});

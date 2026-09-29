import { expect, test } from '@playwright/test';
import { addJournalTrade, kpi } from './helpers';

test.describe('backup (T-612)', () => {
  test('export → reset → import brings everything back; a broken file changes nothing', async ({
    page,
  }, testInfo) => {
    await addJournalTrade(page, {
      entry: '100',
      stop: '90',
      qty: '1',
      openedAt: '2026-09-01T10:00',
      exit: '120',
      closedAt: '2026-09-02T10:00',
    });
    await page.goto('./#/settings');
    await page.getByLabel('Имя').fill('Тестер');
    await page.getByRole('radio', { name: 'Тёмная' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать резервную копию' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^trading-course-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = testInfo.outputPath('backup.json');
    await download.saveAs(file);
    await expect(page.getByText('ещё не делалась')).toBeHidden();

    // Reset everything
    await page.getByRole('button', { name: 'Сбросить весь прогресс' }).click();
    const reset = page.getByRole('dialog', { name: 'Сбросить весь прогресс?' });
    await reset.getByRole('textbox').fill('СБРОС');
    await reset.getByRole('button', { name: 'Сбросить' }).click();
    await expect(page.getByLabel('Имя')).toHaveValue('');
    await page.goto('./#/journal');
    await expect(page.getByText('Журнал пока пуст')).toBeVisible();

    // A broken file: readable error, nothing changes
    await page.goto('./#/settings');
    await page.getByLabel('Восстановить из файла').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"app":"trading-course","schema":1'),
    });
    await expect(page.getByText(/Это не JSON-файл/)).toBeVisible();
    await expect(page.getByLabel('Имя')).toHaveValue('');

    // Restore from the real backup
    await page.getByLabel('Восстановить из файла').setInputFiles(file);
    const restore = page.getByRole('dialog', { name: 'Восстановить из копии?' });
    await expect(restore).toContainText('в журнале 1');
    await restore.getByRole('button', { name: 'Заменить данные' }).click();
    await expect(page.getByLabel('Имя')).toHaveValue('Тестер');
    await expect(page.getByRole('radio', { name: 'Тёмная' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.goto('./#/journal');
    await expect(kpi(page, 'Сделок')).toHaveText('1');
  });
});

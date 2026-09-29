import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { atr } from '../src/lib/indicators/indicators';
import { formatR } from '../src/lib/format';
import { mulberry32 } from '../src/lib/random';
import { parseDataset } from '../src/lib/trading/candles';
import { defaultLevels, INSTRUMENT_STEPS, planTrade } from '../src/lib/trading/simPlan';
import { pickStart } from '../src/lib/trading/simSession';
import { simulateTrade } from '../src/lib/trading/simulate';

const SEED = 424242;

/** The same trade the page opens: BTCUSDT 4H (default), seeded start, default long levels. */
function expectedLongResult() {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.resolve('public/data/BTCUSDT-240.json'), 'utf8'),
  );
  const { candles } = parseDataset('BTCUSDT-240', raw);
  const start = pickStart(candles.length, mulberry32(SEED));
  if (start === null) throw new Error('dataset too short');
  const entry = candles[start]?.c ?? 0;
  const { sl, tp } = defaultLevels(
    'long',
    entry,
    atr(candles)[start] ?? null,
    INSTRUMENT_STEPS.BTCUSDT.tick,
  );
  const plan = planTrade({
    side: 'long',
    entry,
    sl,
    tp,
    riskPct: 1,
    balance: 10_000,
    leverage: 1,
    symbol: 'BTCUSDT',
  });
  if (plan.qty === null) throw new Error('no position');
  const result = simulateTrade(candles, start, { side: 'long', entry, sl, tp, qty: plan.qty });
  if (!result) throw new Error('no result');
  return result;
}

test.describe('simulator (T-511)', () => {
  test('a seeded long plays out like simulateTrade, lands in history and survives reload', async ({
    page,
  }) => {
    const expected = expectedLongResult();
    await page.goto(`./#/simulator?seed=${SEED}`);
    await expect(page.getByTestId('sim-chart')).toBeVisible();

    await page.getByRole('radio', { name: 'Long' }).click();
    await expect(page.getByText('R:R', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Открыть сделку' }).click();
    // The trade may already be over at 1× when the button is reached.
    await page
      .getByRole('button', { name: 'Мгновенно' })
      .click({ timeout: 2000 })
      .catch(() => undefined);

    const result = page.locator('[aria-label="Результат сделки"]');
    await expect(result).toBeVisible();
    await expect(result.getByRole('status')).toContainText(formatR(expected.r));

    const history = page.getByRole('region', { name: 'История сделок' });
    await expect(history.getByRole('listitem')).toHaveCount(1);
    await expect(history.getByRole('listitem')).toContainText(formatR(expected.r));

    await page.reload();
    await expect(
      page.getByRole('region', { name: 'История сделок' }).getByRole('listitem'),
    ).toHaveCount(1);
    await expect(page.getByText('Виртуальный баланс:')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Сбросить' })).toBeEnabled();
  });

  test('a lesson scenario: skipping the mid-range setup is the textbook decision', async ({
    page,
  }) => {
    await page.goto('./#/simulator/m03-range-middle');
    await expect(page.getByRole('heading', { level: 1, name: 'Середина диапазона' })).toBeVisible();
    await expect(page.getByText('Сценарий: Середина диапазона')).toBeVisible();
    await page.getByRole('button', { name: /Пропустить/ }).click();
    await expect(page.getByText('Решение совпало с учебным')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Вернуться к уроку' })).toHaveAttribute(
      'href',
      '#/lesson/m03-l04',
    );
  });
});

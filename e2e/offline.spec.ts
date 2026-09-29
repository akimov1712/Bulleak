import { expect, test } from '@playwright/test';

/** PWA (T-904): after the first visit the course works without a network. */
test('lessons and the simulator open offline after the first visit', async ({ page, context }) => {
  await context.addInitScript(() =>
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 }),
    ),
  );
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('/#/lesson/m09-l02');
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Расчёт размера позиции' }),
  ).toBeVisible();
  await page.goto('/#/simulator');
  await page.reload();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('the manifest makes the app installable', async ({ page }) => {
  await page.goto('/');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    return link
      ? ((await (await fetch(link.href)).json()) as { name: string; icons: unknown[] })
      : null;
  });
  expect(manifest?.name).toBe('Трейдинг на Bybit с нуля');
  expect(manifest?.icons.length).toBeGreaterThanOrEqual(3);
});

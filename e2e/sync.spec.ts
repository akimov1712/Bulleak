import { expect, test, type Page } from '@playwright/test';

// Runs in the «accounts» project (site with VITE_API_URL + test API). Two browser contexts
// are two devices of one learner.

const uniqueEmail = () => `sync-${Date.now()}-${Math.round(Math.random() * 1e6)}@bulleak.test`;
const PASSWORD = 'sync long pass phrase';

const syncedSettings = (page: Page) =>
  page.waitForResponse(
    (res) => res.url().includes('/sync/settings') && res.request().method() === 'PUT' && res.ok(),
  );

async function toggleTheme(page: Page, to: 'светлую' | 'тёмную') {
  await page.getByRole('button', { name: /^Профиль:/ }).click();
  await page.getByRole('button', { name: `Включить ${to} тему` }).click();
  await page.keyboard.press('Escape');
}

test('progress and settings follow the learner to another device, also after being offline', async ({
  browser,
  baseURL,
}) => {
  // Local changes sync at most every 30 s (MIN_GAP_MS in syncEngine), and the test waits for
  // three such syncs on the laptop.
  test.setTimeout(180_000);
  const email = uniqueEmail();
  const laptop = await browser.newContext({ baseURL });
  const phone = await browser.newContext({ baseURL });
  const a = await laptop.newPage();
  const b = await phone.newPage();

  // Laptop: a new account, then a settings change.
  await a.goto('./#/register');
  await a.getByLabel('Как тебя зовут?').fill('Тестер');
  await a.getByLabel('E-mail').fill(email);
  await a.getByLabel('Пароль').fill(PASSWORD);
  const firstSync = syncedSettings(a);
  await a.getByRole('button', { name: 'Создать аккаунт' }).click();
  await firstSync;
  const themeSync = syncedSettings(a);
  await toggleTheme(a, 'светлую');
  await themeSync;

  // Phone: sign in — the name (progress) and the theme (settings) arrive.
  await b.goto('./#/login');
  await b.getByLabel('E-mail').fill(email);
  await b.getByLabel('Пароль').fill(PASSWORD);
  await b.getByRole('button', { name: 'Войти' }).click();
  await expect(b.getByRole('heading', { level: 1, name: /, Тестер!$/ })).toBeVisible();
  await expect(b.locator('html')).toHaveAttribute('data-theme', 'light');

  // Laptop goes offline: the change waits and is sent when the network is back.
  await laptop.setOffline(true);
  await toggleTheme(a, 'тёмную');
  await a.getByRole('button', { name: /^Профиль:/ }).click();
  await expect(a.getByText(/Нет связи — изменения сохранятся/)).toBeVisible({ timeout: 45_000 });
  await a.keyboard.press('Escape');
  const backOnline = syncedSettings(a);
  await laptop.setOffline(false);
  await backOnline;

  await b.reload();
  await expect(b.locator('html')).toHaveAttribute('data-theme', 'dark');

  await laptop.close();
  await phone.close();
});

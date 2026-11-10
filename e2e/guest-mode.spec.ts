import { expect, test } from '@playwright/test';

// The e2e build has no VITE_API_URL: the site must stay exactly as it was before accounts.
test.describe('guest-only build', () => {
  test('has no sign-in in the profile menu or settings', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: /^Профиль:/ }).click();
    await expect(page.getByRole('link', { name: 'Настройки' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Войти' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Регистрация' })).toHaveCount(0);

    await page.goto('./#/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Аккаунт' })).toHaveCount(0);
  });

  test('explains that accounts are off on old links', async ({ page }) => {
    for (const hash of ['#/login', '#/register', '#/forgot']) {
      await page.goto(`./${hash}`);
      await expect(page.getByText(/Аккаунты на этой версии сайта пока недоступны/)).toBeVisible();
      await expect(page.locator('form')).toHaveCount(0);
    }
  });
});

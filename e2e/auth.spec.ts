import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { MAIL_OUTBOX } from '../playwright.config';

// Runs in the «accounts» project: a site build with VITE_API_URL and a test API on PGlite.

interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** The newest link of a kind sent to this address (waits for the background letter). */
async function linkFor(to: string, kind: 'verify' | 'reset'): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const lines = (await readFile(MAIL_OUTBOX, 'utf8').catch(() => '')).split('\n');
      const mails = lines.filter(Boolean).map((line) => JSON.parse(line) as Mail);
      const text = mails.filter((m) => m.to === to).at(-1)?.text ?? '';
      link = new RegExp(`#/${kind}\\?token=[\\w-]+`).exec(text)?.[0];
      return link;
    })
    .toBeTruthy();
  return link ?? '';
}

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}@bulleak.test`;

async function register(page: Page, email: string, password: string) {
  await page.goto('./#/register');
  await page.getByLabel('Как тебя зовут?').fill('Тестер');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByText('Аккаунт создан')).toBeVisible();
}

async function openProfile(page: Page) {
  await page.getByRole('button', { name: /^Профиль:/ }).click();
}

test('register, stay signed in after reload, sign out and back in', async ({ page }) => {
  const email = uniqueEmail('flow');
  await register(page, email, 'first long pass phrase');

  await page.reload();
  await openProfile(page);
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByText('Ты вышел из аккаунта')).toBeVisible();

  await page.goto('./#/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill('wrong password here');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('alert')).toContainText('Неверный e-mail или пароль');
  await page.getByLabel('Пароль').fill('first long pass phrase');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByText('С возвращением, Тестер!')).toBeVisible();
});

test('a taken e-mail is reported under the field', async ({ page }) => {
  const email = uniqueEmail('taken');
  await register(page, email, 'first long pass phrase');
  await openProfile(page);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await page.goto('./#/register');
  await page.getByLabel('Как тебя зовут?').fill('Другой');
  await page.getByLabel('E-mail').fill(email.toUpperCase());
  await page.getByLabel('Пароль').fill('second long pass phrase');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByText('Аккаунт с таким e-mail уже есть')).toBeVisible();
});

test('verify the e-mail and reset the password by the links from letters', async ({ page }) => {
  const email = uniqueEmail('mail');
  await register(page, email, 'first long pass phrase');

  await page.goto(`./${await linkFor(email, 'verify')}`);
  await expect(page.getByText('E-mail подтверждён. Спасибо!')).toBeVisible();
  await page.goto('./#/settings');
  await expect(page.getByText('Подтверждён')).toBeVisible();

  await page.goto('./#/forgot');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Отправить ссылку' }).click();
  await expect(page.getByText(/Если аккаунт с адресом/)).toBeVisible();

  await page.goto(`./${await linkFor(email, 'reset')}`);
  await page.getByLabel('Новый пароль').fill('brand new pass phrase');
  await page.getByRole('button', { name: 'Сохранить пароль' }).click();
  await expect(page.getByText(/Пароль изменён/)).toBeVisible();

  await page.goto('./#/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill('brand new pass phrase');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByText('С возвращением, Тестер!')).toBeVisible();
});

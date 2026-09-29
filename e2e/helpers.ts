import { expect, type Page } from '@playwright/test';
import type { Question } from '../src/types/quiz';

/** Answer the question currently on screen, correctly or deliberately wrong. */
export async function answerQuestion(page: Page, questions: Question[], correct: boolean) {
  const prompt = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();
  const q = questions.find((x) => x.prompt === prompt);
  if (!q) throw new Error(`Unknown question: ${prompt}`);

  switch (q.type) {
    case 'single': {
      const option = q.options.find((o) => (o.id === q.correct) === correct);
      await page.getByRole('radio', { name: option?.text, exact: true }).click();
      break;
    }
    case 'truefalse':
      await page
        .getByRole('radio', { name: q.correct === correct ? /^\d?Верно$/ : /^\d?Неверно$/ })
        .click();
      break;
    case 'multi':
      for (const o of q.options.filter((x) => q.correct.includes(x.id) === correct)) {
        await page.getByRole('checkbox', { name: o.text, exact: true }).click();
      }
      break;
    case 'numeric':
      await page
        .getByRole('textbox')
        .fill(String(correct ? q.correct : q.correct + 100).replace('.', ','));
      break;
    case 'match':
      for (const [i, p] of q.pairs.entries()) {
        const right = correct ? p.right : (q.pairs[(i + 1) % q.pairs.length]?.right ?? p.right);
        await page.getByLabel(p.left, { exact: true }).selectOption(right);
      }
      break;
    case 'order':
      if (!correct) break; // starts shuffled → already wrong
      for (const [target, item] of q.items.entries()) {
        const texts = await page
          .getByRole('list', { name: 'Порядок элементов' })
          .getByRole('listitem')
          .allTextContents();
        const pos = texts.findIndex((t) => t.includes(item));
        for (let k = pos; k > target; k--)
          await page.getByRole('button', { name: `Поднять «${item}»` }).click();
      }
      break;
    case 'chart-click':
      // The keyboard-friendly alternative to clicking: step to a candle or type a price.
      if (q.target.kind === 'price') {
        const { min, max } = q.target;
        const value = correct ? (min + max) / 2 : max + (max - min) * 10 + 1;
        await page.getByRole('textbox', { name: 'Цена' }).fill(String(value).replace('.', ','));
      } else {
        const targets = q.target.indices;
        const index = correct ? (targets[0] ?? q.from) : targets.includes(q.from) ? q.to : q.from;
        for (let i = q.from; i <= index; i++) {
          await page.getByRole('button', { name: 'Следующая свеча' }).click();
        }
      }
      break;
  }
}

/** Run a whole lesson quiz answering the first `correctCount` questions correctly. */
export async function runLessonQuiz(page: Page, questions: Question[], correctCount: number) {
  await page.getByRole('button', { name: 'Начать' }).click();
  for (let i = 0; i < questions.length; i++) {
    await answerQuestion(page, questions, i < correctCount);
    await page.getByRole('button', { name: 'Проверить' }).click();
    const last = i === questions.length - 1;
    await page.getByRole('button', { name: last ? 'Результат' : 'Дальше' }).click();
  }
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

/** Close the level-up modal if it appeared (it overlays the page and blocks clicks). */
export async function dismissLevelUp(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Новый уровень!' });
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: 'Продолжить' }).click();
    await expect(dialog).toBeHidden();
  }
}

export interface JournalInput {
  entry: string;
  stop: string;
  qty: string;
  openedAt: string;
  exit?: string;
  closedAt?: string;
  side?: 'Long' | 'Short';
}

/** Adds a trade through the journal form and waits for the journal list. */
export async function addJournalTrade(page: Page, t: JournalInput) {
  await page.goto('/#/journal/new');
  await expect(page.getByRole('heading', { level: 1, name: 'Новая сделка' })).toBeVisible();
  if (t.side === 'Short') await page.getByRole('radio', { name: 'Short' }).click();
  await page.getByLabel('Цена входа').fill(t.entry);
  await page.getByLabel('Стоп-лосс').fill(t.stop);
  await page.getByLabel('Объём (в монетах)').fill(t.qty);
  await page.getByLabel('Дата и время входа').fill(t.openedAt);
  if (t.exit) await page.getByLabel('Цена выхода').fill(t.exit);
  if (t.closedAt) await page.getByLabel('Дата и время выхода').fill(t.closedAt);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Журнал сделок' })).toBeVisible();
}

/** Value of a KPI tile (<dt>label</dt><dd>value</dd>). */
export const kpi = (page: Page, label: string) =>
  page
    .locator('dt', { hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]');

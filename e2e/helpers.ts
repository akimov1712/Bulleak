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
      await page.getByRole('radio', { name: option?.text }).click();
      break;
    }
    case 'truefalse':
      await page
        .getByRole('radio', { name: q.correct === correct ? /^\d?Верно$/ : /^\d?Неверно$/ })
        .click();
      break;
    case 'multi':
      for (const o of q.options.filter((x) => q.correct.includes(x.id) === correct)) {
        await page.getByRole('checkbox', { name: o.text }).click();
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
      throw new Error('chart-click not supported in this helper yet');
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

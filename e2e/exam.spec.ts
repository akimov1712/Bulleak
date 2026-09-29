import { expect, test, type Page } from '@playwright/test';
import { exam as m01Exam } from '../src/content/modules/m01/exam';
import { quiz as m03l03Quiz } from '../src/content/modules/m03/l03/quiz';
import type { ChartClickQuestion } from '../src/types/quiz';
import { answerQuestion, dismissLevelUp } from './helpers';

/** Lessons of modules 0–1 completed, so the module 1 exam is open (not free mode). */
async function seedProgress(page: Page) {
  await page.addInitScript(() => {
    const done = {
      readAt: 1,
      quizBest: 1,
      quizAttempts: 1,
      completedAt: 1,
      timeSpentSec: 60,
      xpEarned: 85,
      improvements: 0,
    };
    const ids = [
      'm00-l01',
      'm00-l02',
      'm00-l03',
      'm01-l01',
      'm01-l02',
      'm01-l03',
      'm01-l04',
      'm01-l05',
    ];
    if (!localStorage.getItem('tc-progress')) {
      localStorage.setItem(
        'tc-progress',
        JSON.stringify({
          state: { lessons: Object.fromEntries(ids.map((id) => [id, done])) },
          version: 3,
        }),
      );
    }
  });
}

async function runExam(page: Page, correct: boolean) {
  await page.getByRole('button', { name: 'Начать экзамен' }).click();
  const total = m01Exam.sample ?? m01Exam.questions.length;
  for (let i = 0; i < total; i++) {
    await answerQuestion(page, [...m01Exam.questions], correct);
    await page
      .getByRole('button', { name: i === total - 1 ? 'Завершить экзамен' : 'Ответить' })
      .click();
  }
}

test.describe('module exam (E6)', () => {
  test('a failed exam shows what to repeat and a retake timer', async ({ page }) => {
    await seedProgress(page);
    await page.goto('./#/exam/m01');
    await runExam(page, false);
    await expect(page.getByText('Почти получилось')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Что повторить' })).toBeVisible();
    await expect(page.getByText(/Пересдать можно через 10 минут/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Пересдача откроется через/)).toBeVisible();
  });

  test('a passed exam opens the next module', async ({ page }) => {
    await seedProgress(page);
    await page.goto('./#/lesson/m02-l01');
    await expect(page.getByText('Урок пока закрыт')).toBeVisible();
    await page.goto('./#/exam/m01');
    await runExam(page, true);
    await dismissLevelUp(page);
    await page.getByRole('link', { name: /К модулю «/ }).click();
    await page.goto('./#/lesson/m02-l01');
    await expect(page.getByText('Урок пока закрыт')).toBeHidden();
    await expect(page.locator('main h1')).toBeVisible();
  });
});

test('chart-click question: a click picks a candle, arrows reach the answer (E7)', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 }),
    ),
  );
  await page.goto('./#/lesson/m03-l03/quiz');
  await page.getByRole('button', { name: 'Начать' }).click();
  const questions = [...m03l03Quiz.questions];
  for (let i = 0; i < questions.length; i++) {
    const prompt = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();
    const q = questions.find((x) => x.prompt === prompt);
    if (q?.type === 'chart-click' && q.target.kind === 'candle') {
      await clickThenStep(page, q);
    } else {
      await answerQuestion(page, questions, true);
    }
    await page.getByRole('button', { name: 'Проверить' }).click();
    await page
      .getByRole('button', { name: i === questions.length - 1 ? 'Результат' : 'Дальше' })
      .click();
  }
  await dismissLevelUp(page);
  await expect(page.getByRole('img', { name: '3 из 3 звёзд' })).toBeVisible();
});

/** Click the chart (selects some candle), then walk to the first target with the arrows. */
async function clickThenStep(page: Page, q: ChartClickQuestion) {
  const status = page.getByText(/Свеча не выбрана|Свеча \d+ из \d+/);
  await expect(status).toHaveText('Свеча не выбрана');
  const box = await page.locator('main canvas').first().boundingBox();
  if (!box) throw new Error('chart not rendered');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(status).toHaveText(/Свеча \d+ из \d+/);
  if (q.target.kind !== 'candle') return;
  const count = q.to - q.from + 1;
  const back = page.getByRole('button', { name: 'Предыдущая свеча' });
  for (let i = 0; i < count; i++) await back.click();
  await expect(status).toHaveText(`Свеча 1 из ${count}`);
  const target = q.target.indices[0] ?? q.from;
  for (let i = q.from; i < target; i++) {
    await page.getByRole('button', { name: 'Следующая свеча' }).click();
  }
  await expect(status).toHaveText(`Свеча ${target - q.from + 1} из ${count}`);
}

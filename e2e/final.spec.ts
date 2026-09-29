import { expect, test } from '@playwright/test';
import { exam as m01 } from '../src/content/modules/m01/exam';
import { exam as m02 } from '../src/content/modules/m02/exam';
import { exam as m03 } from '../src/content/modules/m03/exam';
import { exam as m04 } from '../src/content/modules/m04/exam';
import { exam as m05 } from '../src/content/modules/m05/exam';
import { exam as m06 } from '../src/content/modules/m06/exam';
import { exam as m07 } from '../src/content/modules/m07/exam';
import { exam as m08 } from '../src/content/modules/m08/exam';
import { exam as m09 } from '../src/content/modules/m09/exam';
import { exam as m10 } from '../src/content/modules/m10/exam';
import { exam as m11 } from '../src/content/modules/m11/exam';
import { exam as m12 } from '../src/content/modules/m12/exam';
import { answerQuestion, dismissLevelUp } from './helpers';

// The final exam pools every module exam (src/content/final-exam.ts builds it with a Vite glob).
const POOL = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12].flatMap((e) => [
  ...e.questions,
]);

/** Textbook answers of the practical part, by task title. */
const PRACTICAL: Record<
  string,
  { side: 'Шорт' | 'Лонг' | 'Пропустить'; sl?: string; tp?: string }
> = {
  'ETH, август 2026': { side: 'Шорт', sl: '1910', tp: '1820' },
  'SOL, сентябрь 2026': { side: 'Лонг', sl: '101,7', tp: '107,3' },
  'ETH, 21 сентября 2026': { side: 'Пропустить' },
};

test('final exam: theory and practice passed → certificate (E14)', async ({ page }) => {
  test.slow(); // 40 questions + 3 charts
  await page.addInitScript(() => {
    if (localStorage.getItem('tc-progress')) return;
    const passed = { best: 1, attempts: 1, passedAt: 1 };
    const ids = [
      'm01',
      'm02',
      'm03',
      'm04',
      'm05',
      'm06',
      'm07',
      'm08',
      'm09',
      'm10',
      'm11',
      'm12',
    ];
    localStorage.setItem(
      'tc-progress',
      JSON.stringify({
        state: {
          exams: Object.fromEntries(ids.map((id) => [id, passed])),
          profile: { name: 'Анна' },
        },
        version: 3,
      }),
    );
  });
  await page.goto('./#/exam/final');
  await page.getByRole('button', { name: 'Начать экзамен' }).click();
  for (let i = 0; i < 40; i++) {
    await answerQuestion(page, POOL, true);
    await page.getByRole('button', { name: i === 39 ? 'Завершить экзамен' : 'Ответить' }).click();
  }

  for (let k = 0; k < 3; k++) {
    await expect(page.getByText(`Практическая часть · задача ${k + 1} из 3`)).toBeVisible();
    const title = (await page.getByRole('heading', { level: 1 }).textContent())?.trim() ?? '';
    const plan = PRACTICAL[title];
    if (!plan) throw new Error(`Unknown practical task: ${title}`);
    await page.getByRole('radio', { name: plan.side }).click();
    if (plan.sl && plan.tp) {
      await page.getByRole('textbox', { name: 'Стоп-лосс' }).fill(plan.sl);
      await page.getByRole('textbox', { name: 'Тейк-профит' }).fill(plan.tp);
    }
    await page.getByRole('button', { name: /Ответить и/ }).click();
  }

  await expect(page.getByText(/Теория: 100\s?% — сдана\. Практика: сдана\./)).toBeVisible();
  await dismissLevelUp(page);
  await page.getByRole('link', { name: 'Получить сертификат' }).click();
  const card = page.getByTestId('certificate');
  await expect(card).toContainText('Анна');
  await expect(card).toContainText(/TBN-[0-9A-F]{4}-[0-9A-F]{4}/);
});

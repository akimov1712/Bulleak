import { expect, test } from '@playwright/test';
import { quiz } from '../src/content/modules/m00/l01/quiz';
import { dismissLevelUp, runLessonQuiz } from './helpers';

test.describe('rewards after a lesson (E4)', () => {
  test('passing the first quiz gives XP, achievements, level-up, streak and opens the next node', async ({
    page,
  }) => {
    await page.goto('/#/lesson/m00-l01/quiz');
    await expect(page.getByRole('button', { name: 'Опыт: 0 XP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Уровень 1, Новичок' })).toBeVisible();

    await runLessonQuiz(page, quiz.questions, quiz.questions.length);
    await expect(page.getByRole('heading', { name: 'Идеально!' })).toBeVisible();

    // Level-up modal and achievement toasts
    const levelUp = page.getByRole('dialog', { name: 'Новый уровень!' });
    await expect(levelUp).toBeVisible();
    await expect(page.getByText('Достижение: Проверено')).toBeVisible();
    await expect(page.getByText('Достижение: Отличник')).toBeVisible();
    await dismissLevelUp(page);

    // HUD: at least 50 + 25 + goal 20 + achievements 10 + 15 = 120 XP (a fast run or the time of
    // day can add «Быстрый ум» / «Ранняя пташка», so do not pin the exact number).
    const xpLabel = await page
      .getByRole('button', { name: /^Опыт: \d+ XP$/ })
      .getAttribute('aria-label');
    expect(Number(xpLabel?.match(/\d+/)?.[0])).toBeGreaterThanOrEqual(120);
    await expect(page.getByRole('button', { name: /^Уровень 2,/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Серия: 1 день подряд' })).toBeVisible();

    // Map: first node completed with 3 stars, second open
    await page.goto('/#/path');
    await expect(page.getByRole('img', { name: '3 из 3 звёзд' }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Урок 0\.2: Реалистичные/ }).click();
    await expect(page.getByRole('link', { name: 'Начать урок' })).toHaveAttribute(
      'href',
      '#/lesson/m00-l02',
    );

    // Achievements page counts them
    await page.goto('/#/achievements');
    await expect(page.getByText(/^Получено [2-9] из 40$/)).toBeVisible();
  });
});

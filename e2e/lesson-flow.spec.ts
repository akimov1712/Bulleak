import { expect, test } from '@playwright/test';
import { quiz } from '../src/content/modules/m00/l01/quiz';
import { dismissLevelUp, expectNoHorizontalScroll, runLessonQuiz } from './helpers';

const LESSON_TITLE = 'Добро пожаловать: что такое трейдинг и чем он не является';

test.describe('lesson → quiz → progress (E2, E3, E5)', () => {
  test('reading marks the lesson read, passing the quiz completes it and survives reload', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/#/lesson/m00-l01');
    await expect(page.getByRole('heading', { level: 1, name: LESSON_TITLE })).toBeVisible();
    await expect(page.getByText('Новый урок')).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Read to the summary and spend enough active time (8-min lesson → 60 s threshold).
    await page.getByRole('region', { name: 'Итоги урока' }).scrollIntoViewIfNeeded();
    await page.clock.runFor(30_000);
    await page.mouse.wheel(0, 50);
    await page.clock.runFor(35_000);
    await expect(page.getByText('Прочитан — остался тест')).toBeVisible();

    await page.getByRole('link', { name: 'Пройти тест' }).click();
    await runLessonQuiz(page, quiz.questions, quiz.questions.length);
    await expect(page.getByRole('heading', { name: 'Идеально!' })).toBeVisible();
    await expect(page.getByRole('img', { name: '3 из 3 звёзд' })).toBeVisible();

    await page.reload();
    await page.goto('/#/module/m00');
    const lessons = page.getByRole('list', { name: 'Уроки модуля' }).getByRole('listitem');
    await expect(lessons.nth(0).getByRole('img', { name: '3 из 3 звёзд' })).toBeVisible();
    await expect(lessons.nth(1).getByRole('link')).toHaveAttribute('href', '#/lesson/m00-l02');
    await expect(page.getByText('1 из 3 уроков пройдено')).toBeVisible();
  });

  test('a failed quiz (below 80%) keeps the next lesson closed; a retake can pass', async ({
    page,
  }) => {
    await page.goto('/#/lesson/m00-l01/quiz');
    // Derived from the quiz so the test survives content edits: one below / exactly at 80%.
    const toPass = Math.ceil(quiz.questions.length * quiz.passRatio);
    await runLessonQuiz(page, quiz.questions, toPass - 1);
    await expect(page.getByRole('heading', { name: 'Почти получилось' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Разбор ошибок' })).toBeVisible();

    await page.goto('/#/lesson/m00-l02');
    await expect(page.getByText('Урок пока закрыт')).toBeVisible();

    await page.goto('/#/lesson/m00-l01/quiz');
    await runLessonQuiz(page, quiz.questions, toPass);
    await expect(page.getByRole('heading', { name: 'Тест сдан!' })).toBeVisible();
    await dismissLevelUp(page);
    await page.getByRole('link', { name: 'Следующий урок' }).click();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Реалистичные ожидания: риск, статистика новичков, время',
      }),
    ).toBeVisible();
  });

  test('a locked lesson opened by link shows the locked screen', async ({ page }) => {
    await page.goto('/#/lesson/m01-l03');
    await expect(page.getByText('Урок пока закрыт')).toBeVisible();
    await page.getByRole('link', { name: /К уроку «Добро пожаловать/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: LESSON_TITLE })).toBeVisible();
  });
});

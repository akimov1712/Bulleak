import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { quiz } from '@/content/modules/m00/l01/quiz';
import { answer, currentQuestion } from '@/test/quizHelpers';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

async function runQuiz(correctCount: number) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Начать' }));
  for (let i = 0; i < quiz.questions.length; i++) {
    await answer(currentQuestion(quiz.questions), i < correctCount);
    await user.click(screen.getByRole('button', { name: 'Проверить' }));
    await user.click(
      screen.getByRole('button', {
        name: i === quiz.questions.length - 1 ? 'Результат' : 'Дальше',
      }),
    );
  }
}

describe('QuizPage', () => {
  it('shows the intro with question count and threshold', async () => {
    renderAt('/lesson/m00-l01/quiz');
    expect(await screen.findByRole('heading', { name: 'Тест по уроку' })).toBeInTheDocument();
    expect(
      screen.getByText(`${quiz.questions.length} вопросов`, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(/нужно 80%/)).toBeInTheDocument();
  });

  it('passing every question completes the lesson and opens the next one', async () => {
    renderAt('/lesson/m00-l01/quiz');
    await runQuiz(quiz.questions.length);
    expect(await screen.findByRole('heading', { name: 'Идеально!' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 из 3 звёзд' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Следующий урок' })).toHaveAttribute(
      'href',
      '/lesson/m00-l02',
    );
    const lesson = useProgress.getState().lessons['m00-l01'];
    expect(lesson?.completedAt).toBeTypeOf('number');
    expect(lesson?.quizBest).toBe(1);
  }, 30_000);

  it('failing shows the mistakes review and does not complete the lesson', async () => {
    renderAt('/lesson/m00-l01/quiz');
    await runQuiz(5); // 5/8 = 62.5%
    expect(await screen.findByRole('heading', { name: 'Почти получилось' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Разбор ошибок' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Повторить урок' })).toBeInTheDocument();
    expect(useProgress.getState().lessons['m00-l01']?.completedAt).toBeUndefined();
    expect(useProgress.getState().lessons['m00-l01']?.quizAttempts).toBe(1);
  }, 30_000);

  it('shows feedback with the right answer after a wrong answer', async () => {
    const user = userEvent.setup();
    renderAt('/lesson/m00-l01/quiz');
    await user.click(await screen.findByRole('button', { name: 'Начать' }));
    const q = currentQuestion(quiz.questions);
    await answer(q, false);
    if (q.type !== 'order') {
      await user.click(screen.getByRole('button', { name: 'Проверить' }));
      expect(screen.getByText('Не совсем')).toBeInTheDocument();
      expect(screen.getByText(q.explanation)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Дальше' })).toHaveFocus();
    }
  });

  it('exiting mid-quiz asks for confirmation and records nothing', async () => {
    const user = userEvent.setup();
    const router = renderAt('/lesson/m00-l01/quiz');
    await user.click(await screen.findByRole('button', { name: 'Начать' }));
    await user.click(screen.getByRole('button', { name: 'Выйти из теста' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Выйти' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lesson/m00-l01'));
    expect(useProgress.getState().quizAttempts).toHaveLength(0);
  });

  it('keeps the quiz of a locked lesson closed', async () => {
    renderAt('/lesson/m00-l02/quiz');
    expect(await screen.findByText('Урок пока закрыт')).toBeInTheDocument();
  });
});

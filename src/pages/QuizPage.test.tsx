import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { quiz } from '@/content/modules/m00/l01/quiz';
import type { Question } from '@/types/quiz';

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

function currentQuestion(): Question {
  const prompt = screen.getByRole('heading', { level: 1 }).textContent;
  const q = quiz.questions.find((x) => x.prompt === prompt);
  if (!q) throw new Error(`Unknown question on screen: ${prompt}`);
  return q;
}

/** Answer the question on screen correctly (or deliberately wrong). */
async function answer(q: Question, correct: boolean) {
  const user = userEvent.setup();
  switch (q.type) {
    case 'single': {
      const option = correct
        ? q.options.find((o) => o.id === q.correct)
        : q.options.find((o) => o.id !== q.correct);
      await user.click(
        screen.getByRole('radio', { name: new RegExp(option?.text.slice(0, 20) ?? '') }),
      );
      break;
    }
    case 'truefalse':
      await user.click(
        screen.getByRole('radio', {
          name: new RegExp(`^\\d?${q.correct === correct ? 'Верно' : 'Неверно'}`),
        }),
      );
      break;
    case 'multi':
      for (const o of q.options.filter((x) =>
        correct ? q.correct.includes(x.id) : !q.correct.includes(x.id),
      )) {
        await user.click(screen.getByRole('checkbox', { name: new RegExp(o.text.slice(0, 20)) }));
      }
      break;
    case 'numeric':
      await user.type(screen.getByRole('textbox'), String(correct ? q.correct : q.correct + 100));
      break;
    case 'match':
      for (const [i, p] of q.pairs.entries()) {
        const right = correct ? p.right : (q.pairs[(i + 1) % q.pairs.length]?.right ?? p.right);
        await user.selectOptions(screen.getByLabelText(p.left), right);
      }
      break;
    case 'order': {
      if (!correct) break; // the shuffled start order is guaranteed wrong
      for (const [target, item] of q.items.entries()) {
        const list = screen.getByRole('list', { name: 'Порядок элементов' });
        const pos = within(list)
          .getAllByRole('listitem')
          .findIndex((li) => li.textContent?.includes(item));
        for (let k = pos; k > target; k--)
          await user.click(screen.getByRole('button', { name: `Поднять «${item}»` }));
      }
      break;
    }
    case 'chart-click':
      throw new Error('not used in m00-l01');
  }
}

async function runQuiz(correctCount: number) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Начать' }));
  for (let i = 0; i < quiz.questions.length; i++) {
    await answer(currentQuestion(), i < correctCount);
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
    expect(screen.getByText(/8 вопросов/)).toBeInTheDocument();
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
    const q = currentQuestion();
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

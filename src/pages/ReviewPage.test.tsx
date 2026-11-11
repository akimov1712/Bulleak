import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { quiz as l01 } from '@/content/modules/m09/l01/quiz';
import { quiz as l05 } from '@/content/modules/m09/l05/quiz';
import { answer, currentQuestion } from '@/test/quizHelpers';
import type { QuizAttempt } from '@/types/progress';

const DAY = 86_400_000;

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

/** A lesson test on risk two days ago: the «risk per trade» skill is due for review. */
function seedDueReview() {
  const attempt: QuizAttempt = {
    quizId: 'm09-l01',
    at: Date.now() - 2 * DAY,
    ratio: 1,
    passed: true,
    tags: {},
    answers: [1, 2, 3, 4, 5].map((i) => ({ q: `x${i}`, ok: true, tags: ['risk-per-trade'] })),
  };
  useProgress.setState({
    quizAttempts: [attempt],
    profile: { ...useProgress.getState().profile, name: 'Тестер' },
  });
}

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('spaced review', () => {
  it('home shows no review card before anything is due', async () => {
    useProgress.setState({ profile: { ...useProgress.getState().profile, name: 'Тестер' } });
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Тестер/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Сегодня повторить' })).not.toBeInTheDocument();
  });

  it('the review page says when there is nothing to review', async () => {
    renderAt('/review');
    expect(await screen.findByText('Повторять пока нечего')).toBeInTheDocument();
  });

  it('home lists the due skill; a passed review records it and clears the card', async () => {
    seedDueReview();
    const router = renderAt('/');
    const card = await screen.findByRole('region', { name: 'Сегодня повторить' });
    expect(card).toHaveTextContent('Риск на сделку и лимиты');

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Повторить' }));
    const questions = [...l01.questions, ...l05.questions];
    for (let i = 0; i < 5; i++) {
      await screen.findByRole('button', { name: 'Проверить' });
      await answer(currentQuestion(questions), true);
      await user.click(screen.getByRole('button', { name: 'Проверить' }));
      await user.click(screen.getByRole('button', { name: i === 4 ? 'Результат' : 'Дальше' }));
    }
    expect(await screen.findByRole('heading', { name: 'Идеально!' })).toBeInTheDocument();

    const review = useProgress.getState().quizAttempts.at(-1);
    expect(review?.quizId).toBe('review');
    expect(review?.answers).toHaveLength(5);
    expect(useProgress.getState().xp).toBeGreaterThanOrEqual(15);

    await router.navigate('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Тестер/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Сегодня повторить' })).not.toBeInTheDocument();
  }, 30_000);
});

import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { courseIndex } from '@/content/courseIndex';
import { exam } from '@/content/modules/m01/exam';
import { answer, currentQuestion } from '@/test/quizHelpers';
import type { LessonProgress } from '@/types/progress';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

const done: LessonProgress = {
  readAt: 1,
  quizBest: 1,
  quizAttempts: 1,
  completedAt: 1,
  timeSpentSec: 60,
  xpEarned: 85,
  improvements: 0,
};

function completeLessons(moduleIds: string[]) {
  const lessons = Object.fromEntries(
    moduleIds.flatMap((m) => courseIndex.getModule(m)?.lessons.map((l) => [l.id, done]) ?? []),
  );
  useProgress.setState({ lessons });
}

async function runExam(correct: boolean) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Начать экзамен' }));
  for (let i = 0; i < (exam.sample ?? 0); i++) {
    await answer(currentQuestion(exam.questions), correct);
    await user.click(
      screen.getByRole('button', {
        name: i === (exam.sample ?? 0) - 1 ? 'Завершить экзамен' : 'Ответить',
      }),
    );
  }
}

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('ExamPage', () => {
  it('is locked until every lesson of the module is completed', async () => {
    completeLessons(['m00']);
    renderAt('/exam/m01');
    expect(await screen.findByText('Экзамен пока закрыт')).toBeInTheDocument();
  });

  it('shows the intro with sample size and threshold', async () => {
    completeLessons(['m00', 'm01']);
    renderAt('/exam/m01');
    expect(await screen.findByText(/15 вопросов по всем урокам модуля/)).toBeInTheDocument();
    expect(screen.getByText(/Для сдачи нужно 80%/)).toBeInTheDocument();
  });

  it('a failed exam lists lessons to repeat and blocks a retake for 10 minutes', async () => {
    completeLessons(['m00', 'm01']);
    renderAt('/exam/m01');
    await runExam(false);
    expect(await screen.findByRole('heading', { name: 'Почти получилось' })).toBeInTheDocument();
    const weak = screen.getByRole('region', { name: 'Что повторить' });
    expect(within(weak).getAllByRole('link').length).toBeGreaterThan(0);
    expect(useProgress.getState().exams.m01?.passedAt).toBeUndefined();

    // Come back later: a fresh visit of the exam page.
    cleanup();
    renderAt('/exam/m01');
    expect(await screen.findByText(/Пересдача откроется через 10 минут/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Начать экзамен' })).not.toBeInTheDocument();
  }, 60_000);

  it('a passed exam records the result and opens the next module', async () => {
    completeLessons(['m00', 'm01']);
    renderAt('/exam/m01');
    await runExam(true);
    expect(await screen.findByRole('heading', { name: 'Идеально!' })).toBeInTheDocument();
    expect(useProgress.getState().exams.m01?.passedAt).toBeDefined();
    const next = courseIndex.getModule('m02');
    expect(screen.getByRole('link', { name: `К модулю «${next?.title}»` })).toHaveAttribute(
      'href',
      '/module/m02',
    );
  }, 60_000);
  it('final exam: locked until every module exam is passed, then shows both parts', async () => {
    renderAt('/exam/final');
    expect(await screen.findByText('Финальный экзамен пока закрыт')).toBeInTheDocument();
    cleanup();
    const exams = Object.fromEntries(
      courseIndex.modules
        .filter((m) => m.hasExam)
        .map((m) => [m.id, { best: 1, attempts: 1, passedAt: 1 }]),
    );
    useProgress.setState({ exams });
    renderAt('/exam/final');
    expect(await screen.findByRole('heading', { name: 'Финальный экзамен' })).toBeInTheDocument();
    expect(screen.getByText(/Теория: 40 вопросов по всем модулям/)).toBeInTheDocument();
    expect(screen.getByText(/Практика: 3 ситуации/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать экзамен' })).toBeInTheDocument();
  });
});

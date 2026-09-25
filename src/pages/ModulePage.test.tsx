import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import type { QuizResult } from '@/types/quiz';

const renderAt = (url: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />);

const pass = (ratio = 1): QuizResult => ({
  quizId: '',
  correct: 10,
  total: 10,
  ratio,
  passed: true,
  perQuestion: [],
});

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('ModulePage', () => {
  it('lists lessons with statuses: first open, the rest locked', async () => {
    renderAt('/module/m00');
    expect(await screen.findByRole('heading', { level: 1, name: 'Старт' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Уроки модуля' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/lesson/m00-l01',
    );
    expect(within(items[1] as HTMLElement).queryByRole('link')).toBeNull();
    expect(screen.getByText('0 из 3 уроков пройдено')).toBeInTheDocument();
    // module 0 has no exam
    expect(screen.queryByRole('region', { name: 'Экзамен модуля' })).toBeNull();
  });

  it('shows stars for completed lessons and progress', async () => {
    useProgress.getState().recordQuiz('m00-l01', pass(0.9));
    renderAt('/module/m00');
    expect(await screen.findByRole('img', { name: '2 из 3 звёзд' })).toBeInTheDocument();
    expect(screen.getByText('1 из 3 уроков пройдено')).toBeInTheDocument();
  });

  it('explains why a later module is locked and when the exam opens', async () => {
    renderAt('/module/m01');
    expect(
      await screen.findByText(/Модуль откроется после прохождения модуля 0/),
    ).toBeInTheDocument();
    expect(screen.getByText('Откроется, когда пройдёшь все уроки модуля.')).toBeInTheDocument();
  });

  it('offers the exam once every lesson of the module is completed', async () => {
    useSettings.getState().update({ freeMode: true });
    for (const id of ['m01-l01', 'm01-l02', 'm01-l03', 'm01-l04', 'm01-l05'] as const) {
      useProgress.getState().recordQuiz(id, pass());
    }
    renderAt('/module/m01');
    expect(await screen.findByRole('link', { name: 'Сдать экзамен' })).toHaveAttribute(
      'href',
      '/exam/m01',
    );
  });

  it('handles unknown modules', async () => {
    renderAt('/module/m42');
    expect(await screen.findByText('Модуль не найден')).toBeInTheDocument();
  });
});

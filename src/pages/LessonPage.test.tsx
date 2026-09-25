import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';

function renderAt(url: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />);
}

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('LessonPage', () => {
  it('renders an available lesson with its content, meta and quiz call-to-action', async () => {
    renderAt('/lesson/m00-l01');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Добро пожаловать: что такое трейдинг и чем он не является',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Что узнаешь' })).toBeInTheDocument();
    expect(screen.getByText('Новый урок')).toBeInTheDocument();
    expect(screen.getByText('~8 мин')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Пройти тест' })).toHaveAttribute(
      'href',
      '/lesson/m00-l01/quiz',
    );
    expect(screen.getByText('Следующий урок откроется после сдачи теста')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Модуль 0. Старт' })).toHaveAttribute(
      'href',
      '/module/m00',
    );
  });

  it('shows the locked screen with a link to the current lesson', async () => {
    renderAt('/lesson/m00-l02');
    expect(await screen.findByText('Урок пока закрыт')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /К уроку «Добро пожаловать/ })).toHaveAttribute(
      'href',
      '/lesson/m00-l01',
    );
  });

  it('opens the next lesson link once the quiz is passed', async () => {
    useProgress.getState().recordQuiz('m00-l01', {
      quizId: 'm00-l01',
      correct: 10,
      total: 10,
      ratio: 1,
      passed: true,
      perQuestion: [],
    });
    renderAt('/lesson/m00-l01');
    expect(await screen.findByText('Пройден')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Пересдать' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Следующий урок/ })).toHaveAttribute(
      'href',
      '/lesson/m00-l02',
    );
  });

  it('explains that content is not written yet (free mode, lesson without MDX)', async () => {
    useSettings.getState().update({ freeMode: true });
    renderAt('/lesson/m05-l03');
    expect(await screen.findByRole('heading', { level: 1, name: 'RSI' })).toBeInTheDocument();
    expect(await screen.findByText('Этот урок ещё пишется')).toBeInTheDocument();
  });

  it('handles unknown lesson ids', async () => {
    renderAt('/lesson/m99-l99');
    expect(await screen.findByText('Урок не найден')).toBeInTheDocument();
  });
});

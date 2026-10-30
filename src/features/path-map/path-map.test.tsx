import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';

// The app shell (RootLayout) already renders the Toaster.
const renderMap = () =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/path'] })} />);

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
  useUi.setState({ toasts: [], rewardsQueue: [] });
});

describe('PathPage', () => {
  it('shows all 13 modules; only the first lesson is open for a new learner', async () => {
    renderMap();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Карта курса' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Модуль \d+/ })).toHaveLength(13);
    expect(screen.getByRole('link', { name: /^Урок 0\.1: Добро пожаловать/ })).toHaveAttribute(
      'href',
      '/lesson/m00-l01',
    );
    expect(screen.getByRole('button', { name: /^Урок 0\.2: .*\(закрыт\)$/ })).toBeInTheDocument();
    expect(screen.getByText('Следующий урок')).toBeInTheDocument();
    // Only the module in progress is expanded; closed modules show their header.
    expect(screen.getByRole('button', { name: 'Уроки модуля 0' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Уроки модуля 5' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('expands a collapsed module on demand', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(await screen.findByRole('button', { name: 'Уроки модуля 1' }));
    expect(screen.getByRole('button', { name: /^Урок 1\.1: .*\(закрыт\)$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Экзамен модуля 1 (закрыт)' })).toBeInTheDocument();
  });

  it('continues from the summary card', async () => {
    renderMap();
    expect(await screen.findByRole('link', { name: 'Продолжить · урок 0.1' })).toHaveAttribute(
      'href',
      '/lesson/m00-l01',
    );
  });

  it('explains locked nodes with a toast', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(await screen.findByRole('button', { name: /^Урок 0\.2: .*\(закрыт\)$/ }));
    expect(screen.getByText('Урок пока закрыт')).toBeInTheDocument();
  });

  it('shows completed lessons with stars and moves the current marker', async () => {
    useProgress.getState().recordQuiz('m00-l01', {
      quizId: 'm00-l01',
      correct: 9,
      total: 10,
      ratio: 0.9,
      passed: true,
      perQuestion: [],
    });
    renderMap();
    expect(await screen.findByRole('img', { name: '2 из 3 звёзд' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Урок 0\.2: Реалистичные/ })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('1/62')).toBeInTheDocument();
  });

  it('keeps the final exam locked until all module exams are passed', async () => {
    renderMap();
    expect(await screen.findByText('Откроется после экзаменов всех модулей.')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { useUi } from '@/store/uiStore';

const renderHome = () =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />);

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
  useUi.setState({ toasts: [], rewardsQueue: [] });
});

describe('HomePage', () => {
  it('onboards a new learner: name and daily goal', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(
      await screen.findByRole('heading', { name: 'Добро пожаловать в курс!' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Как тебя зовут?'), 'Артём');
    await user.click(screen.getByRole('button', { name: /Серьёзно · 100 XP/ }));
    await user.click(screen.getByRole('button', { name: 'Поехали!' }));
    expect(useProgress.getState().profile.name).toBe('Артём');
    expect(useSettings.getState().dailyGoalXp).toBe(100);
    expect(await screen.findByRole('heading', { level: 1, name: /, Артём!$/ })).toBeInTheDocument();
  });

  it('skipping the name uses a friendly default', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(await screen.findByRole('button', { name: 'Поехали!' }));
    expect(useProgress.getState().profile.name).toBe('Трейдер');
  });

  it('dashboard points to the first lesson and shows today, level and achievements', async () => {
    useProgress.getState().setName('Ника');
    renderHome();
    const cont = await screen.findByRole('region', { name: 'Продолжить обучение' });
    expect(cont).toHaveTextContent('Добро пожаловать: что такое трейдинг');
    expect(screen.getByRole('link', { name: 'Начать первый урок' })).toHaveAttribute(
      'href',
      '/lesson/m00-l01',
    );
    expect(screen.getByRole('heading', { name: 'Цель дня' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Уровень 1 · Новичок' })).toBeInTheDocument();
    expect(screen.getByText(/первое достижение ждёт тебя/)).toBeInTheDocument();
  });

  it('updates after progress: continue card, streak and recent achievements', async () => {
    useProgress.getState().setName('Ника');
    act(() => {
      useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    });
    renderHome();
    expect(await screen.findByRole('link', { name: 'Пройти тест' })).toHaveAttribute(
      'href',
      '/lesson/m00-l01/quiz',
    );
    expect(screen.getByRole('heading', { name: /1 день подряд/ })).toBeInTheDocument();
    expect(screen.getByText('Первый шаг')).toBeInTheDocument();
  });
});

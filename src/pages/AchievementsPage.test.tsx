import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';

const renderPage = () =>
  render(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/achievements'] })} />,
  );

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useUi.setState({ toasts: [], rewardsQueue: [] });
});

describe('AchievementsPage', () => {
  it('lists all 40, hides secret ones and shows progress', async () => {
    renderPage();
    expect(await screen.findByText('Получено 0 из 40')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Список достижений' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(40);
    expect(screen.getAllByText('???')).toHaveLength(4);
    expect(screen.queryByText('Ранняя пташка')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Прогресс: Разогрев' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('shows unlocked achievements first with the date', async () => {
    act(() => {
      useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    });
    renderPage();
    expect(await screen.findByText('Получено 1 из 40')).toBeInTheDocument();
    const first = within(screen.getByRole('list', { name: 'Список достижений' })).getAllByRole(
      'listitem',
    )[0];
    expect(first).toHaveTextContent('Первый шаг');
    expect(first).toHaveTextContent(/\d{4}/);
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Практика' }));
    const items = within(screen.getByRole('list', { name: 'Список достижений' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Практика' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { AMPLITUDE, COLUMN_WIDTH, nodeOffset, nodePoints, pathThrough, ROW_HEIGHT } from './layout';

describe('path layout', () => {
  it('zigzags within the column and keeps rows evenly spaced', () => {
    const pts = nodePoints(8);
    for (const p of pts) {
      expect(Math.abs(p.x - COLUMN_WIDTH / 2)).toBeLessThanOrEqual(AMPLITUDE);
    }
    expect((pts[1]?.y ?? 0) - (pts[0]?.y ?? 0)).toBe(ROW_HEIGHT);
    expect(nodeOffset(0)).toBe(0);
    expect(new Set(pts.map((p) => p.x)).size).toBeGreaterThan(2);
  });

  it('draws one curve segment per gap', () => {
    expect(pathThrough([])).toBe('');
    expect(pathThrough(nodePoints(1))).toMatch(/^M [\d.]+ [\d.]+$/);
    expect(pathThrough(nodePoints(4)).match(/ C /g)).toHaveLength(3);
  });
});

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
    expect(
      screen.getByRole('button', { name: /^Урок 0\.1: Добро пожаловать/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Урок 0\.2: .*\(закрыт\)$/ })).toBeInTheDocument();
    expect(screen.getByText('Начнём?')).toBeInTheDocument();
  });

  it('opens a popover with the lesson action for an available node', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(await screen.findByRole('button', { name: /^Урок 0\.1:/ }));
    expect(await screen.findByRole('link', { name: 'Начать урок' })).toHaveAttribute(
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
    expect(screen.getByRole('button', { name: /^Урок 0\.2: Реалистичные/ })).toBeInTheDocument();
    expect(screen.getByText('1/62')).toBeInTheDocument();
  });

  it('keeps the final exam locked until all module exams are passed', async () => {
    renderMap();
    expect(await screen.findByText('Откроется после экзаменов всех модулей.')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RewardsPresenter } from './RewardsPresenter';
import { Toaster } from '@/components/ui/Toaster';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { fireConfetti, playSound } from './effects';

vi.mock('./effects', () => ({ fireConfetti: vi.fn(), playSound: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS, sound: true });
  useUi.setState({ toasts: [], rewardsQueue: [] });
  vi.mocked(fireConfetti).mockClear();
  vi.mocked(playSound).mockClear();
});

describe('RewardsPresenter', () => {
  it('shows achievement toasts, the daily goal and a level-up modal', async () => {
    render(
      <>
        <Toaster />
        <RewardsPresenter />
      </>,
    );
    act(() => {
      useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
      useProgress.getState().dispatch({
        type: 'quizCompleted',
        lessonId: 'm00-l01',
        result: {
          quizId: 'm00-l01',
          correct: 8,
          total: 8,
          ratio: 1,
          passed: true,
          perQuestion: [],
        },
        durationSec: 400,
      });
    });
    expect(screen.getByText('Достижение: Первый шаг')).toBeInTheDocument();
    expect(screen.getByText('Достижение: Отличник')).toBeInTheDocument();
    expect(screen.getByText('Цель дня выполнена!')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Новый уровень!' });
    expect(dialog).toHaveTextContent(/Звание: Новичок|Новое звание/);
    expect(fireConfetti).toHaveBeenCalledWith('big', true);
    expect(playSound).toHaveBeenCalledWith('levelUp', true);
    expect(useUi.getState().rewardsQueue).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('merges several level-ups from one batch into one modal', () => {
    const reward = (from: number, to: number) => ({
      xp: 10,
      reasons: [],
      newAchievements: [],
      levelUp: { from, to },
      dailyGoalMet: false,
      streak: { before: 0, after: 0 },
    });
    useUi.setState({ rewardsQueue: [reward(2, 3), reward(3, 4)] });
    render(<RewardsPresenter />);
    const dialog = screen.getByRole('dialog', { name: 'Новый уровень!' });
    expect(dialog).toHaveTextContent('4');
    expect(dialog).toHaveTextContent('Новое звание: Наблюдатель');
  });

  it('drains rewards queued before it mounted', () => {
    act(() => {
      useProgress.getState().dispatch({ type: 'backupMade' });
    });
    render(
      <>
        <Toaster />
        <RewardsPresenter />
      </>,
    );
    expect(screen.getByText('Достижение: Предусмотрительный')).toBeInTheDocument();
  });
});

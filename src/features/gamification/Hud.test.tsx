import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hud } from './Hud';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { useUi } from '@/store/uiStore';

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
  useUi.setState({ rewardsQueue: [], lastXpGain: null });
});

describe('Hud', () => {
  it('starts at zero streak, zero XP, level 1', () => {
    render(<Hud />);
    expect(screen.getByRole('button', { name: 'Серия: 0 дней подряд' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Опыт: 0 XP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Уровень 1, Новичок' })).toBeInTheDocument();
  });

  it('updates live and shows the "+XP" flash after earning XP', () => {
    render(<Hud />);
    act(() => {
      useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    });
    expect(screen.getByRole('button', { name: 'Опыт: 20 XP' })).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Серия: 1 день подряд' })).toBeInTheDocument();
  });

  it('does not flash when XP changes from outside (other tab, import)', () => {
    render(<Hud />);
    act(() => {
      useProgress.setState({ xp: 500 });
    });
    expect(screen.getByRole('button', { name: 'Опыт: 500 XP' })).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('explains the daily goal and streak in popovers', async () => {
    const user = userEvent.setup();
    render(<Hud />);
    await user.click(screen.getByRole('button', { name: /Опыт/ }));
    expect(await screen.findByText('Ещё 50 XP до цели')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Серия/ }));
    expect(await screen.findByText('Начни серию сегодня')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Активность на этой неделе' }).children).toHaveLength(
      7,
    );
  });
});

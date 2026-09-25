import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_SETTINGS, useSettings } from './settingsStore';
import { useResolvedTheme } from '@/hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('settingsStore', () => {
  it('starts with defaults', () => {
    const s = useSettings.getState();
    expect(s.theme).toBe('system');
    expect(s.dailyGoalXp).toBe(50);
  });

  it('persists updates to localStorage', () => {
    useSettings.getState().update({ theme: 'dark', dailyGoalXp: 100 });
    const saved = JSON.parse(localStorage.getItem('tc-settings') ?? '{}');
    expect(saved.state).toMatchObject({ theme: 'dark', dailyGoalXp: 100 });
    expect(saved.state.update).toBeUndefined();
  });

  it('ignores corrupted persisted values on rehydrate', async () => {
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { theme: 'purple', dailyGoalXp: 7, sound: true }, version: 1 }),
    );
    await useSettings.persist.rehydrate();
    const s = useSettings.getState();
    expect(s.theme).toBe('system');
    expect(s.dailyGoalXp).toBe(50);
    expect(s.sound).toBe(true);
  });

  it('reset restores defaults', () => {
    useSettings.getState().update({ freeMode: true });
    useSettings.getState().reset();
    expect(useSettings.getState().freeMode).toBe(false);
  });
});

describe('useResolvedTheme', () => {
  it('returns the explicit theme', () => {
    useSettings.getState().update({ theme: 'dark' });
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('dark');
  });

  it('resolves system to light when matchMedia is unavailable', () => {
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('light');
  });
});

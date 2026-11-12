import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useApplyMotion } from '@/hooks/useReducedMotion';
import { DEFAULT_SETTINGS, useSettings } from './settingsStore';
import { useResolvedTheme } from '@/hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState(DEFAULT_SETTINGS);
});

describe('settingsStore', () => {
  it('starts with defaults', () => {
    const s = useSettings.getState();
    expect(s.theme).toBe('dark');
    expect(s.dailyGoalXp).toBe(50);
    expect(s.sound).toBe(true);
    expect(s.reducedMotion).toBe('on');
  });

  it('turns sound and animations on for v1 saves, keeping other choices', async () => {
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({
        state: { theme: 'light', sound: false, reducedMotion: 'system', dailyGoalXp: 100 },
        version: 1,
      }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({
      theme: 'light',
      dailyGoalXp: 100,
      sound: true,
      reducedMotion: 'on',
    });
  });

  it('keeps a v2 choice to turn sound off', async () => {
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { sound: false, reducedMotion: 'off' }, version: 2 }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({ sound: false, reducedMotion: 'off' });
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
    expect(s.theme).toBe('dark');
    expect(s.dailyGoalXp).toBe(50);
    expect(s.sound).toBe(true);
  });

  it('reset restores defaults', () => {
    useSettings.getState().update({ freeMode: true });
    useSettings.getState().reset();
    expect(useSettings.getState().freeMode).toBe(false);
  });
});

describe('useApplyMotion', () => {
  it('writes data-motion from the user setting', () => {
    const { rerender } = renderHook(() => useApplyMotion());
    expect(document.documentElement.dataset.motion).toBe('full');
    act(() => useSettings.getState().update({ reducedMotion: 'off' }));
    rerender();
    expect(document.documentElement.dataset.motion).toBe('reduce');
    act(() => useSettings.getState().update({ reducedMotion: 'on' }));
    rerender();
    expect(document.documentElement.dataset.motion).toBe('full');
  });
});

describe('useResolvedTheme', () => {
  it('returns the explicit theme', () => {
    useSettings.getState().update({ theme: 'dark' });
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('dark');
  });

  it('resolves system to light when matchMedia is unavailable', () => {
    useSettings.getState().update({ theme: 'system' });
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('light');
  });
});

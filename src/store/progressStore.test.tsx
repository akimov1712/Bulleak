import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PROGRESS_STORAGE_KEY, subscribeToOtherTabs, useProgress } from './progressStore';
import { createInitialProgress } from '@/lib/progress/initial';
import { StorageBanner } from '@/app/layout/StorageBanner';
import { __resetSafeStorage, safeStorage } from './safeStorage';
import { vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  __resetSafeStorage();
  useProgress.getState().reset();
});

const pass = {
  quizId: 'm00-l01',
  correct: 9,
  total: 10,
  ratio: 0.9,
  passed: true,
  perQuestion: [],
};

describe('progressStore', () => {
  it('persists actions to localStorage without functions', () => {
    useProgress.getState().markRead('m00-l01');
    useProgress.getState().recordQuiz('m00-l01', pass, 60);
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}');
    expect(saved.version).toBe(1);
    expect(saved.state.lessons['m00-l01'].completedAt).toBeTypeOf('number');
    expect(saved.state.markRead).toBeUndefined();
  });

  it('normalizes corrupted data on rehydrate', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ state: { xp: 'lots', lessons: 'x' }, version: 1 }),
    );
    await useProgress.persist.rehydrate();
    expect(useProgress.getState().xp).toBe(0);
    expect(useProgress.getState().lessons).toEqual({});
    expect(typeof useProgress.getState().markRead).toBe('function');
  });

  it('replace() imports and normalizes external data', () => {
    const external = {
      ...createInitialProgress(1),
      xp: 120,
      profile: { name: 'Артём', startedAt: 1 },
    };
    useProgress.getState().replace(external);
    expect(useProgress.getState().xp).toBe(120);
    expect(useProgress.getState().profile.name).toBe('Артём');
  });

  it('setName trims', () => {
    useProgress.getState().setName('  Ника  ');
    expect(useProgress.getState().profile.name).toBe('Ника');
  });

  it('rehydrates when another tab writes progress', async () => {
    const off = subscribeToOtherTabs();
    const other = { state: { ...createInitialProgress(1), xp: 777 }, version: 1 };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(other));
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_STORAGE_KEY }));
      await Promise.resolve();
    });
    expect(useProgress.getState().xp).toBe(777);
    off();
  });
});

describe('selectProgressData / cross-tab reset', () => {
  it('persists exactly the data fields of ProgressState', () => {
    useProgress.getState().markRead('m00-l01');
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}');
    expect(Object.keys(saved.state).sort()).toEqual(Object.keys(createInitialProgress(0)).sort());
  });

  it('resets when another tab clears storage (storage event with key null)', async () => {
    const off = subscribeToOtherTabs();
    useProgress.getState().markRead('m00-l01');
    localStorage.clear();
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      await Promise.resolve();
    });
    expect(useProgress.getState().lessons).toEqual({});
    off();
  });
});

describe('StorageBanner', () => {
  it('appears when storage writes fail', () => {
    render(<StorageBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    act(() => safeStorage.setItem('x', 'y'));
    expect(screen.getByRole('alert')).toHaveTextContent('Прогресс не сохраняется');
    vi.restoreAllMocks();
  });
});

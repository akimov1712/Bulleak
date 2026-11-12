import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '@/types/settings';
import { safeStorage } from './safeStorage';
import { sanitizeSettings } from '@/lib/settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  sound: true,
  dailyGoalXp: 50,
  freeMode: false,
  reducedMotion: 'on',
  hints: 'all',
  toursSeen: [],
};

interface SettingsActions {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export type SettingsStore = Settings & SettingsActions;

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'tc-settings',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // v2 turned sound and animations on by default; v1 saves held the old defaults.
      migrate: (persisted, version) =>
        version < 2 && persisted && typeof persisted === 'object'
          ? { ...persisted, sound: true, reducedMotion: 'on' }
          : persisted,
      partialize: ({ theme, sound, dailyGoalXp, freeMode, reducedMotion, hints, toursSeen }) => ({
        theme,
        sound,
        dailyGoalXp,
        freeMode,
        reducedMotion,
        hints,
        toursSeen,
      }),
      // Unknown or corrupted fields fall back to defaults.
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeSettings(persisted),
      }),
    },
  ),
);

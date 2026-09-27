import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '@/types/settings';
import { safeStorage } from './safeStorage';
import { sanitizeSettings } from '@/lib/settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: false,
  dailyGoalXp: 50,
  freeMode: false,
  reducedMotion: 'system',
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
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ theme, sound, dailyGoalXp, freeMode, reducedMotion }) => ({
        theme,
        sound,
        dailyGoalXp,
        freeMode,
        reducedMotion,
      }),
      // Unknown or corrupted fields fall back to defaults.
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeSettings(persisted),
      }),
    },
  ),
);

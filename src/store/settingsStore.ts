import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '@/types/settings';
import { safeStorage } from './safeStorage';

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

function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (typeof raw !== 'object' || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'system') out.theme = r.theme;
  if (typeof r.sound === 'boolean') out.sound = r.sound;
  if (
    r.dailyGoalXp === 20 ||
    r.dailyGoalXp === 50 ||
    r.dailyGoalXp === 100 ||
    r.dailyGoalXp === 150
  )
    out.dailyGoalXp = r.dailyGoalXp;
  if (typeof r.freeMode === 'boolean') out.freeMode = r.freeMode;
  if (r.reducedMotion === 'system' || r.reducedMotion === 'on' || r.reducedMotion === 'off')
    out.reducedMotion = r.reducedMotion;
  return out;
}

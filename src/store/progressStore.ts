import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LessonId } from '@/types/course';
import type { QuizResult } from '@/types/quiz';
import type { ExamKey, ProgressState } from '@/types/progress';
import { createInitialProgress, PROGRESS_VERSION } from '@/lib/progress/initial';
import { migrateProgress } from '@/lib/progress/migrate';
import { applyEvent } from '@/lib/progress/applyEvent';
import type { ProgressEvent, Rewards } from '@/types/events';
import { courseIndex } from '@/content/courseIndex';
import { achievements } from '@/content/achievements';
import { useSettings } from './settingsStore';
import { useUi } from './uiStore';
import { safeStorage } from './safeStorage';

export const PROGRESS_STORAGE_KEY = 'tc-progress';

interface ProgressActions {
  /** Apply any progress event (XP, streak, achievements); returns the rewards. */
  dispatch: (event: ProgressEvent) => Rewards;
  markRead: (id: LessonId) => void;
  addTime: (id: LessonId, seconds: number) => void;
  recordQuiz: (id: LessonId, result: QuizResult, durationSec?: number) => void;
  recordExam: (key: ExamKey, result: QuizResult, durationSec?: number) => void;
  setName: (name: string) => void;
  /** Replace everything (import) — input is normalized first. */
  replace: (next: unknown) => void;
  reset: () => void;
}

export type ProgressStore = ProgressState & ProgressActions;

/**
 * Data fields of the store. Derived from the initial state, so a new ProgressState field
 * (which must be added to createInitialProgress to type-check) is persisted automatically.
 */
const PROGRESS_KEYS = Object.keys(createInitialProgress(0)) as (keyof ProgressState)[];

/** Strip actions so only data is persisted / passed to pure functions. */
export function selectProgressData(s: ProgressStore): ProgressState {
  const data: Partial<Record<keyof ProgressState, unknown>> = {};
  for (const key of PROGRESS_KEYS) data[key] = s[key];
  return data as ProgressState;
}

/** All progress changes go through dispatch → lib/progress/applyEvent (pure); the store wires time and settings. */
export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => {
      const apply = (fn: (state: ProgressState, now: number) => ProgressState) =>
        set(fn(selectProgressData(get()), Date.now()));
      const dispatch = (event: ProgressEvent): Rewards => {
        const { state, rewards } = applyEvent(selectProgressData(get()), event, {
          now: Date.now(),
          dailyGoalXp: useSettings.getState().dailyGoalXp,
          course: courseIndex,
          achievements,
        });
        set(state);
        useUi.getState().pushRewards(rewards);
        return rewards;
      };
      return {
        ...createInitialProgress(Date.now()),
        dispatch,
        markRead: (lessonId) => void dispatch({ type: 'lessonRead', lessonId }),
        addTime: (lessonId, seconds) => void dispatch({ type: 'lessonTime', lessonId, seconds }),
        recordQuiz: (lessonId, result, durationSec) =>
          void dispatch({ type: 'quizCompleted', lessonId, result, durationSec }),
        recordExam: (key, result, durationSec) =>
          void dispatch({ type: 'examCompleted', key, result, durationSec }),
        setName: (name) => apply((s) => ({ ...s, profile: { ...s.profile, name: name.trim() } })),
        replace: (next) => set(migrateProgress(next, PROGRESS_VERSION, Date.now())),
        reset: () => set(createInitialProgress(Date.now())),
      };
    },
    {
      name: PROGRESS_STORAGE_KEY,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: selectProgressData,
      migrate: (persisted, version) => migrateProgress(persisted, version, Date.now()),
      // Same-version data may still be partial/corrupted: always normalize on load.
      merge: (persisted, current) => ({
        ...current,
        ...migrateProgress(persisted, PROGRESS_VERSION, Date.now()),
      }),
    },
  ),
);

/** Keep several open tabs in sync: reload state when another tab writes it. */
export function subscribeToOtherTabs(): () => void {
  function onStorage(event: StorageEvent) {
    // key === null means localStorage.clear() in another tab (e.g. a full reset).
    if (event.key === PROGRESS_STORAGE_KEY || event.key === null) {
      void useProgress.persist.rehydrate();
    }
  }
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

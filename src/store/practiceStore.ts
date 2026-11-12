import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DRILL_KINDS,
  EMPTY_DRILL_STATS,
  recordDrill,
  type DrillKind,
  type DrillStats,
} from '@/lib/practice/drills';
import {
  CONFIDENCE_LEVELS,
  FORECAST_OUTCOMES,
  type ForecastAttempt,
} from '@/lib/practice/forecast';
import { safeStorage } from './safeStorage';

/** Forecasts kept for calibration: enough for a stable picture, small in storage. */
export const FORECASTS_KEPT = 300;

interface PracticeState {
  drills: Record<DrillKind, DrillStats>;
  forecasts: ForecastAttempt[];
}

interface PracticeActions {
  recordDrill: (kind: DrillKind, correct: boolean) => void;
  recordForecast: (attempt: ForecastAttempt) => void;
  reset: () => void;
}

const emptyDrills = () =>
  Object.fromEntries(DRILL_KINDS.map((k) => [k, EMPTY_DRILL_STATS])) as Record<
    DrillKind,
    DrillStats
  >;

const INITIAL: PracticeState = { drills: emptyDrills(), forecasts: [] };

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Keeps only valid fields of a saved practice state. */
export function sanitizePractice(raw: unknown): PracticeState {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const drills = emptyDrills();
  const savedDrills = typeof r.drills === 'object' && r.drills !== null ? r.drills : {};
  for (const kind of DRILL_KINDS) {
    const s = (savedDrills as Record<string, unknown>)[kind] as Partial<DrillStats> | undefined;
    if (s && isCount(s.done) && isCount(s.correct) && isCount(s.streak) && isCount(s.best)) {
      drills[kind] = { done: s.done, correct: s.correct, streak: s.streak, best: s.best };
    }
  }
  const forecasts = Array.isArray(r.forecasts)
    ? r.forecasts.filter(
        (a): a is ForecastAttempt =>
          typeof a === 'object' &&
          a !== null &&
          FORECAST_OUTCOMES.includes((a as ForecastAttempt).pick) &&
          FORECAST_OUTCOMES.includes((a as ForecastAttempt).outcome) &&
          (CONFIDENCE_LEVELS as readonly number[]).includes((a as ForecastAttempt).confidence),
      )
    : [];
  return { drills, forecasts: forecasts.slice(-FORECASTS_KEPT) };
}

export const usePractice = create<PracticeState & PracticeActions>()(
  persist(
    (set) => ({
      ...INITIAL,
      recordDrill: (kind, correct) =>
        set((s) => ({ drills: { ...s.drills, [kind]: recordDrill(s.drills[kind], correct) } })),
      recordForecast: (attempt) =>
        set((s) => ({ forecasts: [...s.forecasts, attempt].slice(-FORECASTS_KEPT) })),
      reset: () => set({ drills: emptyDrills(), forecasts: [] }),
    }),
    {
      name: 'tc-practice',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ drills, forecasts }) => ({ drills, forecasts }),
      merge: (persisted, current) => ({ ...current, ...sanitizePractice(persisted) }),
    },
  ),
);

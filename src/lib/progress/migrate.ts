import type { ProgressState } from '@/types/progress';
import { isDateKey } from '@/lib/date';
import {
  createInitialProgress,
  emptyCounters,
  emptyLessonProgress,
  emptyStreak,
  MAX_QUIZ_ATTEMPTS,
  PROGRESS_VERSION,
} from './initial';

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const optNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function record<T>(v: unknown, map: (value: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObject(v)) return out;
  for (const [key, value] of Object.entries(v)) {
    const mapped = map(value);
    if (mapped !== null) out[key] = mapped;
  }
  return out;
}

/**
 * Bring any persisted progress (older version, partial, corrupted) to the current shape.
 * Unknown fields are dropped, missing ones get defaults, nothing throws.
 * Add a `if (version < N)` step here whenever ProgressState changes (and bump PROGRESS_VERSION).
 */
export function migrateProgress(persisted: unknown, _version: number, now: number): ProgressState {
  const base = createInitialProgress(now);
  if (!isObject(persisted)) return base;
  const raw = persisted;

  // v0 → v1: no structural changes yet (v0 = pre-release data); normalization below covers it.
  // v1 → v2: counters.simCorrectSkips → simSkippedScenarios (see counters below).

  const lessons = record(raw.lessons, (v) => {
    if (!isObject(v)) return null;
    const empty = emptyLessonProgress();
    return {
      readAt: optNum(v.readAt),
      quizBest: Math.min(1, Math.max(0, num(v.quizBest))),
      quizAttempts: num(v.quizAttempts),
      completedAt: optNum(v.completedAt),
      timeSpentSec: num(v.timeSpentSec),
      xpEarned: num(v.xpEarned),
      improvements: num(v.improvements, empty.improvements),
    };
  });

  const exams = record(raw.exams, (v) =>
    isObject(v)
      ? {
          best: Math.min(1, Math.max(0, num(v.best))),
          attempts: num(v.attempts),
          passedAt: optNum(v.passedAt),
          lastAttemptAt: optNum(v.lastAttemptAt),
        }
      : null,
  );

  const activityAll = record(raw.activity, (v) =>
    isObject(v)
      ? {
          xp: num(v.xp),
          minutes: num(v.minutes),
          lessonsCompleted: num(v.lessonsCompleted),
          quizzes: num(v.quizzes),
          simTrades: num(v.simTrades),
          simXp: num(v.simXp),
          journalXp: num(v.journalXp),
          goalMet: v.goalMet === true,
        }
      : null,
  );
  const activity = Object.fromEntries(
    Object.entries(activityAll).filter(([key]) => isDateKey(key)),
  );

  const streakRaw = isObject(raw.streak) ? raw.streak : {};
  const lastActive = streakRaw.lastActiveDay;
  const streak = {
    ...emptyStreak(),
    current: num(streakRaw.current),
    longest: num(streakRaw.longest),
    freezes: num(streakRaw.freezes),
    lastActiveDay: typeof lastActive === 'string' && isDateKey(lastActive) ? lastActive : null,
  };

  const counterRaw = isObject(raw.counters) ? raw.counters : {};
  const counters = {
    ...emptyCounters(),
    perfectQuizzes: num(counterRaw.perfectQuizzes),
    simTrades: num(counterRaw.simTrades),
    simWins: num(counterRaw.simWins),
    journalEntries: num(counterRaw.journalEntries),
    calculatorsUsed: strArray(counterRaw.calculatorsUsed),
    glossaryViewed: strArray(counterRaw.glossaryViewed),
    dailyGoalsMet: num(counterRaw.dailyGoalsMet),
    // v1 → v2: a plain counter of correct skips (repeats included) became the list of distinct
    // scenarios; old counts can't be mapped to scenarios, so they start over.
    simSkippedScenarios: strArray(counterRaw.simSkippedScenarios),
    backtestTrades: num(counterRaw.backtestTrades),
    forwardTrades: num(counterRaw.forwardTrades),
    planStreak: num(counterRaw.planStreak),
    planWritten: counterRaw.planWritten === true,
  };

  // Every field is normalized: statistics later sum ratios and iterate tag pairs.
  const attempts: ProgressState['quizAttempts'] = [];
  for (const a of Array.isArray(raw.quizAttempts) ? raw.quizAttempts : []) {
    if (!isObject(a) || typeof a.quizId !== 'string' || optNum(a.at) === undefined) continue;
    const tags = record(a.tags, (pair) =>
      Array.isArray(pair) && pair.length === 2 && pair.every((n) => optNum(n) !== undefined)
        ? ([num(pair[0]), num(pair[1])] as [number, number])
        : null,
    );
    const ratio = Math.min(1, Math.max(0, num(a.ratio)));
    attempts.push({
      quizId: a.quizId,
      at: num(a.at),
      ratio,
      passed: typeof a.passed === 'boolean' ? a.passed : false,
      tags,
      durationSec: optNum(a.durationSec),
    });
  }

  const profileRaw = isObject(raw.profile) ? raw.profile : {};

  return {
    version: PROGRESS_VERSION,
    lessons: lessons as ProgressState['lessons'],
    exams: exams as ProgressState['exams'],
    xp: Math.max(0, num(raw.xp)),
    activity: activity as ProgressState['activity'],
    streak,
    achievements: record(raw.achievements, (v) => optNum(v) ?? null),
    quizAttempts: attempts.slice(-MAX_QUIZ_ATTEMPTS),
    counters,
    profile: {
      name: typeof profileRaw.name === 'string' ? profileRaw.name : '',
      startedAt: num(profileRaw.startedAt, now),
      lastBackupAt: optNum(profileRaw.lastBackupAt),
    },
  };
}

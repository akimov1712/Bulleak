import type { Counters, LessonProgress, ProgressState, Streak } from '@/types/progress';

export const PROGRESS_VERSION = 1;
export const MAX_QUIZ_ATTEMPTS = 500;

export function emptyCounters(): Counters {
  return {
    perfectQuizzes: 0,
    simTrades: 0,
    simWins: 0,
    journalEntries: 0,
    calculatorsUsed: [],
    glossaryViewed: [],
    dailyGoalsMet: 0,
  };
}

export function emptyStreak(): Streak {
  return { current: 0, longest: 0, lastActiveDay: null, freezes: 0 };
}

export function emptyLessonProgress(): LessonProgress {
  return { quizBest: 0, quizAttempts: 0, timeSpentSec: 0, xpEarned: 0, improvements: 0 };
}

export function createInitialProgress(now: number): ProgressState {
  return {
    version: PROGRESS_VERSION,
    lessons: {},
    exams: {},
    xp: 0,
    activity: {},
    streak: emptyStreak(),
    achievements: {},
    quizAttempts: [],
    counters: emptyCounters(),
    profile: { name: '', startedAt: now },
  };
}

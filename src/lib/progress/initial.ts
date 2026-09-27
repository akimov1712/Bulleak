import type {
  Counters,
  DayActivity,
  LessonProgress,
  ProgressState,
  Streak,
} from '@/types/progress';

export const PROGRESS_VERSION = 3;
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
    simSkippedScenarios: [],
    backtestTrades: 0,
    forwardTrades: 0,
    planStreak: 0,
    planWritten: false,
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
    tradingPlan: null,
    strategy: null,
  };
}

export function emptyDay(): DayActivity {
  return {
    xp: 0,
    minutes: 0,
    lessonsCompleted: 0,
    quizzes: 0,
    simTrades: 0,
    simXp: 0,
    journalXp: 0,
    goalMet: false,
  };
}

/** Learning progress persisted in localStorage (key "tc-progress"). See data-model.md. */
import type { DateKey } from '@/lib/date';
import type { LessonId, ModuleId } from './course';

export type ExamKey = ModuleId | 'final';

export interface LessonProgress {
  /** When the lesson was read to the end (first time). */
  readAt?: number;
  /** Best quiz ratio 0..1 (0 when never attempted). */
  quizBest: number;
  quizAttempts: number;
  /** First time the quiz was passed. */
  completedAt?: number;
  timeSpentSec: number;
  xpEarned: number;
  /** How many times a retake improved the best score (XP is capped). */
  improvements: number;
}

export interface ExamProgress {
  best: number;
  attempts: number;
  passedAt?: number;
  lastAttemptAt?: number;
}

export interface DayActivity {
  xp: number;
  minutes: number;
  lessonsCompleted: number;
  quizzes: number;
  simTrades: number;
  /** XP from the simulator today (capped per day). */
  simXp: number;
  /** XP from journal entries today (capped per day). */
  journalXp: number;
  /** The daily XP goal was reached (bonus given once). */
  goalMet: boolean;
}

export interface QuizAttempt {
  quizId: string;
  at: number;
  ratio: number;
  passed: boolean;
  /** tag → [correct, total] */
  tags: Record<string, [number, number]>;
  durationSec?: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastActiveDay: DateKey | null;
  freezes: number;
}

export interface Counters {
  perfectQuizzes: number;
  simTrades: number;
  simWins: number;
  journalEntries: number;
  calculatorsUsed: string[];
  glossaryViewed: string[];
  dailyGoalsMet: number;
  /** Scenarios where skipping was the textbook decision and the learner skipped (distinct). */
  simSkippedScenarios: string[];
  backtestTrades: number;
  /** Closed demo/testnet journal trades (forward test). */
  forwardTrades: number;
  /** Consecutive closed journal trades that followed the plan. */
  planStreak: number;
  planWritten: boolean;
}

export interface Profile {
  name: string;
  startedAt: number;
  lastBackupAt?: number;
}

export interface ProgressState {
  version: number;
  lessons: Partial<Record<LessonId, LessonProgress>>;
  exams: Partial<Record<ExamKey, ExamProgress>>;
  xp: number;
  activity: Partial<Record<DateKey, DayActivity>>;
  streak: Streak;
  /** achievement id → unlock timestamp */
  achievements: Record<string, number>;
  /** Last 500 attempts, newest last. */
  quizAttempts: QuizAttempt[];
  counters: Counters;
  profile: Profile;
  /** null until the learner saves a plan (v3). */
  tradingPlan: TradingPlan | null;
  /** null = the course default (TPS) (v3). */
  strategy: CustomStrategy | null;
}

export type PlanSectionId =
  | 'goals'
  | 'markets'
  | 'routine'
  | 'risk'
  | 'strategy'
  | 'news'
  | 'emotions'
  | 'review'
  | 'changes';

/** The learner's written trading plan (m10-l03), edited on /plan. */
export interface TradingPlan {
  sections: Partial<Record<PlanSectionId, string>>;
  updatedAt: number;
}

/** The learner's own version of the course strategy (m11-l02, StrategyEditor). */
export interface CustomStrategy {
  name: string;
  rules: string[];
  updatedAt: number;
}

/** Derived, never stored. */
export type LessonStatus = 'locked' | 'available' | 'read' | 'completed';

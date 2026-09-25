import type { LessonId, ModuleId } from './course';
import type { QuizResult } from './quiz';
import type { SimOutcome } from './trading';

/**
 * Everything the learner does that can change progress, XP, streak or achievements.
 * One pipeline (lib/progress/applyEvent.ts) turns an event into a new state + rewards.
 */
export type ProgressEvent =
  | { type: 'lessonRead'; lessonId: LessonId }
  | { type: 'lessonTime'; lessonId: LessonId; seconds: number }
  | { type: 'quizCompleted'; lessonId: LessonId; result: QuizResult; durationSec?: number }
  | { type: 'examCompleted'; key: ModuleId | 'final'; result: QuizResult; durationSec?: number }
  | { type: 'simTrade'; outcome: SimOutcome; r: number; backtest?: boolean }
  | { type: 'simSkip'; correct: boolean }
  | { type: 'backtestEvaluated'; trades: number; expectancyR: number }
  | { type: 'journalEntry'; closed: boolean; forward: boolean; followedPlan: boolean }
  | { type: 'calculatorUsed'; calcId: string }
  | { type: 'glossaryViewed'; termId: string }
  | { type: 'backupMade' }
  | { type: 'planSaved' };

export type ProgressEventType = ProgressEvent['type'];

export interface RewardReason {
  label: string;
  xp: number;
}

/** What the UI celebrates after an event. */
export interface Rewards {
  xp: number;
  reasons: RewardReason[];
  newAchievements: string[];
  levelUp: { from: number; to: number } | null;
  dailyGoalMet: boolean;
  streak: { before: number; after: number };
}

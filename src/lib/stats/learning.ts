/** Learning statistics (stats.md «Обучение»): pure aggregates over ProgressState. */
import { addDays, dateRange, fromDateKey, type DateKey } from '@/lib/date';
import type { DayActivity, ProgressState, QuizAttempt } from '@/types/progress';

export interface DayXp {
  key: DateKey;
  xp: number;
}

const xpOf = (activity: ProgressState['activity'], key: DateKey) => activity[key]?.xp ?? 0;

/** XP per day for the last `days` days, ending today (oldest first). */
export function xpByDay(
  activity: Partial<Record<DateKey, DayActivity>>,
  today: DateKey,
  days: number,
): DayXp[] {
  return dateRange(addDays(today, -(days - 1)), today).map((key) => ({
    key,
    xp: xpOf(activity, key),
  }));
}

export interface HeatCell extends DayXp {
  /** 0 = no activity, 1–4 = relative intensity. */
  level: 0 | 1 | 2 | 3 | 4;
  /** After today (the current week is not over yet). */
  future: boolean;
}

/**
 * GitHub-style calendar: `weeks` columns of 7 days (Monday first), the last column holds
 * today. Intensity is relative to the busiest day of the period.
 */
export function heatmap(
  activity: Partial<Record<DateKey, DayActivity>>,
  today: DateKey,
  weeks: number,
): HeatCell[][] {
  const weekday = (fromDateKey(today).getDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -weekday - (weeks - 1) * 7);
  const keys = dateRange(start, addDays(start, weeks * 7 - 1));
  const max = Math.max(0, ...keys.filter((k) => k <= today).map((k) => xpOf(activity, k)));
  const cells = keys.map((key): HeatCell => {
    const xp = key <= today ? xpOf(activity, key) : 0;
    const level =
      xp <= 0 || max === 0 ? 0 : (Math.min(4, Math.ceil((xp / max) * 4)) as 1 | 2 | 3 | 4);
    return { key, xp, level, future: key > today };
  });
  return Array.from({ length: weeks }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export interface TagAccuracy {
  tag: string;
  correct: number;
  total: number;
  ratio: number;
}

/** Accuracy per question tag across all quiz attempts, weakest first. */
export function tagAccuracy(attempts: readonly QuizAttempt[]): TagAccuracy[] {
  const sums = new Map<string, [number, number]>();
  for (const attempt of attempts) {
    for (const [tag, [correct, total]] of Object.entries(attempt.tags)) {
      const [c, t] = sums.get(tag) ?? [0, 0];
      sums.set(tag, [c + correct, t + total]);
    }
  }
  return [...sums.entries()]
    .filter(([, [, total]]) => total > 0)
    .map(([tag, [correct, total]]) => ({ tag, correct, total, ratio: correct / total }))
    .sort((a, b) => a.ratio - b.ratio || b.total - a.total || a.tag.localeCompare(b.tag));
}

/** Weakest topics worth repeating: enough answers to judge and below `threshold`. */
export function weakTopics(
  accuracy: readonly TagAccuracy[],
  { limit = 5, minTotal = 3, threshold = 0.8 } = {},
): TagAccuracy[] {
  return accuracy.filter((a) => a.total >= minTotal && a.ratio < threshold).slice(0, limit);
}

export interface LearningSummary {
  xp: number;
  lessonsCompleted: number;
  /** Mean best quiz score over lessons with at least one attempt (0–1). */
  avgQuizBest: number | null;
  timeSec: number;
  streakCurrent: number;
  streakLongest: number;
  activeDays: number;
}

export function learningSummary(p: ProgressState): LearningSummary {
  const lessons = Object.values(p.lessons).filter((l) => l !== undefined);
  const attempted = lessons.filter((l) => l.quizAttempts > 0);
  return {
    xp: p.xp,
    lessonsCompleted: lessons.filter((l) => l.completedAt !== undefined).length,
    avgQuizBest:
      attempted.length > 0
        ? attempted.reduce((s, l) => s + l.quizBest, 0) / attempted.length
        : null,
    timeSec: lessons.reduce((s, l) => s + l.timeSpentSec, 0),
    streakCurrent: p.streak.current,
    streakLongest: p.streak.longest,
    activeDays: Object.values(p.activity).filter((d) => (d?.xp ?? 0) > 0).length,
  };
}

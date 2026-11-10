/**
 * Merging the progress of two devices (docs/04-features/accounts-backend.md, section 7).
 * Nothing earned on either device is lost. The merge is commutative, associative and
 * idempotent on its own results, so the order in which devices sync does not matter.
 */
import type { DateKey } from '@/lib/date';
import { applyActivity } from '@/lib/gamification/streak';
import { canonical } from './canonical';
import { emptyStreak, MAX_QUIZ_ATTEMPTS } from '@/lib/progress/initial';
import type {
  Counters,
  DayActivity,
  ExamProgress,
  LessonProgress,
  Profile,
  ProgressState,
  QuizAttempt,
  Streak,
} from '@/types/progress';

const maxOf = (a: number, b: number) => Math.max(a, b);

/** Earliest of two optional moments (undefined = never happened). */
function earliest(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

function latest(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

/** Last write wins by `updatedAt`; equal times pick the same side on every device. */
function newest<T>(a: T, b: T, updatedAt: (v: T) => number): T {
  const ta = updatedAt(a);
  const tb = updatedAt(b);
  if (ta !== tb) return ta > tb ? a : b;
  return canonical(a) >= canonical(b) ? a : b;
}

/** Union of two keyed records; a key present on both sides is combined by `merge`. */
function unionBy<T>(
  a: Partial<Record<string, T>>,
  b: Partial<Record<string, T>>,
  merge: (x: T, y: T) => T,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key];
    const y = b[key];
    if (x !== undefined && y !== undefined) out[key] = merge(x, y);
    else if (x !== undefined) out[key] = x;
    else if (y !== undefined) out[key] = y;
  }
  return out;
}

const unionList = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])].sort();

function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  return {
    readAt: earliest(a.readAt, b.readAt),
    quizBest: maxOf(a.quizBest, b.quizBest),
    quizAttempts: maxOf(a.quizAttempts, b.quizAttempts),
    completedAt: earliest(a.completedAt, b.completedAt),
    timeSpentSec: maxOf(a.timeSpentSec, b.timeSpentSec),
    xpEarned: maxOf(a.xpEarned, b.xpEarned),
    improvements: maxOf(a.improvements, b.improvements),
  };
}

function mergeExam(a: ExamProgress, b: ExamProgress): ExamProgress {
  return {
    best: maxOf(a.best, b.best),
    attempts: maxOf(a.attempts, b.attempts),
    passedAt: earliest(a.passedAt, b.passedAt),
    lastAttemptAt: latest(a.lastAttemptAt, b.lastAttemptAt),
  };
}

function mergeDay(a: DayActivity, b: DayActivity): DayActivity {
  return {
    xp: maxOf(a.xp, b.xp),
    minutes: maxOf(a.minutes, b.minutes),
    lessonsCompleted: maxOf(a.lessonsCompleted, b.lessonsCompleted),
    quizzes: maxOf(a.quizzes, b.quizzes),
    simTrades: maxOf(a.simTrades, b.simTrades),
    simXp: maxOf(a.simXp, b.simXp),
    journalXp: maxOf(a.journalXp, b.journalXp),
    goalMet: a.goalMet || b.goalMet,
  };
}

/** Attempts of both devices, one per (quiz, moment), oldest first, the last 500. */
function mergeAttempts(a: readonly QuizAttempt[], b: readonly QuizAttempt[]): QuizAttempt[] {
  const byKey = new Map<string, QuizAttempt>();
  for (const attempt of [...a, ...b]) {
    const key = `${attempt.quizId}@${attempt.at}`;
    const seen = byKey.get(key);
    byKey.set(key, seen ? newest(seen, attempt, (x) => x.ratio) : attempt);
  }
  return [...byKey.values()]
    .sort((x, y) => x.at - y.at || (x.quizId < y.quizId ? -1 : x.quizId > y.quizId ? 1 : 0))
    .slice(-MAX_QUIZ_ATTEMPTS);
}

function mergeCounters(a: Counters, b: Counters): Counters {
  return {
    perfectQuizzes: maxOf(a.perfectQuizzes, b.perfectQuizzes),
    simTrades: maxOf(a.simTrades, b.simTrades),
    simWins: maxOf(a.simWins, b.simWins),
    journalEntries: maxOf(a.journalEntries, b.journalEntries),
    calculatorsUsed: unionList(a.calculatorsUsed, b.calculatorsUsed),
    glossaryViewed: unionList(a.glossaryViewed, b.glossaryViewed),
    dailyGoalsMet: maxOf(a.dailyGoalsMet, b.dailyGoalsMet),
    simSkippedScenarios: unionList(a.simSkippedScenarios, b.simSkippedScenarios),
    backtestTrades: maxOf(a.backtestTrades, b.backtestTrades),
    forwardTrades: maxOf(a.forwardTrades, b.forwardTrades),
    planStreak: maxOf(a.planStreak, b.planStreak),
    planWritten: a.planWritten || b.planWritten,
  };
}

/**
 * The streak is rebuilt from the merged activity, so days studied on either device count.
 * Rebuilding can only see recorded days, so values a device already reached for the same last
 * day are kept (an old history may be shorter than the streak it produced).
 */
function mergeStreak(
  activity: Partial<Record<DateKey, DayActivity>>,
  a: Streak,
  b: Streak,
): Streak {
  const days = (Object.keys(activity) as DateKey[])
    .filter((day) => (activity[day]?.xp ?? 0) > 0)
    .sort();
  const replay = days.reduce(applyActivity, emptyStreak());
  const sameDay = [a, b].filter((s) => s.lastActiveDay === replay.lastActiveDay);
  return {
    current: Math.max(replay.current, ...sameDay.map((s) => s.current)),
    longest: Math.max(replay.longest, a.longest, b.longest),
    lastActiveDay: replay.lastActiveDay,
    freezes: Math.max(replay.freezes, ...sameDay.map((s) => s.freezes)),
  };
}

function mergeProfile(a: Profile, b: Profile): Profile {
  // An empty name is "not set yet"; otherwise the more recent edit wins.
  const named =
    a.name && !b.name ? a : b.name && !a.name ? b : newest(a, b, (p) => p.updatedAt ?? 0);
  return {
    name: named.name,
    ...(named.updatedAt !== undefined ? { updatedAt: named.updatedAt } : {}),
    startedAt: Math.min(a.startedAt, b.startedAt),
    ...(latest(a.lastBackupAt, b.lastBackupAt) !== undefined
      ? { lastBackupAt: latest(a.lastBackupAt, b.lastBackupAt) }
      : {}),
  };
}

function newestOrNull<T extends { updatedAt: number }>(a: T | null, b: T | null): T | null {
  if (!a) return b;
  if (!b) return a;
  return newest(a, b, (v) => v.updatedAt);
}

/** XP of all recorded days: offline gains on two devices both survive the merge. */
const activityXp = (activity: Partial<Record<DateKey, DayActivity>>) =>
  Object.values(activity).reduce((sum, day) => sum + (day?.xp ?? 0), 0);

export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const activity = unionBy(a.activity, b.activity, mergeDay) as ProgressState['activity'];
  return {
    version: Math.max(a.version, b.version),
    lessons: unionBy(a.lessons, b.lessons, mergeLesson) as ProgressState['lessons'],
    exams: unionBy(a.exams, b.exams, mergeExam) as ProgressState['exams'],
    xp: Math.max(a.xp, b.xp, activityXp(activity)),
    activity,
    streak: mergeStreak(activity, a.streak, b.streak),
    achievements: unionBy(a.achievements, b.achievements, Math.min),
    quizAttempts: mergeAttempts(a.quizAttempts, b.quizAttempts),
    counters: mergeCounters(a.counters, b.counters),
    profile: mergeProfile(a.profile, b.profile),
    tradingPlan: newestOrNull(a.tradingPlan, b.tradingPlan),
    strategy: newestOrNull(a.strategy, b.strategy),
  };
}

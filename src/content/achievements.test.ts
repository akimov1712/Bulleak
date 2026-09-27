import { describe, expect, it } from 'vitest';
import type { AchievementContext } from '@/types/achievements';
import type { ProgressEvent } from '@/types/events';
import type { ProgressState, QuizAttempt } from '@/types/progress';
import type { LessonId } from '@/types/course';
import { createInitialProgress, emptyDay, emptyLessonProgress } from '@/lib/progress/initial';
import { evaluateAchievements } from '@/lib/gamification/achievements';
import { xpForLevel } from '@/lib/gamification/levels';
import { courseIndex } from './courseIndex';
import { achievementById, achievements, CALCULATOR_IDS } from './achievements';

const NOON = new Date(2026, 8, 25, 12).getTime();
type Patch = (s: ProgressState) => ProgressState;

const base = (): ProgressState => createInitialProgress(NOON);
const counters =
  (c: Partial<ProgressState['counters']>): Patch =>
  (s) => ({
    ...s,
    counters: { ...s.counters, ...c },
  });
const completeLessons =
  (n: number, ratio = 0.9): Patch =>
  (s) => ({
    ...s,
    lessons: Object.fromEntries(
      courseIndex.lessons
        .slice(0, n)
        .map((l) => [
          l.id,
          { ...emptyLessonProgress(), completedAt: 1, quizBest: ratio, quizAttempts: 1 },
        ]),
    ),
  });
const passExam =
  (key: string, best = 0.9): Patch =>
  (s) => ({
    ...s,
    exams: { ...s.exams, [key]: { best, attempts: 1, passedAt: 1 } },
  });
const streakLongest =
  (n: number): Patch =>
  (s) => ({ ...s, streak: { ...s.streak, longest: n } });

const quizEvent = (
  patch: Partial<Extract<ProgressEvent, { type: 'quizCompleted' }>> = {},
): ProgressEvent => ({
  type: 'quizCompleted',
  lessonId: 'm00-l01',
  result: { quizId: 'm00-l01', correct: 10, total: 10, ratio: 1, passed: true, perQuestion: [] },
  durationSec: 300,
  ...patch,
});

interface Case {
  unlock: Patch;
  almost: Patch;
  event?: ProgressEvent;
  almostEvent?: ProgressEvent;
  now?: number;
  /** Time for the "almost" check (defaults to now). */
  almostNow?: number;
}

const failedAttempt: QuizAttempt = {
  quizId: 'm00-l01',
  at: 1,
  ratio: 0.5,
  passed: false,
  tags: {},
};
const m00Lessons = courseIndex.getModule('m00')?.lessons.map((l) => l.id) ?? [];
const withLessons =
  (ids: LessonId[], best: number): Patch =>
  (s) => ({
    ...s,
    lessons: Object.fromEntries(
      ids.map((id) => [id, { ...emptyLessonProgress(), completedAt: 1, quizBest: best }]),
    ),
  });

const cases: Record<string, Case> = {
  'first-step': {
    unlock: (s) => ({ ...s, lessons: { 'm00-l01': { ...emptyLessonProgress(), readAt: 1 } } }),
    almost: (s) => s,
  },
  'first-quiz': { unlock: completeLessons(1), almost: (s) => s },
  'perfect-1': { unlock: counters({ perfectQuizzes: 1 }), almost: (s) => s },
  'perfect-10': {
    unlock: counters({ perfectQuizzes: 10 }),
    almost: counters({ perfectQuizzes: 9 }),
  },
  'perfect-module': {
    unlock: withLessons(m00Lessons, 1),
    almost: (s) => withLessons(m00Lessons.slice(0, -1), 1)(withLessons(m00Lessons, 0.9)(s)),
  },
  'lessons-10': { unlock: completeLessons(10), almost: completeLessons(9) },
  'lessons-30': { unlock: completeLessons(30), almost: completeLessons(29) },
  'lessons-all': { unlock: completeLessons(62), almost: completeLessons(61) },
  'module-1': { unlock: passExam('m01'), almost: passExam('final') },
  'exam-perfect': { unlock: passExam('m02', 1), almost: passExam('m02', 0.95) },
  chartist: { unlock: passExam('m03'), almost: passExam('m04') },
  'risk-manager': { unlock: passExam('m09'), almost: passExam('m08') },
  graduate: { unlock: passExam('final'), almost: passExam('m12') },
  comeback: {
    unlock: (s) => ({ ...s, quizAttempts: [failedAttempt] }),
    almost: (s) => s,
    event: quizEvent(),
  },
  'fast-learner': {
    unlock: (s) => s,
    almost: (s) => s,
    event: quizEvent({ durationSec: 120 }),
    almostEvent: quizEvent({ durationSec: 180 }),
  },
  'streak-3': { unlock: streakLongest(3), almost: streakLongest(2) },
  'streak-7': { unlock: streakLongest(7), almost: streakLongest(6) },
  'streak-30': { unlock: streakLongest(30), almost: streakLongest(29) },
  'streak-100': { unlock: streakLongest(100), almost: streakLongest(99) },
  'goal-7': { unlock: counters({ dailyGoalsMet: 7 }), almost: counters({ dailyGoalsMet: 6 }) },
  'hours-10': {
    unlock: (s) => ({ ...s, activity: { '2026-09-25': { ...emptyDay(), minutes: 600 } } }),
    almost: (s) => ({ ...s, activity: { '2026-09-25': { ...emptyDay(), minutes: 599 } } }),
  },
  'early-bird': {
    unlock: (s) => s,
    almost: (s) => s,
    event: { type: 'lessonRead', lessonId: 'm00-l01' },
    now: new Date(2026, 8, 25, 6, 30).getTime(),
    almostNow: NOON,
  },
  'night-owl': {
    unlock: (s) => s,
    almost: (s) => s,
    event: { type: 'lessonTime', lessonId: 'm00-l01', seconds: 30 },
    now: new Date(2026, 8, 25, 1, 0).getTime(),
    almostNow: NOON,
  },
  weekend: {
    // 2026-09-26 is a Saturday
    unlock: (s) => ({
      ...s,
      activity: { '2026-09-26': { ...emptyDay(), xp: 5 }, '2026-09-27': { ...emptyDay(), xp: 5 } },
    }),
    almost: (s) => ({
      ...s,
      activity: { '2026-09-27': { ...emptyDay(), xp: 5 }, '2026-09-28': { ...emptyDay(), xp: 5 } },
    }),
  },
  'sim-first': { unlock: counters({ simTrades: 1 }), almost: (s) => s },
  'sim-10': { unlock: counters({ simTrades: 10 }), almost: counters({ simTrades: 9 }) },
  'sim-100': { unlock: counters({ simTrades: 100 }), almost: counters({ simTrades: 99 }) },
  'sim-3r': {
    unlock: (s) => s,
    almost: (s) => s,
    event: { type: 'simTrade', outcome: 'tp', r: 3 },
    almostEvent: { type: 'simTrade', outcome: 'tp', r: 2.9 },
  },
  'sim-skip': {
    unlock: counters({ simSkippedScenarios: ['s1', 's2', 's3', 's4', 's5'] }),
    almost: counters({ simSkippedScenarios: ['s1', 's2', 's3', 's4'] }),
  },
  backtester: {
    unlock: counters({ backtestTrades: 30 }),
    almost: counters({ backtestTrades: 29 }),
  },
  'positive-e': {
    unlock: (s) => s,
    almost: (s) => s,
    event: { type: 'backtestEvaluated', trades: 30, expectancyR: 0.1 },
    almostEvent: { type: 'backtestEvaluated', trades: 29, expectancyR: 0.5 },
  },
  'calc-all': {
    unlock: counters({ calculatorsUsed: [...CALCULATOR_IDS] }),
    almost: counters({ calculatorsUsed: [...CALCULATOR_IDS.slice(1), 'unknown'] }),
  },
  'journal-first': { unlock: counters({ journalEntries: 1 }), almost: (s) => s },
  'journal-30': {
    unlock: counters({ forwardTrades: 30 }),
    almost: counters({ forwardTrades: 29 }),
  },
  disciplined: { unlock: counters({ planStreak: 20 }), almost: counters({ planStreak: 19 }) },
  'plan-written': { unlock: counters({ planWritten: true }), almost: (s) => s },
  'glossary-50': {
    unlock: counters({ glossaryViewed: Array.from({ length: 50 }, (_, i) => `t${i}`) }),
    almost: counters({ glossaryViewed: Array.from({ length: 49 }, (_, i) => `t${i}`) }),
  },
  backup: {
    unlock: (s) => ({ ...s, profile: { ...s.profile, lastBackupAt: 1 } }),
    almost: (s) => s,
  },
  'level-10': {
    unlock: (s) => ({ ...s, xp: xpForLevel(10) }),
    almost: (s) => ({ ...s, xp: xpForLevel(10) - 1 }),
  },
  'level-20': {
    unlock: (s) => ({ ...s, xp: xpForLevel(20) }),
    almost: (s) => ({ ...s, xp: xpForLevel(20) - 1 }),
  },
};

describe('achievement definitions', () => {
  it('has 40 unique achievements matching the spec table', () => {
    expect(achievements).toHaveLength(40);
    expect(achievementById.size).toBe(40);
    expect(Object.keys(cases).sort()).toEqual(achievements.map((a) => a.id).sort());
  });

  it('every achievement has title, description, icon and positive XP', () => {
    for (const a of achievements) {
      expect(a.title.length).toBeGreaterThan(2);
      expect(a.description.length).toBeGreaterThan(5);
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.xp).toBeGreaterThan(0);
    }
  });

  it.each(Object.entries(cases))('%s unlocks exactly at its condition', (id, c) => {
    const def = achievementById.get(id);
    if (!def) throw new Error(`no def ${id}`);
    const ctx = (event?: ProgressEvent, now = c.now ?? NOON): AchievementContext => ({
      now,
      event,
      course: courseIndex,
    });
    expect(def.check(c.unlock(base()), ctx(c.event)), 'should unlock').toBe(true);
    expect(
      def.check(c.almost(base()), ctx(c.almostEvent ?? c.event, c.almostNow ?? c.now ?? NOON)),
      'should not unlock yet',
    ).toBe(false);
  });
});

describe('evaluateAchievements', () => {
  it('returns only newly earned achievements', () => {
    const state = counters({ perfectQuizzes: 1 })(completeLessons(1)(base()));
    const ctx = { now: NOON, course: courseIndex };
    const first = evaluateAchievements(achievements, state, ctx).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['first-quiz', 'perfect-1']));
    const unlocked = { ...state, achievements: Object.fromEntries(first.map((id) => [id, NOON])) };
    expect(evaluateAchievements(achievements, unlocked, ctx)).toEqual([]);
  });

  it('early-bird needs a learning event, not just the time', () => {
    const def = achievementById.get('early-bird');
    const now = new Date(2026, 8, 25, 6).getTime();
    expect(def?.check(base(), { now, course: courseIndex })).toBe(false);
    expect(def?.check(base(), { now, course: courseIndex, event: { type: 'backupMade' } })).toBe(
      false,
    );
  });

  it('progress counters report current/target', () => {
    const def = achievementById.get('lessons-10');
    expect(def?.progress?.(completeLessons(4)(base()), { now: NOON, course: courseIndex })).toEqual(
      {
        current: 4,
        target: 10,
      },
    );
  });
});

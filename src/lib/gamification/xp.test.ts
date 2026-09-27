import { describe, expect, it } from 'vitest';
import type { ProgressState } from '@/types/progress';
import type { QuizResult } from '@/types/quiz';
import { createInitialProgress, emptyDay, emptyLessonProgress } from '@/lib/progress/initial';
import { sumXp, XP, xpForEvent } from './xp';

const NOW = new Date(2026, 8, 25, 12).getTime();
const DAY = '2026-09-25';
const result = (ratio: number, passed = ratio >= 0.8): QuizResult => ({
  quizId: 'x',
  correct: 0,
  total: 10,
  ratio,
  passed,
  perQuestion: [],
});

function with_(patch: Partial<ProgressState>): ProgressState {
  return { ...createInitialProgress(NOW), ...patch };
}

const xp = (state: ProgressState, event: Parameters<typeof xpForEvent>[1]) =>
  sumXp(xpForEvent(state, event, NOW));

describe('lessonRead', () => {
  it('pays once', () => {
    expect(xp(with_({}), { type: 'lessonRead', lessonId: 'm00-l01' })).toBe(10);
    const read = with_({ lessons: { 'm00-l01': { ...emptyLessonProgress(), readAt: 1 } } });
    expect(xp(read, { type: 'lessonRead', lessonId: 'm00-l01' })).toBe(0);
  });
});

describe('quizCompleted', () => {
  const quiz = (state: ProgressState, ratio: number) =>
    xp(state, { type: 'quizCompleted', lessonId: 'm00-l01', result: result(ratio) });

  it('first pass: 50 + bonus by score', () => {
    expect(quiz(with_({}), 0.8)).toBe(50);
    expect(quiz(with_({}), 0.89)).toBe(50);
    expect(quiz(with_({}), 0.9)).toBe(60);
    expect(quiz(with_({}), 1)).toBe(75);
  });

  it('failing gives nothing', () => {
    expect(quiz(with_({}), 0.7)).toBe(0);
  });

  it('first pass after failed attempts still pays in full', () => {
    const failedBefore = with_({
      lessons: { 'm00-l01': { ...emptyLessonProgress(), quizAttempts: 2, quizBest: 0.6 } },
    });
    expect(quiz(failedBefore, 0.9)).toBe(60);
  });

  it('retake: +5 only when the best improves, at most 3 times', () => {
    const completed = (best: number, improvements: number) =>
      with_({
        lessons: {
          'm00-l01': {
            ...emptyLessonProgress(),
            completedAt: 1,
            quizBest: best,
            quizAttempts: 1,
            improvements,
          },
        },
      });
    expect(quiz(completed(0.8, 0), 0.9)).toBe(5);
    expect(quiz(completed(0.9, 0), 0.9)).toBe(0);
    expect(quiz(completed(0.9, 0), 0.8)).toBe(0);
    expect(quiz(completed(0.8, 3), 1)).toBe(0);
  });
});

describe('examCompleted', () => {
  it('pays for the first pass only, with a perfect bonus', () => {
    expect(xp(with_({}), { type: 'examCompleted', key: 'm01', result: result(0.8) })).toBe(150);
    expect(xp(with_({}), { type: 'examCompleted', key: 'm01', result: result(1) })).toBe(200);
    expect(xp(with_({}), { type: 'examCompleted', key: 'm01', result: result(0.5) })).toBe(0);
    const passed = with_({ exams: { m01: { best: 0.8, attempts: 1, passedAt: 1 } } });
    expect(xp(passed, { type: 'examCompleted', key: 'm01', result: result(1) })).toBe(0);
    expect(xp(with_({}), { type: 'examCompleted', key: 'final', result: result(0.9) })).toBe(500);
  });
});

describe('simulator and journal daily caps', () => {
  it('sim trade 5 (+5 on target) up to 50 per day', () => {
    expect(xp(with_({}), { type: 'simTrade', outcome: 'sl', r: -1 })).toBe(5);
    expect(xp(with_({}), { type: 'simTrade', outcome: 'tp', r: 2 })).toBe(10);
    const nearCap = with_({ activity: { [DAY]: { ...emptyDay(), simXp: 45 } } });
    expect(xp(nearCap, { type: 'simTrade', outcome: 'tp', r: 2 })).toBe(5);
    const atCap = with_({ activity: { [DAY]: { ...emptyDay(), simXp: XP.simDailyCap } } });
    expect(xp(atCap, { type: 'simTrade', outcome: 'tp', r: 2 })).toBe(0);
  });

  it('closed journal entries 10 up to 30 per day; open entries nothing', () => {
    const entry = {
      type: 'journalEntry' as const,
      closed: true,
      forward: true,
      followedPlan: true,
    };
    expect(xp(with_({}), entry)).toBe(10);
    expect(xp(with_({}), { ...entry, closed: false })).toBe(0);
    const capped = with_({ activity: { [DAY]: { ...emptyDay(), journalXp: 30 } } });
    expect(xp(capped, entry)).toBe(0);
  });
});

describe('calculators', () => {
  it('first use of each calculator pays once', () => {
    expect(xp(with_({}), { type: 'calculatorUsed', calcId: 'position' })).toBe(5);
    const used = with_({
      counters: { ...createInitialProgress(NOW).counters, calculatorsUsed: ['position'] },
    });
    expect(xp(used, { type: 'calculatorUsed', calcId: 'position' })).toBe(0);
  });
});

describe('events without direct XP', () => {
  it.each([
    { type: 'lessonTime', lessonId: 'm00-l01', seconds: 10 },
    { type: 'simSkip', scenarioId: 'a', correct: true },
    { type: 'backtestEvaluated', trades: 30, expectancyR: 0.3 },
    { type: 'glossaryViewed', termId: 'edge' },
    { type: 'backupMade' },
    { type: 'planSaved' },
  ] as const)('$type → 0', (event) => {
    expect(xp(with_({}), event)).toBe(0);
  });
});

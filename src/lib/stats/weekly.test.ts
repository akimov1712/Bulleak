import { describe, expect, it } from 'vitest';
import { emptyDay } from '@/lib/progress/initial';
import { toDateKey } from '@/lib/date';
import type { AnswerEvent } from '@/lib/learner/events';
import type { SimTrade } from '@/types/trading';
import { weeklyReport } from './weekly';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 11, 18).getTime();

const answer = (at: number, ok: boolean): AnswerEvent => ({
  kind: 'answer',
  at,
  quizId: 'm09-l01',
  questionId: `q${at}`,
  ok,
  skills: ['risk'],
  type: 'single',
});

const sim = (at: number, patch: Partial<SimTrade> = {}): SimTrade => ({
  at,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 0,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 1000,
  qty: 2,
  exitPrice: 110,
  exitIndex: 5,
  outcome: 'tp',
  pnl: 20,
  r: 2,
  fees: 0,
  ...patch,
});

describe('weeklyReport', () => {
  it('sums the week: learning, practice and skills that moved', () => {
    const r = weeklyReport({
      progress: {
        activity: {
          [toDateKey(NOW)]: { ...emptyDay(), xp: 60, quizzes: 1, lessonsCompleted: 1 },
          [toDateKey(NOW - 3 * DAY)]: { ...emptyDay(), xp: 20, minutes: 15 },
          [toDateKey(NOW - 10 * DAY)]: { ...emptyDay(), xp: 500 },
        },
      },
      answers: [
        answer(NOW - 20 * DAY, false),
        ...[1, 2, 3, 4, 5].map((i) => answer(NOW - i * 1000, true)),
      ],
      sim: [
        sim(NOW - 20 * DAY, { riskPct: 3 }),
        sim(NOW - DAY),
        sim(NOW - DAY + 1, { riskPct: 2 }),
        sim(NOW - DAY + 2, { strategyTag: 'tps' }),
      ],
      journal: [],
      now: NOW,
    });
    expect(r.learning).toEqual({
      xp: 80,
      activeDays: 2,
      lessonsCompleted: 1,
      answers: 5,
      correct: 5,
    });
    // Two own trades this week: risk + R:R each, one risk broken.
    expect(r.practice).toEqual({ simTrades: 2, journalTrades: 0, discipline: 75, broken: 1 });
    expect(r.skills).toHaveLength(1);
    expect(r.skills[0]?.skill).toBe('risk');
    expect((r.skills[0]?.after ?? 0) - (r.skills[0]?.before ?? 0)).toBeGreaterThan(0.1);
  });

  it('is empty for a quiet week', () => {
    const r = weeklyReport({
      progress: { activity: {} },
      answers: [],
      sim: [],
      journal: [],
      now: NOW,
    });
    expect(r.practice.discipline).toBeNull();
    expect(r.learning.activeDays).toBe(0);
    expect(r.skills).toEqual([]);
  });
});

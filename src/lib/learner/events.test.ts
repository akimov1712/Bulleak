import { describe, expect, it } from 'vitest';
import type { QuizAttempt } from '@/types/progress';
import type { SimTrade } from '@/types/trading';
import { answerEvents, learningEvents, tradeEvents } from './events';

const skillsOfTags = (tags: readonly string[]) => [
  ...new Set(tags.flatMap((t) => ({ rsi: ['osc'], macd: ['osc'], atr: ['vol'] })[t] ?? [])),
];

const attempt = (patch: Partial<QuizAttempt>): QuizAttempt => ({
  quizId: 'm05-l03',
  at: 1000,
  ratio: 1,
  passed: true,
  tags: {},
  ...patch,
});

const trade = (patch: Partial<SimTrade>): SimTrade => ({
  at: 0,
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

describe('answerEvents', () => {
  it('takes per-question answers with skills from their tags', () => {
    const events = answerEvents(
      [
        attempt({
          answers: [
            { q: 'q1', ok: true, tags: ['rsi', 'macd'], type: 'single', sec: 12 },
            { q: 'q2', ok: false, tags: ['atr'] },
          ],
        }),
      ],
      skillsOfTags,
    );
    expect(events).toEqual([
      {
        kind: 'answer',
        at: 1000,
        quizId: 'm05-l03',
        questionId: 'q1',
        ok: true,
        skills: ['osc'],
        type: 'single',
        sec: 12,
      },
      { kind: 'answer', at: 1000, quizId: 'm05-l03', questionId: 'q2', ok: false, skills: ['vol'] },
    ]);
  });

  it('rebuilds old attempts from the tag summary without counting a question twice', () => {
    // rsi and macd are the same skill: the larger count stands for it, not the sum.
    const events = answerEvents(
      [attempt({ tags: { rsi: [2, 4], macd: [1, 2], atr: [0, 1], unknown: [1, 1] } })],
      skillsOfTags,
    );
    const osc = events.filter((e) => e.skills[0] === 'osc');
    expect(osc.map((e) => e.ok)).toEqual([false, true, false, true]);
    expect(events.filter((e) => e.skills[0] === 'vol').map((e) => e.ok)).toEqual([false]);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.questionId === undefined)).toBe(true);
  });

  it('orders attempts by time', () => {
    const events = answerEvents(
      [
        attempt({ at: 2000, answers: [{ q: 'late', ok: true, tags: ['rsi'] }] }),
        attempt({ at: 1000, answers: [{ q: 'early', ok: true, tags: ['rsi'] }] }),
      ],
      skillsOfTags,
    );
    expect(events.map((e) => e.questionId)).toEqual(['early', 'late']);
  });
});

describe('tradeEvents and learningEvents', () => {
  it('leaves out backtests and deleted trades, sorts by time', () => {
    const events = tradeEvents([
      trade({ at: 30 }),
      trade({ at: 10, strategyTag: 'tps' }),
      trade({ at: 20, deleted: true }),
      trade({ at: 5 }),
    ]);
    expect(events.map((e) => e.at)).toEqual([5, 30]);
  });

  it('merges answers and trades in time order, answers first on a tie', () => {
    const events = learningEvents(
      [attempt({ at: 20, answers: [{ q: 'q', ok: true, tags: ['rsi'] }] })],
      [trade({ at: 20 }), trade({ at: 10 })],
      skillsOfTags,
    );
    expect(events.map((e) => `${e.kind}@${e.at}`)).toEqual(['trade@10', 'answer@20', 'trade@20']);
  });
});

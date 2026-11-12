import { describe, expect, it } from 'vitest';
import type { JournalTrade } from '@/types/trading';
import { planVsFact, summarizePlanFact } from './planVsFact';

const trade = (over: Partial<JournalTrade>): JournalTrade => ({
  openedAt: 1,
  closedAt: 2,
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  sl: 95,
  tp: 110,
  exit: 110,
  qty: 1,
  leverage: 1,
  fees: 0,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
  ...over,
});

describe('planVsFact', () => {
  it('classifies exits against the planned levels, for longs and shorts', () => {
    expect(planVsFact(trade({ exit: 110 }))).toMatchObject({
      kind: 'target',
      plannedR: 2,
      actualR: 2,
    });
    expect(planVsFact(trade({ exit: 95 }))?.kind).toBe('stop');
    expect(planVsFact(trade({ exit: 104 }))).toMatchObject({ kind: 'early-win', actualR: 0.8 });
    expect(planVsFact(trade({ exit: 98 }))?.kind).toBe('early-loss');
    expect(planVsFact(trade({ exit: 92 }))).toMatchObject({ kind: 'beyond-stop', actualR: -1.6 });
    const short = { side: 'short' as const, entry: 100, sl: 105, tp: 90 };
    expect(planVsFact(trade({ ...short, exit: 90 }))?.kind).toBe('target');
    expect(planVsFact(trade({ ...short, exit: 107 }))?.kind).toBe('beyond-stop');
  });

  it('skips open trades and a stop on the wrong side', () => {
    expect(planVsFact(trade({ exit: undefined }))).toBeNull();
    expect(planVsFact(trade({ sl: 101 }))).toBeNull();
  });

  it('without a take profit a winner is never «at target»', () => {
    expect(planVsFact(trade({ tp: undefined, exit: 120 }))).toMatchObject({
      kind: 'early-win',
      plannedR: null,
    });
  });

  it('sums what early exits left and what was lost beyond the stop', () => {
    const s = summarizePlanFact([
      trade({ exit: 110 }),
      trade({ exit: 95 }),
      trade({ exit: 104 }),
      trade({ exit: 92 }),
      trade({ exit: undefined }),
    ]);
    expect(s.count).toBe(4);
    expect(s.byKind).toMatchObject({ target: 1, stop: 1, 'early-win': 1, 'beyond-stop': 1 });
    expect(s.byPlanShare).toBe(0.5);
    expect(s.leftOnTableR).toBeCloseTo(1.2);
    expect(s.extraLossR).toBeCloseTo(0.6);
    expect(summarizePlanFact([]).byPlanShare).toBeNull();
  });
});

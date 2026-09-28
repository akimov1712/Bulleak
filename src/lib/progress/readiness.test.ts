import { describe, expect, it } from 'vitest';
import { PLAN_SECTIONS } from '@/content/tradingPlan';
import type { JournalTrade } from '@/types/trading';
import type { PlanSectionId } from '@/types/progress';
import { READINESS_EXAMS, readiness, type ReadinessInput } from './readiness';

const journalTrade = (extra: Partial<JournalTrade>): JournalTrade => ({
  openedAt: 1,
  closedAt: 2,
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  exit: 110,
  sl: 95,
  qty: 1,
  leverage: 1,
  fees: 0,
  pnl: 10,
  r: 2,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
  ...extra,
});

/** 30 results alternating +2R and −1R → expectancy +0.5R. */
const results = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 2 : -1));

const fullPlan = () => ({
  sections: Object.fromEntries(PLAN_SECTIONS.map((s) => [s.id, 'правило'])) as Record<
    PlanSectionId,
    string
  >,
  updatedAt: 1,
});

const ready = (): ReadinessInput => ({
  exams: Object.fromEntries(
    READINESS_EXAMS.map((k) => [k, { best: 0.9, attempts: 1, passedAt: 1 }]),
  ),
  tradingPlan: fullPlan(),
  strategy: { name: 'Моя TPS', rules: ['Правило'], updatedAt: 1 },
  simTrades: results(30).map((r, i) => ({ at: i, r, pnl: r * 10, strategyTag: 'tps' })),
  journal: results(30).map((r, i) =>
    journalTrade({ closedAt: i, r, pnl: r * 10, followedPlan: i !== 0 }),
  ),
});

const failed = (input: ReadinessInput) =>
  readiness(input)
    .items.filter((i) => !i.passed)
    .map((i) => i.id);

describe('readiness', () => {
  it('passes when every automatic criterion is met', () => {
    const r = readiness(ready());
    expect(r.ready).toBe(true);
    expect(r.examsPassed).toBe(12);
    expect(r.backtest).toEqual({ count: 30, expectancyR: 0.5 });
    expect(r.forward.followedPlanShare).toBeCloseTo(29 / 30, 6);
  });

  it('exams: all module exams 0–11 must be passed', () => {
    const input = ready();
    input.exams = { ...input.exams, m07: { best: 0.6, attempts: 2 } };
    expect(failed(input)).toEqual(['exams']);
    expect(readiness(input).examsPassed).toBe(11);
  });

  it('backtest: 30+ tagged trades with expectancy of at least +0.2R', () => {
    const few = ready();
    few.simTrades = few.simTrades.slice(0, 29);
    expect(failed(few)).toEqual(['backtest']);
    const weak = ready();
    weak.simTrades = weak.simTrades.map((t, i) => ({ ...t, r: i % 2 === 0 ? 1 : -0.9 }));
    expect(failed(weak)).toEqual(['backtest']);
    const untagged = ready();
    untagged.simTrades = untagged.simTrades.map((t) => ({ ...t, strategyTag: undefined }));
    expect(failed(untagged)).toEqual(['backtest']);
  });

  it('forward: 30+ closed demo/testnet trades, positive expectancy, 90 % by the plan', () => {
    const real = ready();
    real.journal = real.journal.map((t) => ({ ...t, account: 'real' as const }));
    expect(failed(real)).toEqual(['forward']);
    const negative = ready();
    negative.journal = negative.journal.map((t) => ({ ...t, r: -0.1, pnl: -1 }));
    expect(failed(negative)).toEqual(['forward']);
    const sloppy = ready();
    sloppy.journal = sloppy.journal.map((t, i) => ({ ...t, followedPlan: i > 3 }));
    expect(failed(sloppy)).toEqual(['forward']);
  });

  it('plan, strategy and limits must be saved and filled in', () => {
    const noPlan = ready();
    noPlan.tradingPlan = null;
    expect(failed(noPlan)).toEqual(['plan', 'limits']);
    const blankRisk = ready();
    blankRisk.tradingPlan = {
      ...fullPlan(),
      sections: { ...fullPlan().sections, risk: '  ' },
    };
    expect(failed(blankRisk)).toEqual(['plan', 'limits']);
    const noStrategy = ready();
    noStrategy.strategy = null;
    expect(failed(noStrategy)).toEqual(['strategy']);
    const emptyRules = ready();
    emptyRules.strategy = { name: 'x', rules: [' '], updatedAt: 1 };
    expect(failed(emptyRules)).toEqual(['strategy']);
  });
});

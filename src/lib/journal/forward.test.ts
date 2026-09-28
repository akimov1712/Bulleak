import { describe, expect, it } from 'vitest';
import type { JournalTrade } from '@/types/trading';
import { forwardComparison, isForwardAccount, resultMetrics } from './forward';

const jt = (extra: Partial<JournalTrade>): JournalTrade => ({
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

describe('resultMetrics', () => {
  it('computes expectancy, profit factor, R drawdown and the longest losing streak', () => {
    const m = resultMetrics([
      { r: 2, pnl: 20 },
      { r: -1, pnl: -10 },
      { r: -1, pnl: -10 },
      { r: -1, pnl: -10 },
      { r: 2, pnl: 20 },
    ]);
    expect(m.count).toBe(5);
    expect(m.winrate).toBeCloseTo(0.4, 6);
    expect(m.expectancyR).toBeCloseTo(0.2, 6);
    expect(m.profitFactor).toBeCloseTo(40 / 30, 6);
    expect(m.maxDrawdownR).toBe(3);
    expect(m.longestLossStreak).toBe(3);
  });

  it('is empty-safe', () => {
    const m = resultMetrics([]);
    expect(m).toMatchObject({ count: 0, winrate: null, expectancyR: null, profitFactor: null });
  });
});

describe('forwardComparison', () => {
  it('uses only closed demo and testnet trades for the forward side', () => {
    expect(isForwardAccount({ account: 'testnet' })).toBe(true);
    expect(isForwardAccount({ account: 'real' })).toBe(false);
    const c = forwardComparison(
      [
        { at: 2, r: -1, pnl: -10 },
        { at: 1, r: 2, pnl: 20 },
      ],
      [
        jt({}),
        jt({ account: 'testnet', r: -1, pnl: -5, followedPlan: false, closedAt: 3 }),
        jt({ account: 'real' }),
        jt({ closedAt: undefined, pnl: undefined, r: undefined }),
      ],
    );
    expect(c.backtest.count).toBe(2);
    expect(c.backtest.maxDrawdownR).toBe(1);
    expect(c.forward.count).toBe(2);
    expect(c.forward.expectancyR).toBeCloseTo(0.5, 6);
    expect(c.forward.followedPlanShare).toBeCloseTo(0.5, 6);
  });
});

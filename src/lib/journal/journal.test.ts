import { describe, expect, it } from 'vitest';
import type { JournalTrade } from '@/types/trading';
import { groupStats, journalMetrics } from './metrics';
import { journalResult, validateJournalTrade } from './pnl';

const H = 3_600_000;
let n = 0;
/** A closed trade with the given result in R (risk $100: entry 100, stop 90, qty 10). */
const closed = (r: number, extra: Partial<JournalTrade> = {}): JournalTrade => {
  n += 1;
  return {
    openedAt: n * 10 * H,
    closedAt: n * 10 * H + 4 * H,
    account: 'testnet',
    symbol: 'BTCUSDT',
    side: 'long',
    market: 'perp',
    entry: 100,
    exit: 100 + r * 10,
    sl: 90,
    qty: 10,
    leverage: 1,
    fees: 0,
    pnl: r * 100,
    r,
    setup: 'tps',
    timeframe: '4H',
    followedPlan: true,
    emotion: 'calm',
    notes: '',
    tags: [],
    ...extra,
  };
};

describe('journalResult', () => {
  it('long and short P&L after fees, in R', () => {
    expect(
      journalResult({ side: 'long', entry: 100, exit: 120, sl: 90, qty: 10, fees: 5 }),
    ).toEqual({ pnl: 195, r: 1.95 });
    expect(
      journalResult({ side: 'short', entry: 100, exit: 105, sl: 110, qty: 2, fees: 0 }),
    ).toEqual({ pnl: -10, r: -0.5 });
  });

  it('null while open or with a zero risk', () => {
    expect(journalResult({ side: 'long', entry: 100, sl: 90, qty: 1, fees: 0 })).toBeNull();
    expect(
      journalResult({ side: 'long', entry: 100, exit: 110, sl: 100, qty: 1, fees: 0 }),
    ).toBeNull();
  });
});

describe('validateJournalTrade', () => {
  const base = {
    side: 'long' as const,
    entry: 100,
    sl: 90,
    tp: 130,
    qty: 1,
    fees: 0,
    leverage: 3,
    openedAt: 10,
    exit: undefined,
    closedAt: undefined,
  };
  it('accepts a correct trade and names every problem', () => {
    expect(validateJournalTrade(base)).toEqual([]);
    expect(validateJournalTrade({ ...base, sl: 110, tp: 95, qty: 0 })).toEqual([
      'sl-side',
      'tp-side',
      'qty',
    ]);
    expect(validateJournalTrade({ ...base, side: 'short' })).toEqual(['sl-side', 'tp-side']);
    expect(validateJournalTrade({ ...base, leverage: 0, fees: -1, exit: 0, closedAt: 5 })).toEqual([
      'leverage',
      'fees',
      'exit',
      'closed-before-open',
    ]);
  });
});

describe('journalMetrics', () => {
  it('empty journal: zeros and nulls, no NaN', () => {
    const m = journalMetrics([]);
    expect(m).toMatchObject({
      count: 0,
      winrate: null,
      profitFactor: null,
      avgR: null,
      totalR: 0,
      maxDrawdownR: 0,
      avgDurationMs: null,
      followedPlanShare: null,
    });
    expect(m.equity).toEqual([]);
  });

  it('only winners: PF is null (no losses → «—»), no drawdown', () => {
    const m = journalMetrics([closed(2), closed(1)]);
    expect(m.winrate).toBe(1);
    expect(m.profitFactor).toBeNull();
    expect(m.maxDrawdownR).toBe(0);
    expect(m.longestWinStreak).toBe(2);
  });

  it('only losers: PF 0, drawdown equals the losses', () => {
    const m = journalMetrics([closed(-1), closed(-1), closed(-0.5)], 1000);
    expect(m.profitFactor).toBe(0);
    expect(m.maxDrawdownR).toBeCloseTo(2.5);
    expect(m.maxDrawdownPct).toBeCloseTo(25);
    expect(m.longestLossStreak).toBe(3);
  });

  it('mixed: win rate, PF, R, drawdown, streaks, duration, plan share, open trades ignored', () => {
    const trades = [
      closed(2),
      closed(-1),
      closed(-1, { followedPlan: false, emotion: 'fomo' }),
      closed(3),
      closed(-1, { emotion: 'fomo', setup: 'breakout' }),
      { ...closed(0), exit: undefined, pnl: undefined, r: undefined, closedAt: undefined },
    ];
    const m = journalMetrics(trades);
    expect(m.count).toBe(5);
    expect(m.winrate).toBeCloseTo(0.4);
    expect(m.profitFactor).toBeCloseTo(500 / 300);
    expect(m.avgR).toBeCloseTo(0.4);
    expect(m.avgWinR).toBeCloseTo(2.5);
    expect(m.avgLossR).toBeCloseTo(-1);
    expect(m.totalR).toBeCloseTo(2);
    expect(m.maxDrawdownR).toBeCloseTo(2);
    expect(m.longestLossStreak).toBe(2);
    expect(m.avgDurationMs).toBe(4 * H);
    expect(m.followedPlanShare).toBeCloseTo(0.8);
    expect(m.equity.map((p) => p.r)).toEqual([2, 1, 0, 3, 2]);
    expect(m.maxDrawdownPct).toBeNull();

    const emotions = groupStats(trades, 'emotion');
    expect(emotions[0]).toMatchObject({ key: 'calm', count: 3 });
    expect(emotions.find((g) => g.key === 'fomo')).toMatchObject({
      count: 2,
      winrate: 0,
      totalR: -2,
    });
    expect(groupStats(trades, 'setup').map((g) => g.key)).toEqual(['tps', 'breakout']);
  });
});

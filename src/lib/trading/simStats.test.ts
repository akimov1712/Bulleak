import { describe, expect, it } from 'vitest';
import { filterTrades, profitFactor, simSummary, tradeKind } from './simStats';

const t = (r: number, pnl: number, scenarioId: string | null = null, strategyTag?: string) => ({
  r,
  pnl,
  scenarioId,
  strategyTag,
});

describe('simStats', () => {
  it('classifies free, scenario and backtest trades', () => {
    expect(tradeKind(t(1, 1))).toBe('free');
    expect(tradeKind(t(1, 1, 'm03-sr-bounce'))).toBe('scenario');
    expect(tradeKind(t(1, 1, null, 'tps'))).toBe('backtest');
  });

  it('filters by kind', () => {
    const trades = [t(1, 1), t(2, 2, 'x'), t(-1, -1, null, 'tps')];
    expect(filterTrades(trades, 'all')).toHaveLength(3);
    expect(filterTrades(trades, 'scenario')).toEqual([trades[1]]);
    expect(filterTrades(trades, 'backtest')).toEqual([trades[2]]);
  });

  it('summarises win rate and R; a win is a positive result after fees', () => {
    const s = simSummary([t(2, 200), t(-1, -100), t(-0.05, -5), t(1, 100)]);
    expect(s).toMatchObject({ count: 4, wins: 2, totalPnl: 195 });
    expect(s.winrate).toBeCloseTo(0.5);
    expect(s.avgR).toBeCloseTo(0.4875);
    expect(simSummary([])).toMatchObject({ count: 0, winrate: null, avgR: null, totalR: 0 });
  });

  it('profit factor divides gross profit by gross loss', () => {
    expect(profitFactor([t(2, 200), t(-1, -100), t(1, 100), t(-1, -100)])).toBeCloseTo(1.5);
    expect(profitFactor([t(1, 100)])).toBeNull();
    expect(profitFactor([])).toBeNull();
  });
});

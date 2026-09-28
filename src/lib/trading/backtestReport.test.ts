import { describe, expect, it } from 'vitest';
import { backtestReport, drawdownAtRisk } from './backtestReport';

const trade = (i: number, r: number) => ({ at: i, r, pnl: r * 100 });

describe('drawdownAtRisk', () => {
  it('compounds losses at 1 % risk and measures from the running peak', () => {
    expect(drawdownAtRisk([])).toBe(0);
    // 10 losses of 1R: 1 − 0.99^10 ≈ 9.56 %
    expect(drawdownAtRisk(Array<number>(10).fill(-1))).toBeCloseTo(9.56, 2);
    // a new peak resets the reference point
    expect(drawdownAtRisk([-1, 5, -1, -1])).toBeCloseTo((1 - 0.99 ** 2) * 100, 6);
    expect(drawdownAtRisk([-1, -1], 2)).toBeCloseTo((1 - 0.98 ** 2) * 100, 6);
  });
});

describe('backtestReport', () => {
  it('computes the brief example: 12 wins of 2R, 18 losses of 1R', () => {
    const trades = [
      ...Array.from({ length: 18 }, (_, i) => trade(i * 2, -1)),
      ...Array.from({ length: 12 }, (_, i) => trade(i * 2 + 1, 2)),
    ];
    const report = backtestReport(trades);
    expect(report.count).toBe(30);
    expect(report.winrate).toBeCloseTo(0.4, 6);
    expect(report.expectancyR).toBeCloseTo(0.2, 6);
    expect(report.profitFactor).toBeCloseTo(24 / 18, 6);
    expect(report.maxLosingStreak).toBe(6); // 12 loss–win pairs, then the last 6 losses in a row
    expect(report.checks.map((c) => c.passed)).toEqual([true, true, true, true]);
    expect(report.ready).toBe(true);
  });

  it('fails the thresholds with a small or weak sample', () => {
    const weak = backtestReport([trade(1, 2), trade(2, -1), trade(3, -1), trade(4, -1)]);
    expect(weak.expectancyR).toBeCloseTo(-0.25, 6);
    expect(weak.checks.find((c) => c.id === 'trades')?.passed).toBe(false);
    expect(weak.checks.find((c) => c.id === 'expectancy')?.passed).toBe(false);
    expect(weak.checks.find((c) => c.id === 'profitFactor')?.passed).toBe(false);
    expect(weak.maxLosingStreak).toBe(3);
    expect(weak.ready).toBe(false);

    const deep = backtestReport(Array.from({ length: 20 }, (_, i) => trade(i, -1)));
    expect(deep.maxDrawdownPct).toBeGreaterThan(15);
    expect(deep.checks.find((c) => c.id === 'drawdown')?.passed).toBe(false);
  });

  it('handles an empty sample and a sample without losses', () => {
    const empty = backtestReport([]);
    expect(empty.expectancyR).toBeNull();
    expect(empty.ready).toBe(false);
    const allWins = backtestReport([trade(1, 2), trade(2, 1)]);
    expect(allWins.profitFactor).toBeNull();
    expect(allWins.checks.find((c) => c.id === 'profitFactor')?.passed).toBe(true);
  });
});

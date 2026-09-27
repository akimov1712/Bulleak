import { describe, expect, it } from 'vitest';
import { quantile, runMonteCarlo, type MonteCarloInput } from './monteCarlo';

const base: MonteCarloInput = { winrate: 0.45, rr: 2, riskPct: 1, trades: 100, runs: 200, seed: 7 };

describe('runMonteCarlo', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = runMonteCarlo(base);
    const b = runMonteCarlo(base);
    const c = runMonteCarlo({ ...base, seed: 8 });
    expect(a).toEqual(b);
    expect(a?.runs[0]?.curve).not.toEqual(c?.runs[0]?.curve);
  });

  it('produces curves of trades + 1 points that start at 1 and move by the risk', () => {
    const r = runMonteCarlo({ ...base, runs: 3, trades: 10 });
    for (const run of r?.runs ?? []) {
      expect(run.curve).toHaveLength(11);
      expect(run.curve[0]).toBe(1);
      const step = (run.curve[1] ?? 0) / (run.curve[0] ?? 1);
      expect([1.02, 0.99].some((x) => Math.abs(x - step) < 1e-12)).toBe(true);
    }
  });

  it('m09-l04: W 45%, RR 2 over 100 trades — long losing streaks are normal', () => {
    const r = runMonteCarlo(base);
    expect(r?.medianFinalPct).toBeGreaterThan(0);
    expect(r?.streakP50).toBeGreaterThanOrEqual(5);
    expect(r?.streakP90).toBeGreaterThanOrEqual(r?.streakP50 ?? 0);
    expect(r?.drawdownP90).toBeGreaterThanOrEqual(r?.drawdownP50 ?? 0);
    expect(r?.losingShare).toBeGreaterThanOrEqual(0);
  });

  it('extremes and invalid input', () => {
    expect(runMonteCarlo({ ...base, winrate: 0, runs: 1 })?.runs[0]?.maxLosingStreak).toBe(100);
    expect(runMonteCarlo({ ...base, winrate: 1, runs: 1 })?.runs[0]?.maxDrawdownPct).toBe(0);
    expect(runMonteCarlo({ ...base, winrate: 1.5 })).toBeNull();
    expect(runMonteCarlo({ ...base, trades: 0 })).toBeNull();
    expect(runMonteCarlo({ ...base, runs: 10_000 })).toBeNull();
    expect(runMonteCarlo({ ...base, riskPct: 100 })).toBeNull();
  });

  it('quantile uses the nearest rank', () => {
    expect(quantile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(quantile([], 0.5)).toBeNaN();
  });
});

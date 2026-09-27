import { describe, expect, it } from 'vitest';
import { drawdownAfterLosses, longestRun, recoveryPct, streakProbability } from './drawdown';
import { expectancyProjection } from './rr';

describe('drawdown math (m09-l01, m09-l04)', () => {
  it('recovery after a drawdown: 50% → 100%, 20% → 25%', () => {
    expect(recoveryPct(50)).toBeCloseTo(100);
    expect(recoveryPct(20)).toBeCloseTo(25);
    expect(recoveryPct(0)).toBe(0);
    expect(recoveryPct(100)).toBeNull();
    expect(recoveryPct(-5)).toBeNull();
  });

  it('10 losses in a row at 2% (compounding) → ≈ 18.3%', () => {
    expect(drawdownAfterLosses(10, 2)).toBeCloseTo(18.29, 1);
    expect(drawdownAfterLosses(0, 2)).toBe(0);
    expect(drawdownAfterLosses(1.5, 2)).toBeNull();
  });

  it('five losses in a row at a 55% loss chance ≈ 5%', () => {
    expect(streakProbability(0.55, 5)).toBeCloseTo(0.0503, 3);
    expect(streakProbability(1.2, 5)).toBeNull();
  });

  it('longest run of equal flags', () => {
    expect(longestRun([true, false, false, true, false, false, false], false)).toBe(3);
    expect(longestRun([true, true, false], true)).toBe(2);
    expect(longestRun([], true)).toBe(0);
  });
});

describe('expectancyProjection', () => {
  it('W 40%, +2R / −1R, 20 trades at 1% → 0.2R a trade, 4R ≈ 4% a month', () => {
    const p = expectancyProjection(0.4, 2, 1, 20, 1);
    expect(p?.perTradeR).toBeCloseTo(0.2);
    expect(p?.monthR).toBeCloseTo(4);
    expect(p?.monthPct).toBeCloseTo(4);
    expect(expectancyProjection(0.4, 2, 1, 2.5, 1)).toBeNull();
    expect(expectancyProjection(0.4, 2, 1, 20, 0)).toBeNull();
  });
});

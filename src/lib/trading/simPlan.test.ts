import { describe, expect, it } from 'vitest';
import { defaultLevels, planTrade, roundToTick, type PlanInput } from './simPlan';

const base: PlanInput = {
  side: 'long',
  entry: 60_000,
  sl: 59_000,
  tp: 62_000,
  riskPct: 1,
  balance: 10_000,
  leverage: 1,
  symbol: 'BTCUSDT',
  feePct: 0,
};

describe('planTrade', () => {
  it('sizes the position from the risk and reports R:R', () => {
    const plan = planTrade(base);
    expect(plan.error).toBeNull();
    expect(plan.qty).toBeCloseTo(0.1);
    expect(plan.riskUsd).toBeCloseTo(100);
    expect(plan.rewardUsd).toBeCloseTo(200);
    expect(plan.rr).toBeCloseTo(2);
    expect(plan.notional).toBeCloseTo(6000);
    expect(plan.liquidation).toBeNull();
    expect(plan.warnings).toEqual([]);
  });

  it('refuses missing or wrong-side levels', () => {
    expect(planTrade({ ...base, sl: null }).error).toBe('levels');
    expect(planTrade({ ...base, sl: 61_000 }).error).toBe('sl-side');
    expect(planTrade({ ...base, tp: 59_500 }).error).toBe('tp-side');
    expect(planTrade({ ...base, side: 'short' }).error).toBe('sl-side');
  });

  it('refuses a position that rounds to zero or needs more margin than the balance', () => {
    expect(planTrade({ ...base, balance: 5 }).error).toBe('qty');
    // 1% risk with a 0.1% stop → $100 000 position on a $10 000 balance without leverage.
    const tight = { ...base, sl: 59_940, tp: 60_200 };
    expect(planTrade(tight).error).toBe('margin');
    expect(planTrade({ ...tight, leverage: 20 }).error).toBeNull();
  });

  it('warns when the liquidation comes before the stop and when R:R is below 1', () => {
    const risky = planTrade({ ...base, sl: 54_000, tp: 64_000, leverage: 20 });
    expect(risky.liquidation).toBeLessThan(60_000);
    expect(risky.warnings).toContain('liq-before-stop');
    expect(risky.warnings).toContain('rr-below-1');
    expect(planTrade({ ...base, leverage: 5 }).warnings).toEqual([]);
  });

  it('adds reference fees on entry and at the stop', () => {
    const plan = planTrade({ ...base, feePct: 0.055 });
    // 0.1 × 60 000 × 0.055% + 0.1 × 59 000 × 0.055%
    expect(plan.fees).toBeCloseTo(3.3 + 3.245);
  });
});

describe('defaultLevels', () => {
  it('puts the stop 1.5 ATR away and the target 3 ATR away, on the tick grid', () => {
    expect(defaultLevels('long', 60_000, 400, 0.1)).toEqual({ sl: 59_400, tp: 61_200 });
    expect(defaultLevels('short', 100, 2, 0.01)).toEqual({ sl: 103, tp: 94 });
    expect(defaultLevels('long', 100, null, 0.01)).toEqual({ sl: 98.5, tp: 103 });
  });

  it('roundToTick snaps to the nearest tick', () => {
    expect(roundToTick(60_000.06, 0.1)).toBe(60_000.1);
    expect(roundToTick(1.234, 0.01)).toBe(1.23);
  });
});

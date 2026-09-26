import { describe, expect, it } from 'vitest';
import {
  marginFor,
  notionalFromStopPct,
  positionSize,
  roundToStep,
  stepDecimals,
} from './position';
import {
  bankruptcyPrice,
  BTCUSDT_MMR_PCT,
  liquidationDistancePct,
  liquidationPrice,
  stopBeyondLiquidation,
} from './liquidation';
import { movePct, pnl, roePct } from './pnl';
import { breakevenWinrate, expectancy, riskReward, rMultiple } from './rr';

// Expected values come from the numeric questions in the lesson briefs (docs/03-content).

describe('position sizing', () => {
  it('m09-l02: $1000, 1%, entry 60 000, stop 59 000 → 0.01 BTC', () => {
    const p = positionSize({ balance: 1000, riskPct: 1, entry: 60_000, stop: 59_000 });
    expect(p?.qty).toBeCloseTo(0.01);
    expect(p?.riskUsd).toBeCloseTo(10);
    expect(p?.notional).toBeCloseTo(600);
    expect(p?.stopDistancePct).toBeCloseTo(1.667, 2);
  });

  it('m09-l02: $5000, 1%, ETH 3000 → 2900 → 0.5 ETH = 1500 USDT; margin at 5x', () => {
    const p = positionSize({ balance: 5000, riskPct: 1, entry: 3000, stop: 2900, leverage: 5 });
    expect(p?.qty).toBeCloseTo(0.5);
    expect(p?.notional).toBeCloseTo(1500);
    expect(p?.margin).toBeCloseTo(300);
  });

  it('works for shorts (stop above entry) and rounds qty down to the step', () => {
    const p = positionSize({
      balance: 1370,
      riskPct: 1,
      entry: 60_000,
      stop: 61_000,
      qtyStep: 0.001,
    });
    expect(p?.qty).toBe(0.013);
    expect(p?.riskUsd).toBeCloseTo(13);
  });

  it('m09-l02: step 0.001, 0.0137 → 0.013; exact multiples keep their step', () => {
    expect(roundToStep(0.0137, 0.001)).toBe(0.013);
    expect(roundToStep(0.013, 0.001)).toBe(0.013);
    expect(roundToStep(0.3, 0.1)).toBe(0.3);
    expect(roundToStep(7, 1)).toBe(7);
    expect(roundToStep(1, 0)).toBeNull();
    expect(stepDecimals(1e-7)).toBe(7);
    expect(stepDecimals(0.01)).toBe(2);
  });

  it('m08-l03: $1000, 1% risk, 2% stop → $500 position; $3000 at 3x → $1000 margin', () => {
    expect(notionalFromStopPct(1000, 1, 2)).toBeCloseTo(500);
    expect(marginFor(3000, 3)).toBeCloseTo(1000);
  });

  it('returns null instead of NaN/Infinity on bad input', () => {
    const base = { balance: 1000, riskPct: 1, entry: 100, stop: 90 };
    expect(positionSize({ ...base, stop: 100 })).toBeNull();
    expect(positionSize({ ...base, balance: -1 })).toBeNull();
    expect(positionSize({ ...base, riskPct: 0 })).toBeNull();
    expect(positionSize({ ...base, riskPct: 101 })).toBeNull();
    expect(positionSize({ ...base, entry: Number.NaN })).toBeNull();
    expect(positionSize({ ...base, leverage: 0 })).toBeNull();
    expect(positionSize({ ...base, qtyStep: -1 })).toBeNull();
    expect(notionalFromStopPct(1000, 1, 0)).toBeNull();
    expect(marginFor(100, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('liquidation (isolated, linear)', () => {
  it('m08-l04: long 60 000 at 10x, MMR 0.5% → 54 300', () => {
    const liq = liquidationPrice({ side: 'long', entry: 60_000, leverage: 10, mmrPct: 0.5 });
    expect(liq).toBeCloseTo(54_300);
  });

  it('m08-l04: at 20x the liquidation is ≈ 4.5% away', () => {
    const liq = liquidationPrice({
      side: 'long',
      entry: 60_000,
      leverage: 20,
      mmrPct: BTCUSDT_MMR_PCT,
    });
    expect(liquidationDistancePct(60_000, liq ?? 0)).toBeCloseTo(4.5);
  });

  it('short mirrors long', () => {
    expect(
      liquidationPrice({ side: 'short', entry: 60_000, leverage: 10, mmrPct: 0.5 }),
    ).toBeCloseTo(65_700);
    expect(bankruptcyPrice('short', 60_000, 10)).toBeCloseTo(66_000);
  });

  it('the estimated closing fee (at the bankruptcy price) moves liquidation closer', () => {
    // bankruptcy 54 000; maintenance 300 + 54 000 × 0.055% = 329.7
    const liq = liquidationPrice({
      side: 'long',
      entry: 60_000,
      leverage: 10,
      mmrPct: 0.5,
      closeFeePct: 0.055,
    });
    expect(liq).toBeCloseTo(54_329.7);
  });

  it('flags a stop behind the liquidation price', () => {
    expect(stopBeyondLiquidation('long', 54_000, 54_300)).toBe(true);
    expect(stopBeyondLiquidation('long', 58_000, 54_300)).toBe(false);
    expect(stopBeyondLiquidation('short', 66_000, 65_700)).toBe(true);
  });

  it('returns null on bad input or when margin is below maintenance from the start', () => {
    const base = { side: 'long' as const, entry: 100, leverage: 10, mmrPct: 0.5 };
    expect(liquidationPrice({ ...base, leverage: 0.5 })).toBeNull();
    expect(liquidationPrice({ ...base, entry: 0 })).toBeNull();
    expect(liquidationPrice({ ...base, mmrPct: -1 })).toBeNull();
    expect(liquidationPrice({ ...base, leverage: 200 })).toBeNull();
    expect(liquidationDistancePct(0, 10)).toBeNull();
  });
});

describe('P&L', () => {
  it('m08-l02 examples', () => {
    expect(pnl('long', 60_000, 63_000, 0.1)).toBeCloseTo(300);
    expect(pnl('short', 3000, 2800, 2)).toBeCloseTo(400);
    expect(pnl('short', 150, 165, 1)).toBeCloseTo(-15);
  });

  it('move and ROE scale with leverage', () => {
    expect(movePct('short', 100, 90)).toBeCloseTo(10);
    expect(roePct('long', 100, 102, 10)).toBeCloseTo(20);
    expect(roePct('long', 100, 102, 0)).toBeNull();
    expect(pnl('long', 100, 110, 0)).toBeNull();
  });
});

describe('risk / reward', () => {
  it('computes R:R and rejects levels on the wrong side', () => {
    expect(riskReward('long', 100, 95, 115)?.rr).toBeCloseTo(3);
    expect(riskReward('short', 100, 104, 92)?.rr).toBeCloseTo(2);
    expect(riskReward('long', 100, 105, 115)).toBeNull();
    expect(riskReward('short', 100, 104, 108)).toBeNull();
  });

  it('m09-l03: 1:3 needs 25% to break even; W 40%, +2R/−1R → E 0.2; $150 / $50 → 3R', () => {
    expect(breakevenWinrate(3)).toBeCloseTo(0.25);
    expect(expectancy(0.4, 2, 1)).toBeCloseTo(0.2);
    expect(rMultiple(150, 50)).toBeCloseTo(3);
  });

  it('returns null on bad input', () => {
    expect(breakevenWinrate(0)).toBeNull();
    expect(expectancy(1.2, 2, 1)).toBeNull();
    expect(expectancy(0.5, -1, 1)).toBeNull();
    expect(rMultiple(10, 0)).toBeNull();
  });
});

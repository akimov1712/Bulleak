import { describe, expect, it } from 'vitest';
import type { SimTrade } from '@/types/trading';
import { behaviourBySkill, checkTrade, plannedRr } from './behaviour';

const MIN = 60_000;
const DAY = 86_400_000;
// Noon local time, so a few minutes either way stay on the same calendar day.
const T0 = new Date(2026, 10, 11, 12, 0).getTime();

const trade = (patch: Partial<SimTrade>): SimTrade => ({
  at: T0,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 0,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 1000,
  qty: 2,
  exitPrice: 110,
  exitIndex: 5,
  outcome: 'tp',
  pnl: 20,
  r: 2,
  fees: 0,
  ...patch,
});
const loss = (patch: Partial<SimTrade>) => trade({ outcome: 'sl', pnl: -10, r: -1, ...patch });

describe('checkTrade', () => {
  it('checks risk and planned R:R on every trade', () => {
    expect(checkTrade(trade({}), [])).toEqual([
      { rule: 'risk', ok: true },
      { rule: 'rr', ok: true },
    ]);
    expect(checkTrade(trade({ riskPct: 2, tp: 105 }), [])).toEqual([
      { rule: 'risk', ok: false },
      { rule: 'rr', ok: false },
    ]);
    // Exactly 1.5 R and exactly 1 % keep the rules (short side too).
    expect(checkTrade(trade({ side: 'short', entry: 100, sl: 104, tp: 94 }), [])).toEqual([
      { rule: 'risk', ok: true },
      { rule: 'rr', ok: true },
    ]);
  });

  it('applies the daily loss rule only after a loss on the same day', () => {
    const rules = (t: SimTrade, before: SimTrade[]) => checkTrade(t, before).map((c) => c.rule);
    expect(rules(trade({ at: T0 + 60 * MIN }), [trade({})])).toEqual(['risk', 'rr']);
    expect(rules(trade({ at: T0 + DAY }), [loss({})])).toEqual(['risk', 'rr']);
    const small = checkTrade(trade({ at: T0 + 60 * MIN }), [loss({ pnl: -20 })]);
    expect(small).toContainEqual({ rule: 'daily-loss', ok: true });
    const big = checkTrade(trade({ at: T0 + 90 * MIN }), [
      loss({ pnl: -20 }),
      loss({ at: T0 + 30 * MIN, pnl: -10 }),
    ]);
    expect(big).toContainEqual({ rule: 'daily-loss', ok: false });
  });

  it('flags a bigger risk right after a loss as revenge', () => {
    const before = [loss({ riskPct: 1 })];
    expect(checkTrade(trade({ at: T0 + 5 * MIN, riskPct: 2 }), before)).toContainEqual({
      rule: 'revenge',
      ok: false,
    });
    expect(checkTrade(trade({ at: T0 + 5 * MIN, riskPct: 1 }), before)).toContainEqual({
      rule: 'revenge',
      ok: true,
    });
    const later = checkTrade(trade({ at: T0 + 20 * MIN, riskPct: 2 }), before);
    expect(later.map((c) => c.rule)).not.toContain('revenge');
    const afterWin = checkTrade(trade({ at: T0 + 5 * MIN, riskPct: 2 }), [trade({})]);
    expect(afterWin.map((c) => c.rule)).not.toContain('revenge');
  });

  it('plannedRr is 0 with the stop on the entry', () => {
    expect(plannedRr({ entry: 100, sl: 100, tp: 110 })).toBe(0);
    expect(plannedRr({ entry: 100, sl: 95, tp: 110 })).toBe(2);
  });
});

describe('behaviourBySkill', () => {
  it('has no data without trades', () => {
    expect(behaviourBySkill([], T0).size).toBe(0);
  });

  it('is the Beta mean of kept rules, mapped to skills', () => {
    const trades = [trade({}), trade({ at: T0 + 1, riskPct: 2 }), trade({ at: T0 + 2 })];
    const b = behaviourBySkill(trades, T0 + 2);
    const risk = b.get('risk-per-trade');
    expect(risk).toMatchObject({ rule: 'risk', trades: 3, kept: 2, lastAt: T0 + 2 });
    expect(risk?.b).toBeCloseTo(3 / 5, 6);
    expect(b.get('expectancy')?.b).toBeCloseTo(4 / 5, 6);
    expect(b.has('drawdown')).toBe(false);
    expect(b.has('emotions')).toBe(false);
  });

  it('old trades weigh less than fresh ones', () => {
    const oldBad = [trade({ at: T0 - 60 * DAY, riskPct: 3 }), trade({ at: T0 })];
    const freshBad = [trade({ at: T0 - 60 * DAY }), trade({ at: T0, riskPct: 3 })];
    const b1 = behaviourBySkill(oldBad, T0).get('risk-per-trade')?.b ?? 0;
    const b2 = behaviourBySkill(freshBad, T0).get('risk-per-trade')?.b ?? 1;
    expect(b1).toBeGreaterThan(b2);
  });
});

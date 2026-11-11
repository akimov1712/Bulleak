import { describe, expect, it } from 'vitest';
import type { SimTrade } from '@/types/trading';
import { contextTips, pickTip } from './tips';

const MIN = 60_000;
const T0 = new Date(2026, 10, 11, 12).getTime();
const sim = (i: number, patch: Partial<SimTrade> = {}): SimTrade => ({
  at: T0 + i * 60 * MIN,
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

describe('contextTips', () => {
  it('nothing to say about clean trades', () => {
    expect(
      contextTips(
        [0, 1, 2, 3, 4, 5].map((i) => sim(i)),
        [],
      ),
    ).toEqual([]);
  });

  it('notices a stop moved away twice', () => {
    const moved = { actions: [{ index: 1, kind: 'move-sl' as const, price: 90 }] };
    const tips = contextTips([sim(0, moved), sim(1), sim(2, moved)], []);
    expect(tips).toEqual([{ id: 'stop-moved', count: 2, of: 3 }]);
  });

  it('notices revenge trades and a low planned R:R', () => {
    const trades = [
      sim(0, { pnl: -10, r: -1, tp: 104 }),
      { ...sim(0, { riskPct: 2, tp: 104 }), at: T0 + 5 * MIN, pnl: -20, r: -1 },
      { ...sim(0, { riskPct: 3, tp: 104 }), at: T0 + 10 * MIN },
      sim(3, { tp: 104 }),
      sim(4, { tp: 104 }),
    ];
    expect(contextTips(trades, []).map((t) => t.id)).toEqual(['revenge', 'low-rr']);
  });

  it('adds a misconception from the learner model', () => {
    expect(contextTips([], ['leverage-liquidation'])).toEqual([
      { id: 'misconception', skill: 'leverage-liquidation' },
    ]);
  });
});

describe('pickTip', () => {
  it('skips snoozed tips', () => {
    const tips = contextTips([], ['a']);
    expect(pickTip(tips, {}, 10)).toEqual(tips[0]);
    expect(pickTip(tips, { misconception: 20 }, 10)).toBeNull();
    expect(pickTip(tips, { misconception: 5 }, 10)).toEqual(tips[0]);
  });
});

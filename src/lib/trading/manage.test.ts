import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import { canMoveLevel, closePart, finalLevels, moveLevel, stopMovedAway } from './manage';
import { closeManually, startTrade, stepTrade, type SimOrder } from './simulate';

const candle = (o: number, h: number, l: number, c: number): Candle => ({ t: 0, o, h, l, c, v: 1 });
// No fees: easy numbers.
const order: SimOrder = { side: 'long', entry: 100, sl: 90, tp: 130, qty: 2, feePct: 0 };

describe('canMoveLevel / moveLevel', () => {
  it('keeps each level on its side of the last close', () => {
    expect(canMoveLevel('long', 'sl', 105, 110)).toBe(true);
    expect(canMoveLevel('long', 'sl', 115, 110)).toBe(false);
    expect(canMoveLevel('long', 'tp', 105, 110)).toBe(false);
    expect(canMoveLevel('short', 'sl', 115, 110)).toBe(true);
    expect(canMoveLevel('short', 'tp', 100, 110)).toBe(true);
    expect(canMoveLevel('long', 'sl', 0, 110)).toBe(false);
    expect(moveLevel(order, 'sl', 105, 110)).toEqual({ ...order, sl: 105 });
    expect(moveLevel(order, 'sl', 115, 110)).toBeNull();
  });
});

describe('closePart', () => {
  const candles = [
    candle(100, 100, 100, 100),
    candle(100, 112, 99, 110),
    candle(110, 131, 109, 125),
  ];

  it('books half at the last close; the rest runs on; R stays against the planned risk', () => {
    let state = stepTrade(candles, 0, order, startTrade(0, 20));
    const part = closePart(candles, order, state);
    expect(part?.order.qty).toBe(1);
    expect(part?.state.partial).toEqual({ qty: 1, grossPnl: 10, fees: 0 });
    state = stepTrade(candles, 0, part?.order ?? order, part?.state ?? state);
    // TP 130: half +10, half +30 → +40 on a planned risk of 20 → 2R.
    expect(state.result).toMatchObject({ outcome: 'tp', pnl: 40, r: 2 });
  });

  it('works once, and not after the exit', () => {
    const state = stepTrade(candles, 0, order, startTrade(0));
    const part = closePart(candles, order, state);
    expect(part?.state.plannedRisk).toBe(20);
    expect(part && closePart(candles, part.order, part.state)).toBeNull();
    expect(closePart(candles, order, closeManually(candles, order, state))).toBeNull();
  });

  it('R uses the planned risk after the stop was moved', () => {
    // Stop pulled to 95 (not hit by the 99 low): manual exit at 110 is +20 on a planned 20 → 1R,
    // not 2R as the new stop distance would say.
    const moved = { ...order, sl: 95 };
    const state = stepTrade(candles, 0, moved, startTrade(0, 20));
    expect(closeManually(candles, moved, state).result?.r).toBeCloseTo(1, 10);
  });
});

describe('stopMovedAway', () => {
  it('finds a stop moved further from the price, also after a tightened one', () => {
    const t = { side: 'long' as const, sl: 90 };
    expect(stopMovedAway(t)).toBeUndefined();
    expect(stopMovedAway({ ...t, actions: [] })).toBe(false);
    expect(stopMovedAway({ ...t, actions: [{ index: 1, kind: 'move-sl', price: 95 }] })).toBe(
      false,
    );
    expect(
      stopMovedAway({
        ...t,
        actions: [
          { index: 1, kind: 'move-sl', price: 95 },
          { index: 2, kind: 'move-sl', price: 92 },
        ],
      }),
    ).toBe(true);
    expect(
      stopMovedAway({
        side: 'short',
        sl: 110,
        actions: [{ index: 1, kind: 'move-sl', price: 115 }],
      }),
    ).toBe(true);
  });
});

describe('finalLevels', () => {
  it('applies the moves in order', () => {
    expect(
      finalLevels({
        sl: 90,
        tp: 130,
        actions: [
          { index: 1, kind: 'move-sl', price: 95 },
          { index: 2, kind: 'partial', price: 110 },
          { index: 3, kind: 'move-sl', price: 100 },
          { index: 3, kind: 'move-tp', price: 140 },
        ],
      }),
    ).toEqual({ sl: 100, tp: 140 });
    expect(finalLevels({ sl: 90, tp: 130 })).toEqual({ sl: 90, tp: 130 });
  });
});

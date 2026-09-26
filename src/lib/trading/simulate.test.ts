import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import {
  checkCandle,
  closeManually,
  simulateTrade,
  startTrade,
  stepTrade,
  validateOrder,
  type SimOrder,
} from './simulate';

const k = (o: number, h: number, l: number, c: number, t = 0): Candle => ({ t, o, h, l, c, v: 1 });
/** Candle 0 is the entry candle (closes at 100). */
const series = (...rest: Candle[]) => [k(100, 100, 100, 100), ...rest];
const flat = k(100, 101, 99, 100);

const long: SimOrder = { side: 'long', entry: 100, sl: 95, tp: 110, qty: 2, feePct: 0 };
const short: SimOrder = { side: 'short', entry: 100, sl: 105, tp: 90, qty: 2, feePct: 0 };

describe('validateOrder', () => {
  it('accepts well-placed levels', () => {
    expect(validateOrder(long)).toBeNull();
    expect(validateOrder(short)).toBeNull();
  });

  it('rejects stops and takes on the wrong side, bad qty and prices', () => {
    expect(validateOrder({ ...long, sl: 101 })).toBe('sl-side');
    expect(validateOrder({ ...long, tp: 99 })).toBe('tp-side');
    expect(validateOrder({ ...short, sl: 99 })).toBe('sl-side');
    expect(validateOrder({ ...short, tp: 101 })).toBe('tp-side');
    expect(validateOrder({ ...long, qty: 0 })).toBe('qty');
    expect(validateOrder({ ...long, entry: Number.NaN })).toBe('price');
    expect(validateOrder({ ...long, feePct: -1 })).toBe('price');
    expect(simulateTrade(series(flat), 0, { ...long, sl: 101 })).toBeNull();
  });
});

describe('simulateTrade', () => {
  it('long hits the take profit', () => {
    const r = simulateTrade(series(flat, k(100, 111, 99, 108)), 0, long);
    expect(r).toMatchObject({ outcome: 'tp', exitIndex: 2, exitPrice: 110, pnl: 20, r: 2 });
    expect(r?.ambiguous).toBe(false);
  });

  it('long hits the stop loss', () => {
    const r = simulateTrade(series(k(100, 102, 94, 96)), 0, long);
    expect(r).toMatchObject({ outcome: 'sl', exitIndex: 1, exitPrice: 95, pnl: -10, r: -1 });
  });

  it('both levels in one candle → stop, flagged ambiguous', () => {
    const r = simulateTrade(series(k(100, 112, 94, 105)), 0, long);
    expect(r).toMatchObject({ outcome: 'sl', exitPrice: 95, ambiguous: true, gap: false });
  });

  it('a gap through the stop fills at the open (worse than the stop)', () => {
    const r = simulateTrade(series(k(92, 93, 90, 91)), 0, long);
    expect(r).toMatchObject({ outcome: 'sl', exitPrice: 92, gap: true, pnl: -16 });
    expect(r?.r).toBeCloseTo(-1.6);
  });

  it('a gap through the take profit fills at the open', () => {
    const r = simulateTrade(series(k(113, 114, 94, 100)), 0, long);
    expect(r).toMatchObject({ outcome: 'tp', exitPrice: 113, gap: true, ambiguous: false });
  });

  it('short mirrors long', () => {
    expect(simulateTrade(series(k(100, 101, 89, 92)), 0, short)).toMatchObject({
      outcome: 'tp',
      exitPrice: 90,
      pnl: 20,
      r: 2,
    });
    expect(simulateTrade(series(k(100, 106, 99, 104)), 0, short)).toMatchObject({
      outcome: 'sl',
      exitPrice: 105,
      r: -1,
    });
    expect(simulateTrade(series(k(107, 108, 106, 107)), 0, short)).toMatchObject({
      outcome: 'sl',
      exitPrice: 107,
      gap: true,
    });
  });

  it('times out after maxBars at the close', () => {
    const candles = series(flat, flat, k(100, 101, 99, 103), flat);
    const r = simulateTrade(candles, 0, long, 3);
    expect(r).toMatchObject({ outcome: 'timeout', exitIndex: 3, exitPrice: 103, pnl: 6 });
  });

  it('times out when the data ends', () => {
    const r = simulateTrade(series(flat, k(100, 101, 99, 102)), 0, long);
    expect(r).toMatchObject({ outcome: 'timeout', exitIndex: 2, exitPrice: 102 });
  });

  it('charges taker fees on entry and exit and counts them in R', () => {
    // 2 × 100 × 0.055% + 2 × 110 × 0.055% = 0.11 + 0.121
    const r = simulateTrade(series(k(100, 111, 99, 108)), 0, { ...long, feePct: 0.055 });
    expect(r?.fees).toBeCloseTo(0.231);
    expect(r?.grossPnl).toBeCloseTo(20);
    expect(r?.pnl).toBeCloseTo(19.769);
    expect(r?.r).toBeCloseTo(1.9769);
    // Default fee is the Bybit perpetual taker rate.
    const d = simulateTrade(series(k(100, 111, 99, 108)), 0, { ...long, feePct: undefined });
    expect(d?.fees).toBeCloseTo(0.231);
  });

  it('starts after the entry candle and refuses a start with nothing to replay', () => {
    const candles = [k(100, 200, 1, 100), k(100, 101, 99, 100), k(100, 111, 99, 100)];
    expect(simulateTrade(candles, 1, long)).toMatchObject({ outcome: 'tp', exitIndex: 2 });
    expect(simulateTrade(candles, 2, long)).toBeNull();
    expect(simulateTrade(candles, -1, long)).toBeNull();
    expect(simulateTrade(candles, 0, long, 0)).toBeNull();
  });
});

describe('step-by-step replay', () => {
  it('matches simulateTrade and stops changing once closed', () => {
    const candles = series(flat, flat, k(100, 111, 99, 108), flat);
    let state = startTrade(0);
    const seen: number[] = [];
    while (!state.result) {
      state = stepTrade(candles, 0, long, state);
      seen.push(state.index);
    }
    expect(seen).toEqual([1, 2, 3]);
    expect(state.result).toEqual(simulateTrade(candles, 0, long));
    expect(stepTrade(candles, 0, long, state)).toBe(state);
  });

  it('manual close exits at the close of the last shown candle', () => {
    const candles = series(k(100, 103, 99, 102), flat);
    const state = stepTrade(candles, 0, long, startTrade(0));
    const closed = closeManually(candles, long, state);
    expect(closed.result).toMatchObject({
      outcome: 'manual',
      exitIndex: 1,
      exitPrice: 102,
      pnl: 4,
    });
    expect(closeManually(candles, long, closed)).toBe(closed);
  });

  it('checkCandle returns null while the price stays between the levels', () => {
    expect(checkCandle(long, flat)).toBeNull();
    expect(checkCandle(short, flat)).toBeNull();
  });
});

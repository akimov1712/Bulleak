import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import { atr, bollinger, ema, macd, rsi, sma, trueRange, volumeRatio } from './indicators';
import { detectEngulfing, detectInsideBars, detectPinBars, findSwings } from './patterns';

const k = (o: number, h: number, l: number, c: number, t = 0): Candle => ({ t, o, h, l, c, v: 1 });

describe('sma / ema', () => {
  it('sma averages the last n values', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(sma([1, 2], 3)).toEqual([null, null]);
    expect(sma([1, 2], 0)).toEqual([null, null]);
  });

  it('ema is seeded with the sma and weights recent values', () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(2);
    expect(out[3]).toBeCloseTo(3); // 4*0.5 + 2*0.5
    expect(out[4]).toBeCloseTo(4);
    expect(ema([1, 2], 3)).toEqual([null, null]);
  });
});

describe('rsi (Wilder)', () => {
  // Classic StockCharts example.
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28,
    46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
  ];

  it('matches reference values', () => {
    const out = rsi(closes, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    const expected = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97];
    // StockCharts rounds intermediate averages, so allow a small drift.
    expected.forEach((value, i) => expect(Math.abs((out[14 + i] ?? 0) - value)).toBeLessThan(0.15));
  });

  it('is 100 for only gains, 50 for a flat series, in range otherwise', () => {
    expect(rsi([1, 2, 3, 4, 5], 3)[3]).toBe(100);
    expect(rsi([5, 5, 5, 5, 5], 3)[4]).toBe(50);
    expect(rsi([1, 2], 14).every((v) => v === null)).toBe(true);
    for (const v of rsi(closes, 5)) if (v !== null) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('macd', () => {
  it('line = ema12 − ema26, signal = ema9 of the line, histogram = difference', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 4) * 5 + i * 0.3);
    const { macd: line, signal, histogram } = macd(closes);
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    expect(line[24]).toBeNull();
    expect(line[25]).toBeCloseTo((e12[25] ?? 0) - (e26[25] ?? 0));
    expect(signal[32]).toBeNull();
    expect(signal[33]).not.toBeNull();
    expect(histogram[40]).toBeCloseTo((line[40] ?? 0) - (signal[40] ?? 0));
  });
});

describe('bollinger', () => {
  it('bands are ±2 population standard deviations around the sma', () => {
    const { middle, upper, lower, width } = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(middle[7]).toBe(5);
    expect(upper[7]).toBe(9); // sd = 2
    expect(lower[7]).toBe(1);
    expect(width[7]).toBeCloseTo(8 / 5);
    expect(upper[6]).toBeNull();
  });
});

describe('true range / atr', () => {
  const candles = [k(10, 12, 9, 11), k(11, 13, 10, 12), k(12, 12, 8, 9), k(9, 15, 9, 14)];
  it('true range includes gaps from the previous close', () => {
    expect(trueRange(candles)).toEqual([3, 3, 4, 6]);
    expect(trueRange([k(10, 12, 11, 11), k(20, 21, 19, 20)])).toEqual([1, 10]);
  });
  it('atr uses Wilder smoothing', () => {
    const out = atr(candles, 2);
    expect(out[0]).toBeNull();
    expect(out[1]).toBe(3);
    expect(out[2]).toBe(3.5);
    expect(out[3]).toBe(4.75);
    expect(atr(candles, 10).every((v) => v === null)).toBe(true);
  });
});

describe('patterns', () => {
  it('finds fractal swing highs and lows', () => {
    const highs = [1, 2, 5, 3, 2, 4, 6, 4, 3];
    const candles = highs.map((h, i) => k(h - 0.5, h, h - 1, h - 0.5, i));
    const swings = findSwings(candles, 2);
    expect(swings.filter((s) => s.kind === 'high').map((s) => s.index)).toEqual([2, 6]);
    expect(swings.filter((s) => s.kind === 'low').map((s) => s.index)).toEqual([4]);
  });

  it('detects bullish and bearish pin bars', () => {
    const hits = detectPinBars([k(10, 10.5, 6, 10.2), k(10, 14, 9.8, 10.1), k(10, 11, 9, 10.5)]);
    expect(hits).toEqual([
      { index: 0, direction: 'bullish' },
      { index: 1, direction: 'bearish' },
    ]);
    expect(detectPinBars([k(1, 1, 1, 1)])).toEqual([]);
  });

  it('detects engulfing and inside bars', () => {
    const candles = [k(10, 10.5, 8.5, 9), k(8.8, 11, 8.7, 10.8), k(10.5, 10.7, 9.5, 10)];
    expect(detectEngulfing(candles)).toEqual([{ index: 1, direction: 'bullish' }]);
    expect(detectInsideBars(candles)).toEqual([2]);
    expect(detectEngulfing([k(9, 11, 8, 10.5), k(10.6, 10.8, 8.5, 8.9)])).toEqual([
      { index: 1, direction: 'bearish' },
    ]);
  });
});

describe('volumeRatio', () => {
  it('compares each volume with the average of the previous candles', () => {
    const out = volumeRatio([10, 10, 10, 10, 50, 10], 4);
    expect(out.slice(0, 4)).toEqual([null, null, null, null]);
    expect(out[4]).toBe(5); // 50 / avg(10,10,10,10)
    expect(out[5]).toBe(0.5); // 10 / avg(10,10,10,50)
    expect(volumeRatio([0, 0, 5], 2)[2]).toBeNull();
  });
});

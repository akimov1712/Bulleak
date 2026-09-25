/** Swing points and candle patterns used in lessons, quizzes and the simulator. */
import type { Candle } from '@/types/trading';

export interface Swing {
  index: number;
  kind: 'high' | 'low';
  price: number;
}

/**
 * Fractal swings: a swing high has `n` candles on each side with lower highs
 * (ties on the right are allowed so flat tops are marked once, at the first candle).
 */
export function findSwings(candles: readonly Candle[], n = 2): Swing[] {
  const swings: Swing[] = [];
  for (let i = n; i < candles.length - n; i++) {
    const c = candles[i];
    if (!c) continue;
    let isHigh = true;
    let isLow = true;
    for (let k = 1; k <= n; k++) {
      const left = candles[i - k];
      const right = candles[i + k];
      if (!left || !right) {
        isHigh = false;
        isLow = false;
        break;
      }
      if (!(c.h > left.h && c.h >= right.h)) isHigh = false;
      if (!(c.l < left.l && c.l <= right.l)) isLow = false;
    }
    if (isHigh) swings.push({ index: i, kind: 'high', price: c.h });
    if (isLow) swings.push({ index: i, kind: 'low', price: c.l });
  }
  return swings;
}

export type Direction = 'bullish' | 'bearish';
export interface PatternHit {
  index: number;
  direction: Direction;
}

const body = (c: Candle) => Math.abs(c.c - c.o);
const range = (c: Candle) => c.h - c.l;

/**
 * Pin bar: the rejection wick is ≥ `minWickRatio` × body and ≥ 60% of the range,
 * and the close sits in the opposite third of the candle.
 */
export function detectPinBars(candles: readonly Candle[], minWickRatio = 2): PatternHit[] {
  const hits: PatternHit[] = [];
  candles.forEach((c, index) => {
    const r = range(c);
    if (r <= 0) return;
    const lowerWick = Math.min(c.o, c.c) - c.l;
    const upperWick = c.h - Math.max(c.o, c.c);
    const b = Math.max(body(c), r * 0.02);
    if (lowerWick >= minWickRatio * b && lowerWick >= 0.6 * r && c.c >= c.l + (2 * r) / 3) {
      hits.push({ index, direction: 'bullish' });
    } else if (upperWick >= minWickRatio * b && upperWick >= 0.6 * r && c.c <= c.l + r / 3) {
      hits.push({ index, direction: 'bearish' });
    }
  });
  return hits;
}

/** Engulfing: the body of the candle fully covers the previous opposite-coloured body. */
export function detectEngulfing(candles: readonly Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    if (!prev || !c || body(c) <= body(prev)) continue;
    if (prev.c < prev.o && c.c > c.o && c.o <= prev.c && c.c >= prev.o) {
      hits.push({ index: i, direction: 'bullish' });
    } else if (prev.c > prev.o && c.c < c.o && c.o >= prev.c && c.c <= prev.o) {
      hits.push({ index: i, direction: 'bearish' });
    }
  }
  return hits;
}

/** Inside bar: the whole range is inside the previous candle's range. */
export function detectInsideBars(candles: readonly Candle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    if (prev && c && c.h < prev.h && c.l > prev.l) out.push(i);
  }
  return out;
}

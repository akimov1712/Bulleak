import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import { chartHints } from './chart';

const c = (i: number, mid: number): Candle => ({
  t: i,
  o: mid,
  h: mid + 1,
  l: mid - 1,
  c: mid,
  v: 1,
});

/** A zigzag that climbs: swings every 5 candles. */
function zigzag(length: number, step = 0.5): Candle[] {
  return Array.from({ length }, (_, i) => {
    const wave = [0, 2, 4, 2, 0][i % 5] ?? 0;
    return c(i, 100 + i * step + wave);
  });
}

describe('chartHints', () => {
  it('marks recent swings, an up trend and stop zones beyond the nearest swings', () => {
    const candles = zigzag(120);
    const h = chartHints(candles, 100);
    expect(h.trend).toBe('up');
    expect(h.levels.filter((l) => l.kind === 'resistance')).toHaveLength(3);
    expect(h.levels.filter((l) => l.kind === 'support')).toHaveLength(3);
    const close = candles[100]?.c ?? 0;
    expect(h.stopLong).not.toBeNull();
    expect(h.stopLong ?? Infinity).toBeLessThan(close);
  });

  it('never uses candles after the cursor', () => {
    const candles = zigzag(120);
    const changed = candles.map((x, i) => (i > 100 ? { ...x, h: 999, l: 1, c: 500 } : x));
    expect(chartHints(changed, 100)).toEqual(chartHints(candles, 100));
  });

  it('a flat market is flat; too little data has no trend', () => {
    const flat = Array.from({ length: 120 }, (_, i) => c(i, 100 + ([0, 2, 4, 2, 0][i % 5] ?? 0)));
    expect(chartHints(flat, 110).trend).toBe('flat');
    expect(chartHints(flat, 30).trend).toBeNull();
    expect(chartHints([], 0)).toEqual({ levels: [], trend: null, stopLong: null, stopShort: null });
  });
});

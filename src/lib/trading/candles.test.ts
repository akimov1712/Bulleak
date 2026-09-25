import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import {
  indexAtTime,
  INTERVAL_MS,
  isDatasetName,
  parseDataset,
  resample,
  sliceCandles,
  DATASET_INTERVALS,
  DATASET_SYMBOLS,
  type DatasetName,
} from './candles';

const H = 3_600_000;
const c = (t: number, o: number, h: number, l: number, cl: number, v = 1): Candle => ({
  t,
  o,
  h,
  l,
  c: cl,
  v,
});

describe('parseDataset', () => {
  it('converts rows and skips malformed ones', () => {
    const ds = parseDataset('BTCUSDT-60', {
      fetchedAt: 5,
      candles: [
        [0, 1, 2, 0.5, 1.5, 10],
        [H, 'x', 2, 1, 1, 1],
        [2 * H, 1, 2, 1, 1],
      ],
    });
    expect(ds).toMatchObject({ symbol: 'BTCUSDT', interval: '60', fetchedAt: 5 });
    expect(ds.candles).toEqual([{ t: 0, o: 1, h: 2, l: 0.5, c: 1.5, v: 10 }]);
  });

  it('rejects garbage', () => {
    expect(() => parseDataset('BTCUSDT-60', null)).toThrow(/формат/);
    expect(() => parseDataset('BTCUSDT-60', { candles: [] })).toThrow(/нет свечей/);
  });
});

describe('isDatasetName', () => {
  it('accepts only known symbol/interval pairs', () => {
    expect(isDatasetName('ETHUSDT-D')).toBe(true);
    expect(isDatasetName('DOGEUSDT-60')).toBe(false);
    expect(isDatasetName('BTCUSDT-15')).toBe(false);
  });
});

describe('sliceCandles / indexAtTime', () => {
  const candles = [0, 1, 2, 3, 4].map((i) => c(i * H, 1, 1, 1, 1));
  it('slices inclusively and clamps', () => {
    expect(sliceCandles(candles, 1, 3).map((x) => x.t)).toEqual([H, 2 * H, 3 * H]);
    expect(sliceCandles(candles, -5, 1)).toHaveLength(2);
    expect(sliceCandles(candles, 3, 99)).toHaveLength(2);
    expect(sliceCandles(candles, 4, 2)).toEqual([]);
  });
  it('finds the candle containing a time', () => {
    expect(indexAtTime(candles, 2 * H + 10, H)).toBe(2);
    expect(indexAtTime(candles, 5 * H, H)).toBe(-1);
    expect(indexAtTime(candles, -1, H)).toBe(-1);
  });
});

describe('resample', () => {
  it('aggregates OHLCV into UTC-aligned buckets', () => {
    const hourly = [
      c(0, 10, 12, 9, 11, 1),
      c(H, 11, 15, 10, 14, 2),
      c(2 * H, 14, 14, 8, 9, 3),
      c(3 * H, 9, 10, 9, 10, 4),
      c(4 * H, 10, 11, 10, 11, 5),
    ];
    expect(resample(hourly, 4 * H)).toEqual([
      { t: 0, o: 10, h: 15, l: 8, c: 10, v: 10 },
      { t: 4 * H, o: 10, h: 11, l: 10, c: 11, v: 5 },
    ]);
  });

  it('real data: 1H resampled to 4H matches the downloaded 4H candles', () => {
    const read = (name: DatasetName) =>
      parseDataset(
        name,
        JSON.parse(fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8')),
      );
    const hourly = read('BTCUSDT-60').candles;
    const four = read('BTCUSDT-240').candles;
    // skip the first partial bucket of the hourly series
    const resampled = resample(hourly, INTERVAL_MS['240']).slice(1, -1);
    let checked = 0;
    for (const r of resampled) {
      const idx = indexAtTime(four, r.t, INTERVAL_MS['240']);
      const f = four[idx];
      if (!f) continue;
      expect(r.o).toBe(f.o);
      expect(r.h).toBe(f.h);
      expect(r.l).toBe(f.l);
      expect(r.c).toBe(f.c);
      expect(Math.abs(r.v - f.v)).toBeLessThan(Math.max(1, f.v * 0.001));
      checked++;
    }
    expect(checked).toBeGreaterThan(500);
  });
});

describe('downloaded datasets', () => {
  it.each(DATASET_SYMBOLS.flatMap((s) => DATASET_INTERVALS.map((i) => `${s}-${i}` as DatasetName)))(
    '%s is sorted, gap-free and has sane OHLC',
    (name) => {
      const ds = parseDataset(
        name,
        JSON.parse(fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8')),
      );
      expect(ds.candles.length).toBeGreaterThan(1000);
      const step = INTERVAL_MS[ds.interval];
      ds.candles.forEach((k, i) => {
        expect(k.h).toBeGreaterThanOrEqual(Math.max(k.o, k.c));
        expect(k.l).toBeLessThanOrEqual(Math.min(k.o, k.c));
        const prev = ds.candles[i - 1];
        if (prev) expect(k.t - prev.t).toBe(step);
      });
    },
  );
});

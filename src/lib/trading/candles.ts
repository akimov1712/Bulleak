import type { Candle } from '@/types/trading';

export const DATASET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;
export const DATASET_INTERVALS = ['60', '240', 'D'] as const;
export type DatasetSymbol = (typeof DATASET_SYMBOLS)[number];
export type DatasetInterval = (typeof DATASET_INTERVALS)[number];
export type DatasetName = `${DatasetSymbol}-${DatasetInterval}`;

export const INTERVAL_MS: Record<DatasetInterval, number> = {
  '60': 3_600_000,
  '240': 14_400_000,
  D: 86_400_000,
};

export const INTERVAL_LABEL: Record<DatasetInterval, string> = { '60': '1H', '240': '4H', D: '1D' };

/** Interval part of a dataset name (e.g. 'BTCUSDT-240' → '240'). */
export function datasetInterval(name: DatasetName): DatasetInterval {
  const interval = name.slice(name.indexOf('-') + 1);
  return DATASET_INTERVALS.find((i) => i === interval) ?? 'D';
}

export function isDatasetName(name: string): name is DatasetName {
  const [symbol, interval] = name.split('-');
  return (
    (DATASET_SYMBOLS as readonly string[]).includes(symbol ?? '') &&
    (DATASET_INTERVALS as readonly string[]).includes(interval ?? '')
  );
}

export interface Dataset {
  name: DatasetName;
  symbol: DatasetSymbol;
  interval: DatasetInterval;
  fetchedAt: number;
  candles: Candle[];
}

/** Validate and convert a public/data/*.json file ({ candles: [[t,o,h,l,c,v], …] }). */
export function parseDataset(name: DatasetName, raw: unknown): Dataset {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as { candles?: unknown }).candles)
  ) {
    throw new Error(`Датасет ${name}: неверный формат`);
  }
  const data = raw as { fetchedAt?: unknown; candles: unknown[] };
  const candles: Candle[] = [];
  for (const row of data.candles) {
    if (
      !Array.isArray(row) ||
      row.length < 6 ||
      !row.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      continue;
    }
    const [t, o, h, l, c, v] = row as number[];
    if (
      t === undefined ||
      o === undefined ||
      h === undefined ||
      l === undefined ||
      c === undefined ||
      v === undefined
    )
      continue;
    candles.push({ t, o, h, l, c, v });
  }
  if (candles.length === 0) throw new Error(`Датасет ${name}: нет свечей`);
  const [symbol, interval] = name.split('-') as [DatasetSymbol, DatasetInterval];
  return {
    name,
    symbol,
    interval,
    fetchedAt: typeof data.fetchedAt === 'number' ? data.fetchedAt : 0,
    candles,
  };
}

/** Candles with indices in [from, to] (inclusive, clamped to the array). */
export function sliceCandles(candles: readonly Candle[], from: number, to: number): Candle[] {
  const start = Math.max(0, Math.floor(from));
  const end = Math.min(candles.length - 1, Math.floor(to));
  return end < start ? [] : candles.slice(start, end + 1);
}

/**
 * Aggregate candles into bigger buckets of `bucketMs` aligned to UTC epoch
 * (1H → 4H buckets start at 00/04/08… UTC, like on Bybit).
 */
export function resample(candles: readonly Candle[], bucketMs: number): Candle[] {
  const out: Candle[] = [];
  for (const c of candles) {
    const bucket = Math.floor(c.t / bucketMs) * bucketMs;
    const last = out.at(-1);
    if (last && last.t === bucket) {
      last.h = Math.max(last.h, c.h);
      last.l = Math.min(last.l, c.l);
      last.c = c.c;
      last.v += c.v;
    } else {
      out.push({ t: bucket, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v });
    }
  }
  return out;
}

/** Index of the candle containing time `t`, or -1. Candles must be sorted ascending. */
export function indexAtTime(candles: readonly Candle[], t: number, intervalMs: number): number {
  let lo = 0;
  let hi = candles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = candles[mid];
    if (!c) break;
    if (t < c.t) hi = mid - 1;
    else if (t >= c.t + intervalMs) lo = mid + 1;
    else return mid;
  }
  return -1;
}

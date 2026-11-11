/**
 * Chart markup hints in the simulator (docs/04-features/hints.md, section 2): recent swing
 * levels, the trend direction and a zone for the stop. Only candles up to `cursor` are used —
 * a swing needs `n` candles after it, so nothing from the hidden future leaks in.
 */
import type { Candle } from '@/types/trading';
import { atr, ema } from '@/lib/indicators/indicators';
import { findSwings } from '@/lib/indicators/patterns';

export type Trend = 'up' | 'down' | 'flat';

export interface HintLevel {
  index: number;
  price: number;
  kind: 'support' | 'resistance';
}

export interface ChartHints {
  /** The last three swing highs and lows. */
  levels: HintLevel[];
  /** Slope of EMA 50 over 20 candles against half an ATR; null without enough data. */
  trend: Trend | null;
  /** Beyond the nearest swing with half an ATR of room; null when there is none. */
  stopLong: number | null;
  stopShort: number | null;
}

const LEVELS_PER_SIDE = 3;
const SLOPE_BARS = 20;

export function chartHints(candles: readonly Candle[], cursor: number, n = 2): ChartHints {
  const seen = candles.slice(0, cursor + 1);
  const last = seen[seen.length - 1];
  const empty: ChartHints = { levels: [], trend: null, stopLong: null, stopShort: null };
  if (!last) return empty;
  const swings = findSwings(seen, n);
  const highs = swings.filter((s) => s.kind === 'high').slice(-LEVELS_PER_SIDE);
  const lows = swings.filter((s) => s.kind === 'low').slice(-LEVELS_PER_SIDE);
  const levels: HintLevel[] = [
    ...highs.map((s) => ({ index: s.index, price: s.price, kind: 'resistance' as const })),
    ...lows.map((s) => ({ index: s.index, price: s.price, kind: 'support' as const })),
  ];

  const ema50 = ema(
    seen.map((c) => c.c),
    50,
  );
  const a = atr(seen)[seen.length - 1] ?? null;
  const now = ema50[seen.length - 1] ?? null;
  const before = ema50[seen.length - 1 - SLOPE_BARS] ?? null;
  let trend: Trend | null = null;
  if (now !== null && before !== null && a !== null) {
    const change = now - before;
    trend = change > a / 2 ? 'up' : change < -a / 2 ? 'down' : 'flat';
  }

  const room = (a ?? 0) / 2;
  const below = swings.filter((s) => s.kind === 'low' && s.price < last.c).at(-1);
  const above = swings.filter((s) => s.kind === 'high' && s.price > last.c).at(-1);
  return {
    levels,
    trend,
    stopLong: below ? below.price - room : null,
    stopShort: above ? above.price + room : null,
  };
}

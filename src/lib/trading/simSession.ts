/**
 * Simulator session rules (simulator.md): where a blind trade starts and which candles the
 * learner may see. The chart only ever receives `visibleWindow` — candles after `cursor`
 * never leave this module before the decision is made.
 */

import type { Candle } from '@/types/trading';
import { randomInt, type Rng } from '@/lib/random';

/** Candles of history required before the start point. */
export const SIM_HISTORY = 200;
/** Candles required after the start point for the trade to play out. */
export const SIM_FUTURE = 150;
/** "Пропустить" moves this many candles forward. */
export const SIM_SKIP = 20;

/** Random start index with enough history and future; null when the dataset is too short. */
export function pickStart(length: number, rng: Rng): number | null {
  const min = SIM_HISTORY;
  const max = length - 1 - SIM_FUTURE;
  if (!Number.isInteger(length) || max < min) return null;
  return randomInt(rng, min, max);
}

/** First index shown: up to SIM_HISTORY candles ending at `cursor`. */
export const windowStart = (cursor: number) => Math.max(0, cursor - SIM_HISTORY + 1);

/** Candles the chart may show: from `windowStart(fromCursor)` up to and including `cursor`. */
export function visibleWindow(
  candles: readonly Candle[],
  fromCursor: number,
  cursor: number,
): Candle[] {
  const last = Math.min(cursor, candles.length - 1);
  return candles.slice(windowStart(fromCursor), last + 1);
}

const DAY_MS = 86_400_000;

/** One dataset of a symbol for moment selection: its candles and candle length (ms). */
export interface MomentSeries {
  candles: readonly Candle[];
  intervalMs: number;
}

/** Index of the last candle already closed at moment `t` (no look-ahead); -1 if none. */
export function lastClosedIndex(candles: readonly Candle[], t: number, intervalMs: number): number {
  let lo = 0;
  let hi = candles.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = candles[mid];
    if (!c) break;
    if (c.t + intervalMs <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/**
 * Moments (UTC midnights, ms) at which every timeframe of a symbol has SIM_HISTORY closed
 * candles behind and SIM_FUTURE ahead: on any of them 1H, 4H and 1D show the same instant.
 * Null when the datasets have no common window.
 */
export function momentRange(series: readonly MomentSeries[]): { min: number; max: number } | null {
  let min = -Infinity;
  let max = Infinity;
  for (const { candles, intervalMs } of series) {
    const first = candles[SIM_HISTORY];
    const last = candles[candles.length - 1 - SIM_FUTURE];
    if (!first || !last || candles.length - 1 - SIM_FUTURE < SIM_HISTORY) return null;
    min = Math.max(min, first.t + intervalMs);
    max = Math.min(max, last.t + intervalMs);
  }
  const from = Math.ceil(min / DAY_MS) * DAY_MS;
  const to = Math.floor(max / DAY_MS) * DAY_MS;
  return Number.isFinite(from) && from <= to ? { min: from, max: to } : null;
}

/** Random UTC midnight inside the range. */
export function pickMoment(range: { min: number; max: number }, rng: Rng): number {
  const days = Math.round((range.max - range.min) / DAY_MS);
  return range.min + randomInt(rng, 0, days) * DAY_MS;
}

/**
 * Start cursor on one timeframe for a moment: the last candle closed by then, kept inside the
 * tradeable window (enough history and future) — near the data edges the nearest valid candle.
 */
export function startAtMoment(
  candles: readonly Candle[],
  intervalMs: number,
  moment: number,
): number | null {
  const max = candles.length - 1 - SIM_FUTURE;
  if (max < SIM_HISTORY) return null;
  const index = lastClosedIndex(candles, moment, intervalMs);
  return Math.min(max, Math.max(SIM_HISTORY, index));
}

/**
 * Cursor after skipping a decision, or null when there would not be enough candles left
 * for the next trade (pick a new start then).
 */
export function skipAhead(cursor: number, length: number, bars = SIM_SKIP): number | null {
  const next = cursor + bars;
  return next <= length - 1 - SIM_FUTURE ? next : null;
}

export type PlaybackSpeed = '1' | '4';

/** Milliseconds per replayed candle for each playback speed. */
export const SPEED_MS: Record<PlaybackSpeed, number> = { '1': 600, '4': 150 };

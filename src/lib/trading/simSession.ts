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

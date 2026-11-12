/**
 * «Что дальше?» (T-2503): the learner sees history up to a hidden moment, picks what happens
 * over the next candles and how sure they are; the outcome is read from the real data.
 * Scoring is the Brier score of «my pick is right», so overconfidence costs more than doubt.
 */
import type { Candle } from '@/types/trading';
import { atr } from '@/lib/indicators/indicators';
import { randomInt, type Rng } from '@/lib/random';

export type ForecastOutcome = 'up' | 'down' | 'range';
export const FORECAST_OUTCOMES: readonly ForecastOutcome[] = ['up', 'down', 'range'];

export const OUTCOME_LABEL: Record<ForecastOutcome, string> = {
  up: 'Вырастет',
  down: 'Упадёт',
  range: 'Останется в диапазоне',
};

/** Candles after the moment that decide the outcome (12 × 4H = 2 days). */
export const FORECAST_HORIZON = 12;
/** Candles of history shown before the moment. */
export const FORECAST_HISTORY = 120;
/** «Moved» means the close went further than this many ATR(14) from the moment's close. */
export const FORECAST_ATR_MULT = 1.5;

/** Confidence choices: 40 % is a little better than a guess between three outcomes. */
export const CONFIDENCE_LEVELS = [0.4, 0.6, 0.8] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface ForecastSetup {
  /** Index of the last visible candle. */
  at: number;
  close: number;
  /** Half-width of the «range» band in price. */
  band: number;
}

/** Band around the close at `at`; null without enough history for ATR. */
export function forecastSetup(candles: readonly Candle[], at: number): ForecastSetup | null {
  const close = candles[at]?.c;
  const value = atr(candles.slice(0, at + 1), 14).at(-1);
  if (close === undefined || value === null || value === undefined || value <= 0) return null;
  return { at, close, band: value * FORECAST_ATR_MULT };
}

/** What the data shows `horizon` candles later; null when the data ends before that. */
export function forecastOutcome(
  candles: readonly Candle[],
  setup: ForecastSetup,
  horizon = FORECAST_HORIZON,
): ForecastOutcome | null {
  const later = candles[setup.at + horizon]?.c;
  if (later === undefined) return null;
  if (later > setup.close + setup.band) return 'up';
  if (later < setup.close - setup.band) return 'down';
  return 'range';
}

/** A random moment with enough history before it and the whole horizon after it. */
export function pickForecastMoment(length: number, rng: Rng): number | null {
  const min = FORECAST_HISTORY;
  const max = length - 1 - FORECAST_HORIZON;
  return max < min ? null : randomInt(rng, min, max);
}

/** Brier score of one answer (0 — perfect, 1 — sure and wrong). */
export const brier = (confidence: number, correct: boolean) =>
  (confidence - (correct ? 1 : 0)) ** 2;

export interface ForecastAttempt {
  /** Dataset and candle time: the same moment is never asked twice in a row. */
  dataset: string;
  time: number;
  pick: ForecastOutcome;
  confidence: Confidence;
  outcome: ForecastOutcome;
  at: number;
}

export interface CalibrationRow {
  confidence: Confidence;
  count: number;
  /** Share of right picks at this confidence; null without answers. */
  hitRate: number | null;
}

export interface ForecastSummary {
  count: number;
  hitRate: number | null;
  /** Mean Brier score; null without answers. */
  brier: number | null;
  /** Mean Brier of always answering with 1/3 confidence (no skill) for the same answers. */
  baseline: number | null;
  rows: CalibrationRow[];
  /** Too sure: at the highest level used enough, right much less often than claimed. */
  overconfident: boolean;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Hit rate, Brier score and calibration by confidence level. */
export function summarizeForecasts(attempts: readonly ForecastAttempt[]): ForecastSummary {
  const right = (a: ForecastAttempt) => a.pick === a.outcome;
  const rows = CONFIDENCE_LEVELS.map((confidence) => {
    const own = attempts.filter((a) => a.confidence === confidence);
    return {
      confidence,
      count: own.length,
      hitRate: own.length ? own.filter(right).length / own.length : null,
    };
  });
  const sure = rows[rows.length - 1];
  return {
    count: attempts.length,
    hitRate: attempts.length ? attempts.filter(right).length / attempts.length : null,
    brier: mean(attempts.map((a) => brier(a.confidence, right(a)))),
    baseline: mean(attempts.map((a) => brier(1 / 3, right(a)))),
    rows,
    overconfident:
      sure !== undefined &&
      sure.count >= 10 &&
      sure.hitRate !== null &&
      sure.hitRate < sure.confidence - 0.15,
  };
}

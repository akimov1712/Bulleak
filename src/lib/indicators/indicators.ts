/**
 * Technical indicators. Every function returns an array aligned with the input
 * (same length); positions without enough history are `null`.
 */
import type { Candle } from '@/types/trading';

export type Series = (number | null)[];

export function sma(values: readonly number[], period: number): Series {
  const out: Series = new Array<number | null>(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential MA seeded with the SMA of the first `period` values. */
export function ema(values: readonly number[], period: number): Series {
  const out: Series = new Array<number | null>(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = (values[i] ?? prev) * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** EMA over a series that starts with nulls (e.g. the MACD line). */
function emaOfSeries(series: Series, period: number): Series {
  const start = series.findIndex((v) => v !== null);
  const out: Series = new Array<number | null>(series.length).fill(null);
  if (start === -1) return out;
  const tail = ema(series.slice(start) as number[], period);
  tail.forEach((v, i) => {
    out[start + i] = v;
  });
  return out;
}

/** RSI with Wilder smoothing (the TradingView / Bybit default). */
export function rsi(closes: readonly number[], period = 14): Series {
  const out: Series = new Array<number | null>(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (change > 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const value = () =>
    avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
  out[period] = value();
  for (let i = period + 1; i < closes.length; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = value();
  }
  return out;
}

export interface MacdResult {
  macd: Series;
  signal: Series;
  histogram: Series;
}

export function macd(
  closes: readonly number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdResult {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const line: Series = closes.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f === null || f === undefined || s === null || s === undefined ? null : f - s;
  });
  const signal = emaOfSeries(line, signalPeriod);
  const histogram: Series = line.map((m, i) => {
    const s = signal[i];
    return m === null || s === null || s === undefined ? null : m - s;
  });
  return { macd: line, signal, histogram };
}

export interface BollingerResult {
  middle: Series;
  upper: Series;
  lower: Series;
  /** (upper − lower) / middle — small values = squeeze. */
  width: Series;
}

export function bollinger(closes: readonly number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper: Series = [];
  const lower: Series = [];
  const width: Series = [];
  for (let i = 0; i < closes.length; i++) {
    const m = middle[i];
    if (m === null || m === undefined) {
      upper.push(null);
      lower.push(null);
      width.push(null);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += ((closes[j] ?? m) - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper.push(m + mult * sd);
    lower.push(m - mult * sd);
    width.push(m === 0 ? null : (2 * mult * sd) / m);
  }
  return { middle, upper, lower, width };
}

export function trueRange(candles: readonly Candle[]): number[] {
  return candles.map((c, i) => {
    const prev = candles[i - 1];
    if (!prev) return c.h - c.l;
    return Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
  });
}

/** Average True Range with Wilder smoothing. */
export function atr(candles: readonly Candle[], period = 14): Series {
  const tr = trueRange(candles);
  const out: Series = new Array<number | null>(candles.length).fill(null);
  if (candles.length < period) return out;
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < tr.length; i++) {
    prev = (prev * (period - 1) + (tr[i] ?? 0)) / period;
    out[i] = prev;
  }
  return out;
}

export const closesOf = (candles: readonly Candle[]) => candles.map((c) => c.c);

/**
 * Volume divided by the average volume of the previous `period` candles
 * (current candle excluded, so a spike does not dilute its own baseline).
 */
export function volumeRatio(volumes: readonly number[], period = 20): Series {
  const out: Series = new Array<number | null>(volumes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < volumes.length; i++) {
    if (i >= period) {
      const avg = sum / period;
      out[i] = avg > 0 ? (volumes[i] ?? 0) / avg : null;
      sum -= volumes[i - period] ?? 0;
    }
    sum += volumes[i] ?? 0;
  }
  return out;
}

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/random';
import type { Candle } from '@/types/trading';
import { INTERVAL_MS, parseDataset } from './candles';
import {
  lastClosedIndex,
  momentRange,
  pickMoment,
  pickStart,
  startAtMoment,
  SIM_FUTURE,
  SIM_HISTORY,
  skipAhead,
  visibleWindow,
  windowStart,
} from './simSession';

const candles: Candle[] = Array.from({ length: 1000 }, (_, i) => ({
  t: i,
  o: 1,
  h: 1,
  l: 1,
  c: 1,
  v: 1,
}));

describe('pickStart', () => {
  it('keeps 200 candles of history and 150 of future, reproducibly', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const start = pickStart(1000, rng);
      expect(start).not.toBeNull();
      expect(start).toBeGreaterThanOrEqual(SIM_HISTORY);
      expect(start).toBeLessThanOrEqual(1000 - 1 - SIM_FUTURE);
    }
    expect(pickStart(1000, mulberry32(7))).toBe(pickStart(1000, mulberry32(7)));
  });

  it('returns null for a dataset that is too short', () => {
    expect(pickStart(SIM_HISTORY + SIM_FUTURE, mulberry32(1))).toBeNull();
    expect(pickStart(SIM_HISTORY + SIM_FUTURE + 1, mulberry32(1))).toBe(SIM_HISTORY);
  });
});

describe('visibleWindow', () => {
  it('never includes a candle after the cursor', () => {
    for (const cursor of [0, 5, 199, 200, 640, 999]) {
      const shown = visibleWindow(candles, cursor, cursor);
      expect(shown.at(-1)?.t).toBe(cursor);
      expect(shown.every((c) => c.t <= cursor)).toBe(true);
    }
  });

  it('shows up to 200 candles of history, and keeps the left edge during playback', () => {
    expect(visibleWindow(candles, 640, 640)).toHaveLength(SIM_HISTORY);
    expect(windowStart(640)).toBe(441);
    expect(visibleWindow(candles, 10, 10)).toHaveLength(11);
    const playing = visibleWindow(candles, 640, 660);
    expect(playing[0]?.t).toBe(441);
    expect(playing.at(-1)?.t).toBe(660);
  });
});

describe('skipAhead', () => {
  it('moves 20 candles while enough future is left', () => {
    expect(skipAhead(300, 1000)).toBe(320);
    expect(skipAhead(829, 1000)).toBe(849);
    expect(skipAhead(830, 1000)).toBeNull();
  });
});

describe('same moment on every timeframe', () => {
  const H = 3_600_000;
  const DAY = 24 * H;
  const series = (n: number, step: number, from = 0) =>
    Array.from({ length: n }, (_, i) => ({ t: from + i * step, o: 1, h: 1, l: 1, c: 1, v: 1 }));

  it('takes the last candle closed by the moment (no look-ahead)', () => {
    const hourly = series(100, H);
    expect(lastClosedIndex(hourly, 10 * H, H)).toBe(9); // candle 10 opens at 10:00, not closed yet
    expect(lastClosedIndex(hourly, 10 * H + 1, H)).toBe(9);
    expect(lastClosedIndex(hourly, 11 * H, H)).toBe(10);
    expect(lastClosedIndex(hourly, 0, H)).toBe(-1);
  });

  it('finds midnights valid on all timeframes and ends their charts at the same instant', () => {
    const daily = series(800, DAY);
    const four = series(4000, 4 * H, 300 * DAY);
    const hourly = series(9000, H, 400 * DAY);
    const all = [
      { candles: daily, intervalMs: DAY },
      { candles: four, intervalMs: 4 * H },
      { candles: hourly, intervalMs: H },
    ];
    const range = momentRange(all);
    expect(range).not.toBeNull();
    if (!range) return;
    expect(range.min % DAY).toBe(0);
    for (let seed = 1; seed < 40; seed++) {
      const moment = pickMoment(range, mulberry32(seed));
      expect(moment).toBeGreaterThanOrEqual(range.min);
      expect(moment).toBeLessThanOrEqual(range.max);
      for (const { candles, intervalMs } of all) {
        const start = startAtMoment(candles, intervalMs, moment);
        expect(start).not.toBeNull();
        if (start === null) return;
        // the last visible candle closes exactly at the moment
        expect((candles[start]?.t ?? 0) + intervalMs).toBe(moment);
        expect(start).toBeGreaterThanOrEqual(SIM_HISTORY);
        expect(start).toBeLessThanOrEqual(candles.length - 1 - SIM_FUTURE);
      }
    }
  });

  it('has no common moment when the timeframes do not overlap', () => {
    expect(
      momentRange([
        { candles: series(400, DAY), intervalMs: DAY },
        { candles: series(400, H, 2000 * DAY), intervalMs: H },
      ]),
    ).toBeNull();
  });

  it('clamps a moment outside the tradeable window to the nearest valid candle', () => {
    const hourly = series(1000, H);
    expect(startAtMoment(hourly, H, 0)).toBe(SIM_HISTORY);
    expect(startAtMoment(hourly, H, 10_000 * H)).toBe(1000 - 1 - SIM_FUTURE);
    expect(startAtMoment(series(SIM_HISTORY + SIM_FUTURE, H), H, 0)).toBeNull();
  });
});

describe('real datasets', () => {
  it.each(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const)(
    '%s has a common window of moments on 1H, 4H and 1D (at least half a year)',
    (symbol) => {
      const series = (['60', '240', 'D'] as const).map((interval) => {
        const name = `${symbol}-${interval}` as const;
        const raw: unknown = JSON.parse(
          fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8'),
        );
        return { candles: parseDataset(name, raw).candles, intervalMs: INTERVAL_MS[interval] };
      });
      const range = momentRange(series);
      expect(range).not.toBeNull();
      expect(((range?.max ?? 0) - (range?.min ?? 0)) / 86_400_000).toBeGreaterThan(180);
    },
  );
});

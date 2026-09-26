import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/random';
import type { Candle } from '@/types/trading';
import {
  pickStart,
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

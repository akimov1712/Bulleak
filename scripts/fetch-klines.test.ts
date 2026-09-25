import { describe, expect, it } from 'vitest';
import { normalize } from './fetch-klines';

const H = 3_600_000;
const row = (t: number) =>
  [t, 1, 2, 0.5, 1.5, 10] as [number, number, number, number, number, number];

describe('normalize', () => {
  it('sorts ascending, removes duplicates and drops the forming candle', () => {
    const { candles, gaps } = normalize(
      [row(2 * H), row(0), row(H), row(H), row(3 * H)],
      H,
      3 * H + 10,
    );
    expect(candles.map((c) => c[0])).toEqual([0, H, 2 * H]);
    expect(gaps).toBe(0);
  });

  it('counts gaps in the series', () => {
    const { gaps } = normalize([row(0), row(H), row(4 * H)], H, 10 * H);
    expect(gaps).toBe(1);
  });
});

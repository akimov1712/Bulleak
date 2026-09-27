import { describe, expect, it } from 'vitest';
import {
  fibExtension,
  fibRetracement,
  goldenPocket,
  retracementDepth,
  snapToExtreme,
} from './fibonacci';

const price = (levels: { ratio: number; price: number }[], ratio: number) =>
  levels.find((l) => l.ratio === ratio)?.price;

describe('fibonacci (m06-l02)', () => {
  it('retracement of an up-move: low 100, high 200', () => {
    const levels = fibRetracement(100, 200);
    expect(price(levels, 0)).toBe(200);
    expect(price(levels, 0.382)).toBeCloseTo(161.8);
    expect(price(levels, 0.5)).toBe(150);
    expect(price(levels, 0.618)).toBeCloseTo(138.2);
    expect(price(levels, 1)).toBe(100);
  });

  it('50 000 → 60 000: level 0.5 is 55 000; a down-move mirrors', () => {
    expect(price(fibRetracement(50_000, 60_000), 0.5)).toBe(55_000);
    // down-move from 200 to 100: 0.618 retracement is back up at 161.8
    expect(price(fibRetracement(200, 100), 0.618)).toBeCloseTo(161.8);
  });

  it('extensions and golden pocket', () => {
    const ext = fibExtension(100, 200);
    expect(price(ext, 1.272)).toBeCloseTo(227.2);
    expect(price(ext, 1.618)).toBeCloseTo(261.8);
    expect(goldenPocket(56_505, 65_540)).toEqual({
      top: expect.closeTo(61_022.5, 1) as number,
      bottom: expect.closeTo(59_956.4, 1) as number,
    });
  });

  it('snaps a click to the nearer extreme of the candle', () => {
    expect(snapToExtreme({ h: 110, l: 100 }, 108)).toBe(110);
    expect(snapToExtreme({ h: 110, l: 100 }, 101)).toBe(100);
  });

  it('depth of a real pullback: BTC May 2024 went ~60 % into the move', () => {
    expect(retracementDepth(56_505, 65_540, 60_111)).toBeCloseTo(0.601, 3);
    expect(retracementDepth(1, 1, 1)).toBeNull();
  });
});

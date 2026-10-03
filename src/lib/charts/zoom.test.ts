import { describe, expect, it } from 'vitest';
import { MIN_BARS, zoomRange } from './zoom';

describe('zoomRange', () => {
  it('zooms around the right edge', () => {
    expect(zoomRange({ from: 0, to: 100 }, 0.5, 300)).toEqual({ from: 50, to: 100 });
    expect(zoomRange({ from: 50, to: 100 }, 2, 300)).toEqual({ from: 0, to: 100 });
  });

  it('never shows fewer than MIN_BARS or much more than the whole series', () => {
    expect(zoomRange({ from: 90, to: 100 }, 0.5, 300).from).toBe(100 - MIN_BARS);
    expect(zoomRange({ from: 0, to: 300 }, 4, 300)).toEqual({ from: 300 - 330, to: 300 });
  });

  it('ignores broken input', () => {
    const range = { from: 10, to: 10 };
    expect(zoomRange(range, 0.5, 100)).toBe(range);
    expect(zoomRange({ from: 0, to: 50 }, 0, 100)).toEqual({ from: 0, to: 50 });
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { SeriesAttachedParameter, Time } from 'lightweight-charts';
import { OverlayPrimitive } from './overlayPrimitive';

// 10 px per bar, price 100 at y=0 and 0 at y=100. Like lightweight-charts, a fractional
// logical index is not mapped (returns 0) — zones must not rely on it.
const chart = {
  timeScale: () => ({
    logicalToCoordinate: (l: number) => (l < -100 ? null : Number.isInteger(l) ? l * 10 : 0),
  }),
};
const series = { priceToCoordinate: (p: number) => (p < 0 ? null : 100 - p) };

function attach(p: OverlayPrimitive) {
  const requestUpdate = vi.fn();
  p.attached({ chart, series, requestUpdate } as unknown as SeriesAttachedParameter<Time>);
  return requestUpdate;
}

const zone = { top: 80, bottom: 60, color: '#123456', fill: 'rgba(0,0,0,0.1)' };

describe('OverlayPrimitive', () => {
  it('resolves zones and vertical lines to pixel coordinates', () => {
    const p = new OverlayPrimitive({
      zones: [{ ...zone, from: 2, to: 4, label: 'Z' }, { ...zone }, { ...zone, bottom: -1 }],
      vlines: [{ index: 5, color: '#000', label: 'V' }],
    });
    expect(p.resolve()).toEqual({ zones: [], vlines: [], lines: [] });
    attach(p);
    const r = p.resolve();
    expect(r.zones.map(({ x1, x2, y1, y2 }) => [x1, x2, y1, y2])).toEqual([
      [15, 45, 20, 40],
      [0, null, 20, 40],
    ]);
    expect(r.vlines.map((v) => v.x)).toEqual([50]);
  });

  it('draws through the pane renderer and redraws on setItems', () => {
    const p = new OverlayPrimitive({
      zones: [{ ...zone, from: 2, to: 4, label: 'Z' }, { ...zone }],
      vlines: [],
    });
    const requestUpdate = attach(p);
    p.setItems({
      zones: [{ ...zone, from: 2, to: 4, label: 'Z' }],
      vlines: [
        { index: 5, color: '#000', label: 'V' },
        { index: 999, color: '#000' },
      ],
    });
    expect(requestUpdate).toHaveBeenCalled();

    const ctx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    const target = {
      useMediaCoordinateSpace: (
        fn: (s: { context: typeof ctx; mediaSize: { width: number; height: number } }) => void,
      ) => fn({ context: ctx, mediaSize: { width: 200, height: 100 } }),
    };
    const [shapes, labels] = p.paneViews();
    // Shapes under the candles, labels on top of them.
    expect(shapes?.zOrder()).toBe('bottom');
    expect(labels?.zOrder()).toBe('top');
    shapes?.renderer().draw(target as never);
    expect(ctx.fillRect).toHaveBeenCalledWith(15, 20, 30, 20);
    expect(ctx.fillText).not.toHaveBeenCalled();
    labels?.renderer().draw(target as never);
    expect(ctx.fillText).toHaveBeenCalledWith('Z', 21, 24);
    expect(ctx.fillText).toHaveBeenCalledWith('V', 55, 30);
    // label backdrop: text width 10 + 6 padding
    expect(ctx.fillRect).toHaveBeenCalledWith(18, 22, 16, 16);
    // the off-screen line at x=9990 is skipped
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);

    p.detached();
    expect(p.resolve()).toEqual({ zones: [], vlines: [], lines: [] });
  });

  it('draws sloped lines and extends them to the right edge', () => {
    const line = { color: '#0a0', dashed: false, label: 'L' };
    const p = new OverlayPrimitive({
      zones: [],
      vlines: [],
      lines: [
        { ...line, from: { index: 1, price: 50 }, to: { index: 3, price: 70 }, extend: true },
        { ...line, from: { index: 1, price: 50 }, to: { index: 3, price: -5 }, extend: false },
      ],
    });
    attach(p);
    // the second line has an off-scale price and is skipped
    expect(p.resolve().lines.map(({ x1, y1, x2, y2 }) => [x1, y1, x2, y2])).toEqual([
      [10, 50, 30, 30],
    ]);
    const ctx = {
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
    };
    const target = {
      useMediaCoordinateSpace: (
        fn: (s: { context: typeof ctx; mediaSize: { width: number; height: number } }) => void,
      ) => fn({ context: ctx, mediaSize: { width: 110, height: 100 } }),
    };
    const [shapes] = p.paneViews();
    shapes?.renderer().draw(target as never);
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 50);
    // slope −1 px per px: from (10, 50) to the edge x=110 → y=−50
    expect(ctx.lineTo).toHaveBeenCalledWith(110, -50);
  });
});

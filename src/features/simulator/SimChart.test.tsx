import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Candle } from '@/types/trading';
import { SimChart, type SimIndicators } from './SimChart';

interface FakeSeries {
  kind: string;
  data: { time: number }[];
  setData: (d: { time: number }[]) => void;
  update: (d: { time: number }) => void;
}

const mocks = vi.hoisted(() => ({ series: [] as FakeSeries[] }));

vi.mock('lightweight-charts', () => ({
  CandlestickSeries: 'Candlestick',
  LineSeries: 'Line',
  HistogramSeries: 'Histogram',
  LineStyle: { Solid: 0, Dashed: 2 },
  createSeriesMarkers: vi.fn(() => ({ detach: vi.fn() })),
  createChart: vi.fn(() => ({
    addSeries: (kind: string) => {
      const s: FakeSeries = {
        kind,
        data: [],
        setData(d) {
          this.data = [...d];
        },
        update(d) {
          this.data.push(d);
        },
      };
      Object.assign(s, {
        createPriceLine: (o: unknown) => o,
        removePriceLine: vi.fn(),
        priceScale: () => ({ applyOptions: vi.fn() }),
        coordinateToPrice: () => 100,
        priceToCoordinate: () => 0,
      });
      mocks.series.push(s);
      return s;
    },
    panes: () => [{ setStretchFactor: vi.fn() }, { setStretchFactor: vi.fn() }],
    timeScale: () => ({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    subscribeClick: vi.fn(),
    unsubscribeClick: vi.fn(),
    remove: vi.fn(),
  })),
}));

const H = 3_600_000;
const candles: Candle[] = Array.from({ length: 600 }, (_, i) => ({
  t: i * H,
  o: 100 + i,
  h: 102 + i,
  l: 99 + i,
  c: 101 + i,
  v: 5,
}));
const all: SimIndicators = { ema20: true, ema50: true, ema200: true, rsi: true, volume: true };

const lastTime = (s: FakeSeries) => s.data.at(-1)?.time ?? -1;
const cursorTime = (i: number) => Math.floor((candles[i]?.t ?? 0) / 1000);

describe('SimChart', () => {
  it('never hands a candle after the cursor to any series, also while playing', () => {
    mocks.series = [];
    const props = {
      candles,
      anchor: 300,
      intraday: true,
      indicators: all,
      levels: [],
      height: 300,
    };
    const { rerender } = render(<SimChart {...props} cursor={300} />);
    expect(mocks.series.length).toBeGreaterThanOrEqual(6);
    for (const s of mocks.series) expect(lastTime(s)).toBeLessThanOrEqual(cursorTime(300));
    const main = mocks.series[0];
    expect(lastTime(main as FakeSeries)).toBe(cursorTime(300));
    expect(main?.data).toHaveLength(200);

    rerender(<SimChart {...props} cursor={305} />);
    for (const s of mocks.series) expect(lastTime(s)).toBeLessThanOrEqual(cursorTime(305));
    expect(lastTime(main as FakeSeries)).toBe(cursorTime(305));
    expect(main?.data).toHaveLength(205);
  });
});

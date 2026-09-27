import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '@/lib/trading/candles';
import { CandleChart } from './CandleChart';

const H = 3_600_000;
const dataset: Dataset = {
  name: 'BTCUSDT-60',
  symbol: 'BTCUSDT',
  interval: '60',
  fetchedAt: 0,
  candles: Array.from({ length: 200 }, (_, i) => {
    const base = 60000 + Math.sin(i / 5) * 800 + i * 10;
    return { t: i * H, o: base, h: base + 150, l: base - 150, c: base + 40, v: 10 + i };
  }),
};

const mocks = vi.hoisted(() => ({
  useDataset: vi.fn(),
  created: [] as Record<string, unknown>[],
  markers: vi.fn(() => ({ detach: mocks.detachMarkers })),
  detachMarkers: vi.fn(),
}));

vi.mock('./useDataset', () => ({ useDataset: mocks.useDataset }));

vi.mock('lightweight-charts', () => {
  const makeSeries = (kind: string, pane: number) => ({
    kind,
    pane,
    data: [] as unknown[],
    priceLines: [] as unknown[],
    primitives: [] as unknown[],
    setData(d: unknown[]) {
      this.data = d;
    },
    createPriceLine(o: unknown) {
      this.priceLines.push(o);
      return o;
    },
    removePriceLine(o: unknown) {
      this.priceLines = this.priceLines.filter((l) => l !== o);
    },
    detachPrimitive(p: unknown) {
      this.primitives = this.primitives.filter((x) => x !== p);
    },
    attachPrimitive(p: unknown) {
      this.primitives.push(p);
    },
    priceScale: () => ({ applyOptions: vi.fn() }),
    coordinateToPrice: (y: number) => 1000 - y,
  });
  return {
    CandlestickSeries: 'Candlestick',
    BarSeries: 'Bar',
    LineSeries: 'Line',
    HistogramSeries: 'Histogram',
    LineStyle: { Solid: 0, Dashed: 2 },
    PriceScaleMode: { Normal: 0, Logarithmic: 1 },
    createSeriesMarkers: mocks.markers,
    createChart: vi.fn((_el: HTMLElement, options: unknown) => {
      const series: ReturnType<typeof makeSeries>[] = [];
      let clickHandler: ((p: unknown) => void) | null = null;
      let dblHandler: ((p: unknown) => void) | null = null;
      let moveHandler: ((p: unknown) => void) | null = null;
      const chart = {
        options,
        series,
        remove: vi.fn(),
        addSeries: (kind: string, _opts: unknown, pane = 0) => {
          const s = makeSeries(kind, pane);
          series.push(s);
          return s;
        },
        panes: () => [0, 1, 2].map(() => ({ setStretchFactor: vi.fn() })),
        timeScale: () => ({ fitContent: vi.fn() }),
        subscribeClick: (h: (p: unknown) => void) => {
          clickHandler = h;
        },
        unsubscribeClick: vi.fn(),
        subscribeDblClick: (h: (p: unknown) => void) => {
          dblHandler = h;
        },
        unsubscribeDblClick: vi.fn(),
        subscribeCrosshairMove: (h: (p: unknown) => void) => {
          moveHandler = h;
        },
        unsubscribeCrosshairMove: vi.fn(),
        move: (p: unknown) => moveHandler?.(p),
        dblClick: (p: unknown) => dblHandler?.(p),
        click: (p: unknown) => clickHandler?.(p),
      };
      mocks.created.push(chart);
      return chart;
    }),
  };
});

interface FakeSeries {
  kind: string;
  pane: number;
  data: { time: number }[];
  priceLines: { price: number; title: string }[];
  primitives: unknown[];
}
interface FakeChart {
  options: { handleScroll: unknown; rightPriceScale: { mode: number } };
  series: FakeSeries[];
  remove: ReturnType<typeof vi.fn>;
  click: (p: unknown) => void;
  dblClick: (p: unknown) => void;
  move: (p: unknown) => void;
}
const lastChart = () => mocks.created.at(-1) as unknown as FakeChart;

beforeEach(() => {
  mocks.created.length = 0;
  mocks.markers.mockClear();
  mocks.detachMarkers.mockClear();
  mocks.useDataset.mockReturnValue(dataset);
});

describe('CandleChart', () => {
  it('uses a logarithmic price scale on request', () => {
    render(<CandleChart dataset="BTCUSDT-D" logScale />);
    expect(lastChart().options.rightPriceScale.mode).toBe(1);
    render(<CandleChart dataset="BTCUSDT-D" />);
    expect(lastChart().options.rightPriceScale.mode).toBe(0);
  });

  it('switches datasets between timeframes', () => {
    render(
      <CandleChart dataset="BTCUSDT-240" timeframes={['BTCUSDT-D', 'BTCUSDT-240', 'BTCUSDT-60']} />,
    );
    expect(screen.getByRole('radio', { name: '4H' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '1D' }));
    expect(mocks.useDataset).toHaveBeenLastCalledWith('BTCUSDT-D');
    fireEvent.click(screen.getByRole('radio', { name: '1H' }));
    expect(mocks.useDataset).toHaveBeenLastCalledWith('BTCUSDT-60');
  });

  it('switches between candles, bars and line and shows OHLC of the hovered candle', async () => {
    render(<CandleChart dataset="BTCUSDT-60" bars={20} typeToggle />);
    expect(lastChart().series[0]?.kind).toBe('Candlestick');
    expect(screen.getByText(/Последняя:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Линия' }));
    expect(lastChart().series[0]?.kind).toBe('Line');
    fireEvent.click(screen.getByRole('radio', { name: 'Бары' }));
    expect(lastChart().series[0]?.kind).toBe('Bar');
    act(() => lastChart().move({ logical: 0, point: { x: 1, y: 1 } }));
    expect(screen.queryByText(/Последняя:/)).not.toBeInTheDocument();
    act(() => lastChart().move({}));
    expect(screen.getByText(/Последняя:/)).toBeInTheDocument();
  });

  it('draws the visible slice with indicators, levels, markers and overlays', () => {
    render(
      <CandleChart
        dataset="BTCUSDT-60"
        bars={50}
        volume
        indicators={[{ type: 'ema', period: 20 }, { type: 'rsi' }, { type: 'macd' }]}
        annotations={[
          { type: 'hline', price: 61000, label: 'Уровень' },
          { type: 'marker', time: 190 * H, text: 'Вход' },
          { type: 'zone', top: 61000, bottom: 60500 },
          { type: 'vline', time: 180 * H },
        ]}
        caption="Подпись"
      />,
    );
    expect(screen.getByText('Подпись')).toBeInTheDocument();
    expect(screen.getByText('BTC/USDT · 1H · EMA 20')).toBeInTheDocument();
    const chart = lastChart();
    const [candles, volume] = chart.series;
    expect(candles?.kind).toBe('Candlestick');
    expect(candles?.data).toHaveLength(50);
    expect(candles?.data[0]?.time).toBe((150 * H) / 1000);
    expect(volume?.kind).toBe('Histogram');
    // EMA on the main pane, RSI on pane 1, MACD (hist + 2 lines) on pane 2
    expect(chart.series.map((s) => `${s.kind}@${s.pane}`)).toEqual([
      'Candlestick@0',
      'Histogram@0',
      'Line@0',
      'Line@1',
      'Histogram@2',
      'Line@2',
      'Line@2',
    ]);
    // indicators are warmed up on the full history: EMA has a value on the first visible bar
    expect(chart.series[2]?.data).toHaveLength(50);
    expect(chart.series[3]?.priceLines.map((l) => l.price)).toEqual([70, 30]);
    expect(candles?.priceLines).toEqual([
      expect.objectContaining({ price: 61000, title: 'Уровень' }),
    ]);
    expect(mocks.markers).toHaveBeenCalledWith(candles, [
      expect.objectContaining({ time: (190 * H) / 1000, text: 'Вход' }),
    ]);
    expect(candles?.primitives).toHaveLength(1);
    expect(chart.options.handleScroll).toBe(false);
  });

  it('reports clicks on the candle pane and cleans up on unmount', () => {
    const onPick = vi.fn();
    const { unmount } = render(
      <CandleChart dataset="BTCUSDT-60" bars={10} interactive onPick={onPick} />,
    );
    const chart = lastChart();
    expect(chart.options.handleScroll).toMatchObject({ vertTouchDrag: false, mouseWheel: false });
    chart.click({ point: { x: 1, y: 100 }, logical: 3.4, paneIndex: 0 });
    expect(onPick).toHaveBeenCalledWith({ index: 193, time: 193 * H, price: 900 });
    chart.click({ point: { x: 1, y: 100 }, logical: 3, paneIndex: 1 });
    chart.click({ logical: 3 });
    expect(onPick).toHaveBeenCalledTimes(1);
    chart.dblClick({ point: { x: 1, y: 200 }, logical: 5, paneIndex: 0 });
    expect(onPick).toHaveBeenLastCalledWith({ index: 195, time: 195 * H, price: 800 });
    unmount();
    expect(chart.remove).toHaveBeenCalled();
  });

  it('redraws annotations without rebuilding the chart', () => {
    const { rerender } = render(
      <CandleChart
        dataset="BTCUSDT-60"
        annotations={[
          { type: 'hline', price: 1 },
          { type: 'marker', time: { index: 199 } },
          { type: 'zone', top: 2, bottom: 1 },
        ]}
      />,
    );
    const chart = lastChart();
    const candles = chart.series[0];
    rerender(<CandleChart dataset="BTCUSDT-60" annotations={[{ type: 'hline', price: 2 }]} />);
    expect(mocks.created).toHaveLength(1);
    expect(candles?.priceLines.map((l) => l.price)).toEqual([2]);
    expect(candles?.primitives).toHaveLength(0);
    expect(mocks.detachMarkers).toHaveBeenCalledTimes(1);
  });

  it('does not rebuild when the parent re-renders with equal props', () => {
    const props = {
      dataset: 'BTCUSDT-60' as const,
      annotations: [{ type: 'hline' as const, price: 1 }],
    };
    const { rerender } = render(<CandleChart {...props} />);
    rerender(<CandleChart {...props} annotations={[{ type: 'hline', price: 1 }]} />);
    expect(mocks.created).toHaveLength(1);
  });

  it('shows an error with retry when the dataset fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.useDataset.mockImplementation(() => {
      throw new Error('нет сети');
    });
    render(<CandleChart dataset="BTCUSDT-60" />);
    expect(screen.getByRole('alert')).toHaveTextContent('нет сети');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});

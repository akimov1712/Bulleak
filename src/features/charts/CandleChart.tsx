import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarSeries,
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesType,
  type LineData,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  atr,
  bollinger,
  closesOf,
  ema,
  macd,
  rsi,
  sma,
  volumeRatio,
  type Series,
} from '@/lib/indicators/indicators';
import { datasetInterval, INTERVAL_LABEL, type DatasetName } from '@/lib/trading/candles';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Candle } from '@/types/trading';
import {
  buildMarkers,
  indicatorLabel,
  isPaneIndicator,
  pricePrecision,
  resolveIndex,
  toChartTime,
  visibleRange,
  withAlpha,
  type Annotation,
  type IndicatorSpec,
  type Palette,
  type TimeInput,
  type Tone,
} from './annotations';
import { OverlayPrimitive, type OverlayItems } from './overlayPrimitive';
import { useDataset } from './useDataset';
import { usePalette } from './usePalette';
import { chartCardHeight } from './chartLayout';

export interface ChartPick {
  /** Index in the full dataset. */
  index: number;
  time: number;
  price: number;
}

export interface CandleChartProps {
  dataset: DatasetName;
  from?: TimeInput;
  to?: TimeInput;
  /** Number of candles when `from` is not set (default 120). */
  bars?: number;
  annotations?: Annotation[];
  indicators?: IndicatorSpec[];
  volume?: boolean;
  /** Highlight volume bars at least this many times the previous 20-candle average (e.g. 2). */
  volumeSpikes?: number;
  /** Height of the candle pane in px (indicator panes are added below). */
  height?: number;
  /** Allow panning / zooming (off = static picture that never captures page scroll). */
  interactive?: boolean;
  onPick?: (pick: ChartPick) => void;
  caption?: string;
  className?: string;
  /** How the price is drawn (default candles). */
  chartType?: ChartType;
  /** Show a candles / bars / line switch above the chart. */
  typeToggle?: boolean;
  /** O/H/L/C line for the hovered (or last) candle; default on. */
  ohlc?: boolean;
  /**
   * Datasets of the same symbol to switch between (e.g. 1D / 4H / 1H). `from`/`to` should be
   * dates then, so every timeframe shows the same period.
   */
  timeframes?: DatasetName[];
  /** Logarithmic price scale: equal percentages are equal distances (long BTC history). */
  logScale?: boolean;
}

export type ChartType = 'candles' | 'bars' | 'line';

const TYPE_LABEL: Record<ChartType, string> = { candles: 'Свечи', bars: 'Бары', line: 'Линия' };

const PANE_HEIGHT = 110;
const OVERLAY_TONES: Tone[] = ['info', 'warn', 'epic', 'primary'];

/** Candle chart with annotations; handles loading and errors itself. */
export function CandleChart(props: CandleChartProps) {
  const [dataset, setDataset] = useState(props.dataset);
  // The tabs pick a dataset locally; a new `dataset` prop from the parent still wins.
  const [datasetProp, setDatasetProp] = useState(props.dataset);
  if (datasetProp !== props.dataset) {
    setDatasetProp(props.dataset);
    setDataset(props.dataset);
  }
  const paneCount = props.indicators?.filter(isPaneIndicator).length ?? 0;
  const total = (props.height ?? 320) + paneCount * PANE_HEIGHT;
  // Placeholders cover the header and borders too, so nothing jumps when the chart loads.
  const placeholderHeight = chartCardHeight(total, props.ohlc !== false);
  const timeframes = props.timeframes ?? [];
  return (
    <figure className={props.className}>
      {timeframes.length > 1 && (
        <div role="radiogroup" aria-label="Таймфрейм" className="mb-2 flex gap-1.5">
          {timeframes.map((tf) => {
            const interval = datasetInterval(tf);
            return (
              <button
                key={tf}
                type="button"
                role="radio"
                aria-checked={dataset === tf}
                onClick={() => setDataset(tf)}
                className={cn(
                  'rounded-full border-2 px-3 py-1 text-sm font-extrabold transition-colors',
                  dataset === tf
                    ? 'border-info bg-info/15 text-info'
                    : 'border-border bg-surface text-text-muted hover:border-info',
                )}
              >
                {INTERVAL_LABEL[interval]}
              </button>
            );
          })}
        </div>
      )}
      <ErrorBoundary
        resetKey={dataset}
        fallback={(error, reset) => (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-surface p-4 text-center text-sm text-text-muted"
            style={{ height: placeholderHeight }}
          >
            <p>График не загрузился: {error.message}</p>
            <button type="button" className="font-bold text-info underline" onClick={reset}>
              Повторить
            </button>
          </div>
        )}
      >
        <Suspense
          fallback={
            <div style={{ height: placeholderHeight }}>
              <Skeleton className="h-full w-full rounded-2xl" />
            </div>
          }
        >
          <ChartBody {...props} dataset={dataset} totalHeight={total} />
        </Suspense>
      </ErrorBoundary>
      {props.caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ChartBody(props: CandleChartProps & { totalHeight: number }) {
  const { candles, symbol, interval } = useDataset(props.dataset);
  const palette = usePalette();
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(props.onPick);
  useEffect(() => {
    onPickRef.current = props.onPick;
  });

  const { start, end } = useMemo(
    () => visibleRange(candles, { from: props.from, to: props.to, bars: props.bars }),
    [candles, props.from, props.to, props.bars],
  );
  // MDX passes fresh array literals on every render; compare by content.
  const annotationsKey = JSON.stringify(props.annotations ?? []);
  const indicatorsKey = JSON.stringify(props.indicators ?? []);
  const interactive = props.interactive ?? false;
  const volume = props.volume ?? false;
  const volumeSpikes = props.volumeSpikes ?? 0;
  const logScale = props.logScale ?? false;
  const height = props.totalHeight;
  const [chartType, setChartType] = useState<ChartType>(props.chartType ?? 'candles');
  const [chartTypeProp, setChartTypeProp] = useState(props.chartType);
  if (chartTypeProp !== props.chartType) {
    setChartTypeProp(props.chartType);
    setChartType(props.chartType ?? 'candles');
  }
  const [hovered, setHovered] = useState<number | null>(null);
  const showOhlc = props.ohlc ?? true;

  const chartRef = useRef<BuiltChart | null>(null);

  // The chart itself: rebuilt only when data, indicators or theme change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const indicators = JSON.parse(indicatorsKey) as IndicatorSpec[];
    const chart = buildChart(el, {
      candles,
      start,
      end,
      indicators,
      volume,
      volumeSpikes,
      interactive,
      intraday: interval !== 'D',
      palette,
      chartType,
      logScale,
    });
    const handleClick = (param: MouseEventParams<Time>) => {
      const pick = onPickRef.current;
      if (!pick || !param.point || param.logical === undefined || (param.paneIndex ?? 0) !== 0)
        return;
      const idx = Math.min(end - start, Math.max(0, Math.round(param.logical)));
      const candle = candles[start + idx];
      const price = chart.mainSeries.coordinateToPrice(param.point.y);
      if (!candle || price === null) return;
      pick({ index: start + idx, time: candle.t, price });
    };
    chart.api.subscribeClick(handleClick);
    // A quick second click is reported as a double click only; treat it as a click too
    // so re-placing an answer never gets lost.
    chart.api.subscribeDblClick(handleClick);
    const handleMove = (param: MouseEventParams<Time>) => {
      if (param.logical === undefined || !param.point) {
        setHovered(null);
        return;
      }
      const idx = Math.round(param.logical);
      setHovered(idx >= 0 && idx <= end - start ? start + idx : null);
    };
    chart.api.subscribeCrosshairMove(handleMove);
    chartRef.current = chart;
    // autoSize measures the container asynchronously, so fitting at creation can use a
    // stale width. Refit on size changes; interactive charts only until the first real
    // size, so the learner's own zoom is kept.
    let fitted = false;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === 0 || (interactive && fitted)) return;
      fitted = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => chart.api.timeScale().fitContent());
    });
    observer.observe(el);
    return () => {
      chartRef.current = null;
      // The hovered index belongs to this data/range; a rebuilt chart starts from "last".
      setHovered(null);
      observer.disconnect();
      cancelAnimationFrame(frame);
      chart.api.unsubscribeClick(handleClick);
      chart.api.unsubscribeDblClick(handleClick);
      chart.api.unsubscribeCrosshairMove(handleMove);
      chart.api.remove();
    };
  }, [
    candles,
    start,
    end,
    indicatorsKey,
    volume,
    volumeSpikes,
    interactive,
    interval,
    palette,
    chartType,
    logScale,
  ]);

  // Annotations change on every quiz click: redraw them without rebuilding the chart
  // (no flicker, zoom is kept). Lists the chart deps too, so it re-runs after a rebuild.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const clear = applyAnnotations(chart, {
      candles,
      start,
      end,
      annotations: JSON.parse(annotationsKey) as Annotation[],
      palette,
    });
    return () => {
      // Skip when the chart was already removed by the effect above.
      if (chartRef.current === chart) clear();
    };
  }, [
    candles,
    start,
    end,
    annotationsKey,
    indicatorsKey,
    volume,
    volumeSpikes,
    interactive,
    interval,
    palette,
    chartType,
    logScale,
  ]);

  const legend = [
    `${symbol.replace('USDT', '/USDT')} · ${INTERVAL_LABEL[interval]}`,
    ...(props.indicators ?? []).filter((s) => !isPaneIndicator(s)).map(indicatorLabel),
  ].join(' · ');

  const shown = candles[hovered ?? end];
  const precision = pricePrecision(candles[end]?.c ?? 1);
  const fmt = (v: number) => formatNumber(v, precision, { minDecimals: precision });

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface"
      data-testid="candle-chart"
    >
      <div className="flex flex-col gap-0.5 border-b-2 border-border px-3 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-xs font-bold text-text-muted">{legend}</span>
          {props.typeToggle && (
            <div role="radiogroup" aria-label="Тип графика" className="flex gap-1">
              {(Object.keys(TYPE_LABEL) as ChartType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={chartType === t}
                  onClick={() => setChartType(t)}
                  className={cn(
                    "relative rounded-md px-2 py-0.5 text-xs font-bold before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']",
                    chartType === t ? 'bg-info/20 text-info' : 'text-text-muted hover:bg-surface-2',
                  )}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>
        {showOhlc && shown && (
          // Two lines reserved on phones: the line wraps differently with and without the
          // «Последняя:» prefix, and a height change under the cursor made hover flicker
          // between the two states every frame.
          <p className="min-h-[2lh] font-mono text-[11px] text-text-muted tabular-nums sm:min-h-0">
            <span className="font-sans font-bold">{hovered === null ? 'Последняя: ' : ''}</span>O{' '}
            <b className="text-text">{fmt(shown.o)}</b> H{' '}
            <b className="text-text">{fmt(shown.h)}</b> L{' '}
            <b className="text-text">{fmt(shown.l)}</b> C{' '}
            <b className={shown.c >= shown.o ? 'text-bull' : 'text-bear'}>{fmt(shown.c)}</b>
          </p>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ height, touchAction: interactive ? 'pan-y' : 'auto' }}
        aria-label={`Свечной график ${legend}`}
        // A group, not an image: the chart library adds a focusable attribution link inside.
        role="group"
      />
    </div>
  );
}

interface BuildOptions {
  candles: Candle[];
  start: number;
  end: number;
  indicators: IndicatorSpec[];
  volume: boolean;
  volumeSpikes: number;
  interactive: boolean;
  intraday: boolean;
  palette: Palette;
  chartType: ChartType;
  logScale: boolean;
}

interface BuiltChart {
  api: IChartApi;
  mainSeries: ISeriesApi<SeriesType>;
}

function buildChart(el: HTMLElement, o: BuildOptions): BuiltChart {
  const { palette: p, candles, start, end } = o;
  const visible = candles.slice(start, end + 1);
  const time = (i: number) => toChartTime(candles[i]?.t ?? 0);
  const precision = pricePrecision(visible.at(-1)?.c ?? 1);

  const api = createChart(el, {
    autoSize: true,
    layout: {
      background: { color: p.surface },
      textColor: p.muted,
      fontFamily: "'Nunito Variable', Nunito, system-ui, sans-serif",
      attributionLogo: true,
      panes: { separatorColor: p.border },
    },
    grid: {
      vertLines: { color: withAlpha(p.border, 0.5) },
      horzLines: { color: withAlpha(p.border, 0.5) },
    },
    rightPriceScale: {
      borderColor: p.border,
      mode: o.logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    },
    timeScale: {
      borderColor: p.border,
      timeVisible: o.intraday,
      secondsVisible: false,
      rightOffset: 2,
      // Lets fitContent show years of daily candles (the default minimum is 0.5 px per bar).
      minBarSpacing: 0.1,
    },
    crosshair: { mode: 0 },
    localization: { locale: 'ru-RU' },
    handleScroll: o.interactive
      ? { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }
      : false,
    handleScale: o.interactive
      ? { mouseWheel: false, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true }
      : false,
  });

  const priceFormat = { type: 'price' as const, precision, minMove: 10 ** -precision };
  const ohlcData = visible.map((c) => ({
    time: toChartTime(c.t),
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }));
  let mainSeries: ISeriesApi<SeriesType>;
  if (o.chartType === 'line') {
    const line = api.addSeries(LineSeries, { color: p.tones.info, lineWidth: 2, priceFormat });
    line.setData(visible.map((c) => ({ time: toChartTime(c.t), value: c.c })));
    mainSeries = line;
  } else if (o.chartType === 'bars') {
    const bars = api.addSeries(BarSeries, {
      upColor: p.tones.bull,
      downColor: p.tones.bear,
      priceFormat,
    });
    bars.setData(ohlcData);
    mainSeries = bars;
  } else {
    const candlesSeries = api.addSeries(CandlestickSeries, {
      upColor: p.tones.bull,
      downColor: p.tones.bear,
      borderUpColor: p.tones.bull,
      borderDownColor: p.tones.bear,
      wickUpColor: p.tones.bull,
      wickDownColor: p.tones.bear,
      priceFormat,
    });
    candlesSeries.setData(ohlcData);
    mainSeries = candlesSeries;
  }

  if (o.volume) {
    const vol = api.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
    // Ratio uses the full history so the first visible bars have a real baseline.
    const ratio = o.volumeSpikes > 0 ? volumeRatio(candles.map((c) => c.v)) : [];
    vol.setData(
      visible.map((c, i) => {
        const spike = o.volumeSpikes > 0 && (ratio[start + i] ?? 0) >= o.volumeSpikes;
        return {
          time: toChartTime(c.t),
          value: c.v,
          color: spike ? p.tones.warn : withAlpha(c.c >= c.o ? p.tones.bull : p.tones.bear, 0.35),
        };
      }),
    );
  }

  // Indicators are computed on the full history so the first visible values are warmed up.
  const toLine = (series: Series): LineData<Time>[] => {
    const out: LineData<Time>[] = [];
    for (let i = start; i <= end; i++) {
      const value = series[i];
      if (value !== null && value !== undefined) out.push({ time: time(i), value });
    }
    return out;
  };
  const line = (series: Series, color: string, pane = 0, width: 1 | 2 = 2, title = '') => {
    const s = api.addSeries(
      LineSeries,
      {
        color,
        lineWidth: width,
        title,
        lastValueVisible: title !== '',
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      },
      pane,
    );
    s.setData(toLine(series));
    return s;
  };
  const closes = closesOf(candles);
  let pane = 0;
  let overlayTone = 0;
  for (const spec of o.indicators) {
    switch (spec.type) {
      case 'sma':
      case 'ema': {
        const color =
          p.tones[spec.tone ?? OVERLAY_TONES[overlayTone++ % OVERLAY_TONES.length] ?? 'info'];
        line((spec.type === 'sma' ? sma : ema)(closes, spec.period), color);
        break;
      }
      case 'bollinger': {
        const bb = bollinger(closes, spec.period ?? 20, spec.mult ?? 2);
        line(bb.upper, p.tones.epic, 0, 1);
        line(bb.middle, withAlpha(p.tones.epic, 0.6), 0, 1);
        line(bb.lower, p.tones.epic, 0, 1);
        break;
      }
      case 'rsi': {
        const s = line(
          rsi(closes, spec.period ?? 14),
          p.tones.epic,
          ++pane,
          2,
          indicatorLabel(spec),
        );
        for (const level of [70, 30]) {
          s.createPriceLine({
            price: level,
            color: p.muted,
            lineStyle: LineStyle.Dashed,
            lineWidth: 1,
            axisLabelVisible: true,
            title: '',
          });
        }
        break;
      }
      case 'macd': {
        const m = macd(closes);
        const paneIndex = ++pane;
        const hist = api.addSeries(
          HistogramSeries,
          { lastValueVisible: false, priceLineVisible: false },
          paneIndex,
        );
        const histData = [];
        for (let i = start; i <= end; i++) {
          const v = m.histogram[i];
          if (v !== null && v !== undefined) {
            histData.push({
              time: time(i),
              value: v,
              color: withAlpha(v >= 0 ? p.tones.bull : p.tones.bear, 0.6),
            });
          }
        }
        hist.setData(histData);
        line(m.macd, p.tones.info, paneIndex, 2, 'MACD');
        line(m.signal, p.tones.warn, paneIndex, 2, 'Signal');
        break;
      }
      case 'atr':
        line(atr(candles, spec.period ?? 14), p.tones.warn, ++pane, 2, indicatorLabel(spec));
        break;
    }
  }
  if (pane > 0) {
    const panes = api.panes();
    const mainHeight = el.clientHeight - pane * PANE_HEIGHT;
    panes[0]?.setStretchFactor(Math.max(1, mainHeight / PANE_HEIGHT));
    for (let i = 1; i < panes.length; i++) panes[i]?.setStretchFactor(1);
  }

  api.timeScale().fitContent();
  return { api, mainSeries };
}

interface AnnotationInput {
  candles: Candle[];
  start: number;
  end: number;
  annotations: Annotation[];
  palette: Palette;
}

/** Draws annotations on an existing chart; returns a function that removes them. */
function applyAnnotations(chart: BuiltChart, o: AnnotationInput): () => void {
  const { mainSeries } = chart;
  const p = o.palette;
  const visible = o.candles.slice(o.start, o.end + 1);
  const priceLines: IPriceLine[] = [];
  for (const a of o.annotations) {
    if (a.type !== 'hline') continue;
    priceLines.push(
      mainSeries.createPriceLine({
        price: a.price,
        color: p.tones[a.tone ?? 'info'],
        lineWidth: 2,
        lineStyle: a.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title: a.label ?? '',
      }),
    );
  }
  const markers = buildMarkers(visible, o.annotations, o.start);
  const markersPlugin =
    markers.length > 0
      ? createSeriesMarkers(
          mainSeries,
          markers.map((m) => ({
            time: toChartTime(visible[m.index]?.t ?? 0),
            position: m.position,
            shape: m.shape,
            color: p.tones[m.tone],
            text: m.text,
          })),
        )
      : null;
  const items = overlayItems(visible, o.start, o.annotations, p);
  const overlay =
    items.zones.length + items.vlines.length + (items.lines?.length ?? 0) > 0
      ? new OverlayPrimitive(items, withAlpha(p.surface, 0.85))
      : null;
  if (overlay) mainSeries.attachPrimitive(overlay);
  return () => {
    for (const line of priceLines) mainSeries.removePriceLine(line);
    markersPlugin?.detach();
    if (overlay) mainSeries.detachPrimitive(overlay);
  };
}

function overlayItems(
  visible: Candle[],
  start: number,
  annotations: Annotation[],
  p: Palette,
): OverlayItems {
  const items: OverlayItems = { zones: [], vlines: [], lines: [] };
  const idx = (t: TimeInput) => resolveIndex(visible, t, start);
  for (const a of annotations) {
    if (a.type === 'zone') {
      const color = p.tones[a.tone ?? 'info'];
      items.zones.push({
        top: Math.max(a.top, a.bottom),
        bottom: Math.min(a.top, a.bottom),
        from: a.from === undefined ? undefined : idx(a.from),
        to: a.to === undefined ? undefined : idx(a.to),
        label: a.label,
        color,
        fill: withAlpha(color, 0.14),
      });
    } else if (a.type === 'vline') {
      items.vlines.push({ index: idx(a.time), label: a.label, color: p.tones[a.tone ?? 'muted'] });
    } else if (a.type === 'line') {
      // Unlike zones, a line endpoint must not be clamped to the window edge: that would keep
      // its price but move its time and change the slope. Candle indices map to logical
      // positions even outside the visible slice.
      const lineIdx = (t: TimeInput) => (typeof t === 'object' ? t.index - start : idx(t));
      items.lines?.push({
        from: { index: lineIdx(a.from.time), price: a.from.price },
        to: { index: lineIdx(a.to.time), price: a.to.price },
        extend: a.extend ?? false,
        dashed: a.dashed ?? false,
        label: a.label,
        color: p.tones[a.tone ?? 'info'],
      });
    }
  }
  return items;
}

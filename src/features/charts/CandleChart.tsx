import { Suspense, useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
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
  type Series,
} from '@/lib/indicators/indicators';
import { INTERVAL_LABEL, type DatasetName } from '@/lib/trading/candles';
import type { Candle } from '@/types/trading';
import {
  buildMarkers,
  candleIndexAt,
  indicatorLabel,
  isPaneIndicator,
  parseTime,
  pricePrecision,
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
  /** Height of the candle pane in px (indicator panes are added below). */
  height?: number;
  /** Allow panning / zooming (off = static picture that never captures page scroll). */
  interactive?: boolean;
  onPick?: (pick: ChartPick) => void;
  caption?: string;
  className?: string;
}

const PANE_HEIGHT = 110;
const OVERLAY_TONES: Tone[] = ['info', 'warn', 'epic', 'primary'];

/** Candle chart with annotations; handles loading and errors itself. */
export function CandleChart(props: CandleChartProps) {
  const paneCount = props.indicators?.filter(isPaneIndicator).length ?? 0;
  const total = (props.height ?? 320) + paneCount * PANE_HEIGHT;
  return (
    <figure className={props.className}>
      <ErrorBoundary
        resetKey={props.dataset}
        fallback={(error, reset) => (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-surface p-4 text-center text-sm text-text-muted"
            style={{ height: total }}
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
            <div style={{ height: total }}>
              <Skeleton className="h-full w-full rounded-2xl" />
            </div>
          }
        >
          <ChartBody {...props} totalHeight={total} />
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
  const height = props.totalHeight;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const annotations = JSON.parse(annotationsKey) as Annotation[];
    const indicators = JSON.parse(indicatorsKey) as IndicatorSpec[];
    const chart = buildChart(el, {
      candles,
      start,
      end,
      annotations,
      indicators,
      volume,
      interactive,
      intraday: interval !== 'D',
      palette,
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
    return () => {
      chart.api.unsubscribeClick(handleClick);
      chart.api.remove();
    };
  }, [candles, start, end, annotationsKey, indicatorsKey, volume, interactive, interval, palette]);

  const legend = [
    `${symbol.replace('USDT', '/USDT')} · ${INTERVAL_LABEL[interval]}`,
    ...(props.indicators ?? []).filter((s) => !isPaneIndicator(s)).map(indicatorLabel),
  ].join(' · ');

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface"
      data-testid="candle-chart"
    >
      <div
        ref={containerRef}
        style={{ height, touchAction: interactive ? 'pan-y' : 'auto' }}
        aria-label={`Свечной график ${legend}`}
        role="img"
      />
      <div className="pointer-events-none absolute top-2 left-3 z-10 rounded-md bg-surface/80 px-1.5 text-xs font-bold text-text-muted">
        {legend}
      </div>
    </div>
  );
}

interface BuildOptions {
  candles: Candle[];
  start: number;
  end: number;
  annotations: Annotation[];
  indicators: IndicatorSpec[];
  volume: boolean;
  interactive: boolean;
  intraday: boolean;
  palette: Palette;
}

interface BuiltChart {
  api: IChartApi;
  mainSeries: ISeriesApi<'Candlestick'>;
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
    rightPriceScale: { borderColor: p.border },
    timeScale: {
      borderColor: p.border,
      timeVisible: o.intraday,
      secondsVisible: false,
      rightOffset: 2,
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

  const mainSeries = api.addSeries(CandlestickSeries, {
    upColor: p.tones.bull,
    downColor: p.tones.bear,
    borderUpColor: p.tones.bull,
    borderDownColor: p.tones.bear,
    wickUpColor: p.tones.bull,
    wickDownColor: p.tones.bear,
    priceFormat: { type: 'price', precision, minMove: 10 ** -precision },
  });
  mainSeries.setData(
    visible.map((c) => ({ time: toChartTime(c.t), open: c.o, high: c.h, low: c.l, close: c.c })),
  );

  if (o.volume) {
    const vol = api.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    vol.setData(
      visible.map((c) => ({
        time: toChartTime(c.t),
        value: c.v,
        color: withAlpha(c.c >= c.o ? p.tones.bull : p.tones.bear, 0.35),
      })),
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

  for (const a of o.annotations) {
    if (a.type !== 'hline') continue;
    mainSeries.createPriceLine({
      price: a.price,
      color: p.tones[a.tone ?? 'info'],
      lineWidth: 2,
      lineStyle: a.dashed ? LineStyle.Dashed : LineStyle.Solid,
      axisLabelVisible: true,
      title: a.label ?? '',
    });
  }

  const markers = buildMarkers(visible, o.annotations);
  if (markers.length > 0) {
    createSeriesMarkers(
      mainSeries,
      markers.map((m) => ({
        time: toChartTime(visible[m.index]?.t ?? 0),
        position: m.position,
        shape: m.shape,
        color: p.tones[m.tone],
        text: m.text,
      })),
    );
  }

  const overlay = overlayItems(visible, o.annotations, p);
  if (overlay.zones.length + overlay.vlines.length > 0) {
    mainSeries.attachPrimitive(new OverlayPrimitive(overlay));
  }

  api.timeScale().fitContent();
  return { api, mainSeries };
}

function overlayItems(visible: Candle[], annotations: Annotation[], p: Palette): OverlayItems {
  const items: OverlayItems = { zones: [], vlines: [] };
  const idx = (t: TimeInput) => candleIndexAt(visible, parseTime(t));
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
    }
  }
  return items;
}

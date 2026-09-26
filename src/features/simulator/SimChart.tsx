import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { ema, rsi, closesOf, type Series } from '@/lib/indicators/indicators';
import { visibleWindow, windowStart } from '@/lib/trading/simSession';
import type { Candle } from '@/types/trading';
import {
  pricePrecision,
  toChartTime,
  withAlpha,
  type Palette,
  type Tone,
} from '../charts/annotations';
import { usePalette } from '../charts/usePalette';

export interface SimIndicators {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  rsi: boolean;
  volume: boolean;
}

export type LevelId = 'entry' | 'sl' | 'tp' | 'ideal-sl' | 'ideal-tp' | `line-${number}`;

export interface SimLevel {
  id: LevelId;
  price: number;
  tone: Tone;
  label: string;
  draggable?: boolean;
  dashed?: boolean;
}

export interface SimMarker {
  index: number;
  position: 'above' | 'below';
  text: string;
  tone: Tone;
  shape?: 'arrowUp' | 'arrowDown' | 'circle';
}

export interface SimChartProps {
  candles: readonly Candle[];
  /** Cursor where the current decision started: fixes the left edge of the window. */
  anchor: number;
  /** Last candle the learner may see. */
  cursor: number;
  intraday: boolean;
  indicators: SimIndicators;
  levels: SimLevel[];
  markers?: SimMarker[];
  onLevelDrag?: (id: LevelId, price: number) => void;
  /** Click on the price pane (used for drawing levels). */
  onPriceClick?: (price: number) => void;
  height: number;
}

const RSI_PANE_SHARE = 0.28;
const GRAB_PX = 8;

interface Built {
  api: IChartApi;
  main: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'> | null;
  lines: { series: ISeriesApi<'Line'>; values: Series }[];
}

/**
 * Simulator chart. Receives the full dataset but only ever draws candles up to `cursor`
 * (via `visibleWindow`); indicators are causal, so their values up to `cursor` don't leak
 * the future either. New candles during playback are appended without a rebuild.
 */
export function SimChart(props: SimChartProps) {
  const { candles, anchor, cursor, intraday, indicators, height } = props;
  const palette = usePalette();
  const containerRef = useRef<HTMLDivElement>(null);
  const builtRef = useRef<Built | null>(null);
  const shownRef = useRef<{ from: number; to: number } | null>(null);
  const levelsRef = useRef(props.levels);
  const dragRef = useRef(props.onLevelDrag);
  const clickRef = useRef(props.onPriceClick);
  useEffect(() => {
    levelsRef.current = props.levels;
    dragRef.current = props.onLevelDrag;
    clickRef.current = props.onPriceClick;
  });
  const indicatorsKey = JSON.stringify(indicators);

  // Chart and series: rebuilt when the dataset, indicator set or theme changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const built = buildChart(
      el,
      candles,
      JSON.parse(indicatorsKey) as SimIndicators,
      palette,
      intraday,
    );
    builtRef.current = built;
    shownRef.current = null;

    const handleClick = (param: MouseEventParams<Time>) => {
      const onClick = clickRef.current;
      if (!onClick || !param.point || (param.paneIndex ?? 0) !== 0) return;
      const price = built.main.coordinateToPrice(param.point.y);
      if (price !== null) onClick(price);
    };
    built.api.subscribeClick(handleClick);

    // Dragging SL/TP lines: grab within a few pixels of a draggable line.
    let dragging: LevelId | null = null;
    const localY = (e: PointerEvent) => e.clientY - el.getBoundingClientRect().top;
    const grabbable = (y: number): LevelId | null => {
      let best: { id: LevelId; dist: number } | null = null;
      for (const level of levelsRef.current) {
        if (!level.draggable) continue;
        const ly = built.main.priceToCoordinate(level.price);
        if (ly === null) continue;
        const dist = Math.abs(ly - y);
        if (dist <= GRAB_PX && (!best || dist < best.dist)) best = { id: level.id, dist };
      }
      return best?.id ?? null;
    };
    const setScroll = (enabled: boolean) =>
      built.api.applyOptions({
        handleScroll: enabled
          ? { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }
          : false,
        handleScale: enabled
          ? {
              mouseWheel: false,
              pinch: true,
              axisPressedMouseMove: true,
              axisDoubleClickReset: true,
            }
          : false,
      });
    const onDown = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const id = grabbable(localY(e));
      if (!id) return;
      dragging = id;
      setScroll(false);
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      const y = localY(e);
      if (!dragging) {
        el.style.cursor = dragRef.current && grabbable(y) ? 'ns-resize' : '';
        return;
      }
      const price = built.main.coordinateToPrice(y);
      if (price !== null && price > 0) dragRef.current?.(dragging, price);
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = null;
      setScroll(true);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    // Capture phase: decide before the chart starts panning.
    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      built.api.unsubscribeClick(handleClick);
      built.api.remove();
      builtRef.current = null;
    };
  }, [candles, indicatorsKey, palette, intraday]);

  // Data: the visible window only. Playback appends; anything else resets the view.
  useEffect(() => {
    const built = builtRef.current;
    if (!built) return;
    const from = windowStart(anchor);
    const to = Math.min(cursor, candles.length - 1);
    const shown = shownRef.current;
    if (shown && shown.from === from && to > shown.to) {
      for (let i = shown.to + 1; i <= to; i++) appendCandle(built, candles, i, palette);
    } else {
      setWindow(built, candles, anchor, to, palette);
      built.api.timeScale().fitContent();
    }
    shownRef.current = { from, to };
  }, [candles, anchor, cursor, indicatorsKey, palette, intraday]);

  // Levels (entry / SL / TP / drawn lines): cheap to redraw on every change.
  const levelsKey = JSON.stringify(props.levels);
  useEffect(() => {
    const built = builtRef.current;
    if (!built) return;
    const lines: IPriceLine[] = (JSON.parse(levelsKey) as SimLevel[]).map((level) =>
      built.main.createPriceLine({
        price: level.price,
        color: palette.tones[level.tone],
        lineWidth: 2,
        lineStyle: level.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title: level.label,
      }),
    );
    return () => {
      if (builtRef.current !== built) return;
      for (const line of lines) built.main.removePriceLine(line);
    };
  }, [levelsKey, candles, indicatorsKey, palette, intraday]);

  // Entry / exit markers.
  const markersKey = JSON.stringify(props.markers ?? []);
  useEffect(() => {
    const built = builtRef.current;
    const specs = JSON.parse(markersKey) as SimMarker[];
    if (!built || specs.length === 0) return;
    const plugin: ISeriesMarkersPluginApi<Time> = createSeriesMarkers(
      built.main,
      specs
        .filter((m) => m.index <= cursor && candles[m.index])
        .map((m) => ({
          time: toChartTime(candles[m.index]?.t ?? 0),
          position: m.position === 'above' ? 'aboveBar' : 'belowBar',
          shape: m.shape ?? (m.position === 'above' ? 'arrowDown' : 'arrowUp'),
          color: palette.tones[m.tone],
          text: m.text,
        })),
    );
    return () => {
      if (builtRef.current === built) plugin.detach();
    };
  }, [markersKey, cursor, candles, indicatorsKey, palette, intraday]);

  return (
    <div
      ref={containerRef}
      data-testid="sim-chart"
      role="img"
      aria-label="График тренажёра: видны только свечи до текущего момента"
      className="overflow-hidden rounded-2xl border-2 border-border bg-surface"
      style={{ height, touchAction: 'pan-y' }}
    />
  );
}

function buildChart(
  el: HTMLElement,
  candles: readonly Candle[],
  indicators: SimIndicators,
  p: Palette,
  intraday: boolean,
): Built {
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
      timeVisible: intraday,
      secondsVisible: false,
      rightOffset: 6,
    },
    crosshair: { mode: 0 },
    localization: { locale: 'ru-RU' },
    handleScroll: {
      mouseWheel: false,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false,
    },
    handleScale: {
      mouseWheel: false,
      pinch: true,
      axisPressedMouseMove: true,
      axisDoubleClickReset: true,
    },
  });
  const precision = pricePrecision(candles.at(-1)?.c ?? 1);
  const main = api.addSeries(CandlestickSeries, {
    upColor: p.tones.bull,
    downColor: p.tones.bear,
    borderUpColor: p.tones.bull,
    borderDownColor: p.tones.bear,
    wickUpColor: p.tones.bull,
    wickDownColor: p.tones.bear,
    priceFormat: { type: 'price', precision, minMove: 10 ** -precision },
  });
  let volume: ISeriesApi<'Histogram'> | null = null;
  if (indicators.volume) {
    volume = api.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
  }
  const closes = closesOf(candles);
  const lines: Built['lines'] = [];
  const addLine = (values: Series, color: string, pane = 0, title = '') => {
    const series = api.addSeries(
      LineSeries,
      {
        color,
        lineWidth: 2,
        title,
        lastValueVisible: title !== '',
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      },
      pane,
    );
    lines.push({ series, values });
  };
  if (indicators.ema20) addLine(ema(closes, 20), p.tones.info);
  if (indicators.ema50) addLine(ema(closes, 50), p.tones.warn);
  if (indicators.ema200) addLine(ema(closes, 200), p.tones.epic);
  if (indicators.rsi) {
    addLine(rsi(closes, 14), p.tones.epic, 1, 'RSI 14');
    const rsiSeries = lines.at(-1)?.series;
    for (const level of [70, 30]) {
      rsiSeries?.createPriceLine({
        price: level,
        color: p.muted,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: '',
      });
    }
    const panes = api.panes();
    panes[0]?.setStretchFactor(1 - RSI_PANE_SHARE);
    panes[1]?.setStretchFactor(RSI_PANE_SHARE);
  }
  return { api, main, volume, lines };
}

const candleBar = (c: Candle) => ({
  time: toChartTime(c.t),
  open: c.o,
  high: c.h,
  low: c.l,
  close: c.c,
});

const volumeBar = (c: Candle, p: Palette) => ({
  time: toChartTime(c.t),
  value: c.v,
  color: withAlpha(c.c >= c.o ? p.tones.bull : p.tones.bear, 0.35),
});

function setWindow(
  built: Built,
  candles: readonly Candle[],
  anchor: number,
  to: number,
  p: Palette,
) {
  const from = windowStart(anchor);
  const shown = visibleWindow(candles, anchor, to);
  built.main.setData(shown.map(candleBar));
  built.volume?.setData(shown.map((c) => volumeBar(c, p)));
  for (const { series, values } of built.lines) {
    const data = [];
    for (let i = from; i <= to; i++) {
      const value = values[i];
      const candle = candles[i];
      if (candle && value !== null && value !== undefined) {
        data.push({ time: toChartTime(candle.t), value });
      }
    }
    series.setData(data);
  }
}

function appendCandle(built: Built, candles: readonly Candle[], i: number, p: Palette) {
  const candle = candles[i];
  if (!candle) return;
  built.main.update(candleBar(candle));
  built.volume?.update(volumeBar(candle, p));
  for (const { series, values } of built.lines) {
    const value = values[i];
    if (value !== null && value !== undefined)
      series.update({ time: toChartTime(candle.t), value });
  }
}

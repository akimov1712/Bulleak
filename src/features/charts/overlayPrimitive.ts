/**
 * Series primitive that draws price zones (rectangles) and vertical time markers
 * on the candle pane. Coordinates are recomputed on every redraw, so it follows
 * scrolling, zoom and autoscale.
 */
import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';

type DrawTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

export interface OverlayZone {
  top: number;
  bottom: number;
  /** Indices within the visible slice; undefined = chart edge. */
  from?: number;
  to?: number;
  label?: string;
  color: string;
  fill: string;
}

export interface OverlayVLine {
  index: number;
  label?: string;
  color: string;
}

export interface OverlayItems {
  zones: OverlayZone[];
  vlines: OverlayVLine[];
}

interface Resolved {
  zones: { x1: number; x2: number | null; y1: number; y2: number; zone: OverlayZone }[];
  vlines: { x: number; line: OverlayVLine }[];
}

class OverlayRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly data: Resolved,
    private readonly font: string,
  ) {}

  draw(target: DrawTarget) {
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      ctx.font = this.font;
      ctx.textBaseline = 'top';
      for (const { x1, x2, y1, y2, zone } of this.data.zones) {
        const left = Math.max(0, x1);
        const right = Math.min(mediaSize.width, x2 ?? mediaSize.width);
        if (right <= left) continue;
        const top = Math.min(y1, y2);
        const h = Math.abs(y2 - y1);
        ctx.fillStyle = zone.fill;
        ctx.fillRect(left, top, right - left, h);
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, h - 1);
        ctx.setLineDash([]);
        if (zone.label) {
          ctx.fillStyle = zone.color;
          ctx.fillText(zone.label, left + 6, top + 4);
        }
      }
      for (const { x, line } of this.data.vlines) {
        if (x < 0 || x > mediaSize.width) continue;
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, mediaSize.height);
        ctx.stroke();
        ctx.setLineDash([]);
        if (line.label) {
          ctx.fillStyle = line.color;
          ctx.fillText(line.label, x + 5, 30);
        }
      }
    });
  }
}

class OverlayView implements IPrimitivePaneView {
  constructor(private readonly source: OverlayPrimitive) {}

  zOrder() {
    return 'bottom' as const;
  }

  renderer() {
    return new OverlayRenderer(this.source.resolve(), this.source.font);
  }
}

export class OverlayPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private readonly views = [new OverlayView(this)];

  constructor(
    private items: OverlayItems,
    readonly font = "600 12px 'Nunito Variable', Nunito, system-ui, sans-serif",
  ) {}

  attached(param: SeriesAttachedParameter<Time>) {
    this.chart = param.chart as IChartApi;
    this.series = param.series;
    this.requestUpdate = param.requestUpdate;
  }

  detached() {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  setItems(items: OverlayItems) {
    this.items = items;
    this.requestUpdate?.();
  }

  paneViews() {
    return this.views;
  }

  resolve(): Resolved {
    const chart = this.chart;
    const series = this.series;
    if (!chart || !series) return { zones: [], vlines: [] };
    const ts = chart.timeScale();
    // Half a bar of padding so a zone covers its first and last candles entirely.
    const x = (index: number, edge: -0.5 | 0.5) =>
      ts.logicalToCoordinate((index + edge) as Logical);
    const zones: Resolved['zones'] = [];
    for (const zone of this.items.zones) {
      const y1 = series.priceToCoordinate(zone.top);
      const y2 = series.priceToCoordinate(zone.bottom);
      if (y1 === null || y2 === null) continue;
      const x1 = zone.from === undefined ? 0 : x(zone.from, -0.5);
      const x2 = zone.to === undefined ? null : x(zone.to, 0.5);
      if (x1 === null) continue;
      zones.push({ x1, x2, y1, y2, zone });
    }
    const vlines: Resolved['vlines'] = [];
    for (const line of this.items.vlines) {
      const cx = ts.logicalToCoordinate(line.index as Logical);
      if (cx !== null) vlines.push({ x: cx, line });
    }
    return { zones, vlines };
  }
}

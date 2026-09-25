/**
 * Chart annotation model used by lessons (MDX) and quizzes, plus the pure helpers
 * that turn it into lightweight-charts markers / price lines. See content-pipeline.md.
 */
import type { UTCTimestamp } from 'lightweight-charts';
import { findSwings, type Swing } from '@/lib/indicators/patterns';
import type { Candle } from '@/types/trading';

export type Tone = 'bull' | 'bear' | 'info' | 'warn' | 'epic' | 'muted' | 'primary';

/** Times are ms UTC (or a date string like "2024-03-05" / "2024-03-05T08:00Z"). */
export type TimeInput = number | string;

export type Annotation =
  | { type: 'hline'; price: number; label?: string; tone?: Tone; dashed?: boolean }
  | {
      type: 'zone';
      top: number;
      bottom: number;
      from?: TimeInput;
      to?: TimeInput;
      label?: string;
      tone?: Tone;
    }
  | {
      type: 'marker';
      time: TimeInput;
      position?: 'above' | 'below';
      shape?: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
      text?: string;
      tone?: Tone;
    }
  | { type: 'vline'; time: TimeInput; label?: string; tone?: Tone }
  /** Auto-detected swing points labelled HH / HL / LH / LL. */
  | { type: 'swings'; n?: number };

export type IndicatorSpec =
  | { type: 'sma' | 'ema'; period: number; tone?: Tone }
  | { type: 'bollinger'; period?: number; mult?: number }
  | { type: 'rsi'; period?: number }
  | { type: 'macd' }
  | { type: 'atr'; period?: number };

export const PANE_INDICATORS = ['rsi', 'macd', 'atr'] as const;
export const isPaneIndicator = (spec: IndicatorSpec) =>
  (PANE_INDICATORS as readonly string[]).includes(spec.type);

export function indicatorLabel(spec: IndicatorSpec): string {
  switch (spec.type) {
    case 'sma':
      return `SMA ${spec.period}`;
    case 'ema':
      return `EMA ${spec.period}`;
    case 'bollinger':
      return `BB ${spec.period ?? 20}, ${spec.mult ?? 2}`;
    case 'rsi':
      return `RSI ${spec.period ?? 14}`;
    case 'macd':
      return 'MACD 12, 26, 9';
    case 'atr':
      return `ATR ${spec.period ?? 14}`;
  }
}

export function parseTime(input: TimeInput): number {
  if (typeof input === 'number') return input;
  const ms = Date.parse(
    /[zZ]|[+-]\d\d:?\d\d$/.test(input) || !input.includes('T') ? input : `${input}Z`,
  );
  if (Number.isNaN(ms)) throw new Error(`Неверная дата в разметке графика: ${input}`);
  return ms;
}

export const toChartTime = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;

/** Index of the last candle whose open time is ≤ t (clamped to [0, length-1]). */
export function candleIndexAt(candles: readonly Candle[], t: number): number {
  let lo = 0;
  let hi = candles.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((candles[mid]?.t ?? Infinity) <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export interface VisibleRange {
  start: number;
  end: number;
}

/**
 * Which slice of the dataset to show: explicit from/to, or `bars` candles
 * ending at `to` (default: the latest candle).
 */
export function visibleRange(
  candles: readonly Candle[],
  opts: { from?: TimeInput; to?: TimeInput; bars?: number },
): VisibleRange {
  const last = candles.length - 1;
  const end = opts.to === undefined ? last : candleIndexAt(candles, parseTime(opts.to));
  const start =
    opts.from === undefined
      ? Math.max(0, end - (opts.bars ?? 120) + 1)
      : candleIndexAt(candles, parseTime(opts.from));
  return { start: Math.min(start, end), end };
}

export type SwingLabel = 'HH' | 'HL' | 'LH' | 'LL';

/** Label each swing relative to the previous swing of the same kind (first ones get null). */
export function labelSwings(swings: readonly Swing[]): (Swing & { label: SwingLabel | null })[] {
  let prevHigh: number | null = null;
  let prevLow: number | null = null;
  return swings.map((s) => {
    let label: SwingLabel | null = null;
    if (s.kind === 'high') {
      if (prevHigh !== null) label = s.price > prevHigh ? 'HH' : 'LH';
      prevHigh = s.price;
    } else {
      if (prevLow !== null) label = s.price > prevLow ? 'HL' : 'LL';
      prevLow = s.price;
    }
    return { ...s, label };
  });
}

export interface MarkerSpec {
  /** Index within the visible slice. */
  index: number;
  position: 'aboveBar' | 'belowBar';
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
  tone: Tone;
}

/** Explicit markers + auto swing labels, sorted by time (lightweight-charts requires it). */
export function buildMarkers(
  visible: readonly Candle[],
  annotations: readonly Annotation[],
): MarkerSpec[] {
  const out: MarkerSpec[] = [];
  for (const a of annotations) {
    if (a.type === 'marker') {
      const below = (a.position ?? 'below') === 'below';
      out.push({
        index: candleIndexAt(visible, parseTime(a.time)),
        position: below ? 'belowBar' : 'aboveBar',
        shape: a.shape ?? (below ? 'arrowUp' : 'arrowDown'),
        text: a.text ?? '',
        tone: a.tone ?? 'info',
      });
    } else if (a.type === 'swings') {
      for (const s of labelSwings(findSwings(visible, a.n ?? 3))) {
        if (!s.label) continue;
        const high = s.kind === 'high';
        out.push({
          index: s.index,
          position: high ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          text: s.label,
          tone: s.label === 'HH' || s.label === 'HL' ? 'bull' : 'bear',
        });
      }
    }
  }
  return out.sort((x, y) => x.index - y.index);
}

/** Price decimals for display, by magnitude (BTC 1, ETH/SOL 2, cheap coins more). */
export function pricePrecision(price: number): number {
  if (price >= 10000) return 1;
  if (price >= 10) return 2;
  if (price >= 1) return 3;
  return 5;
}

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  tones: Record<Tone, string>;
}

const TONE_VARS: Record<Tone, string> = {
  bull: '--bull',
  bear: '--bear',
  info: '--info',
  warn: '--warn',
  epic: '--epic',
  muted: '--text-muted',
  primary: '--primary',
};

/** Read the current theme colours from CSS custom properties. */
export function readPalette(el: Element = document.documentElement): Palette {
  const style = getComputedStyle(el);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const tones = Object.fromEntries(
    Object.entries(TONE_VARS).map(([tone, name]) => [tone, v(name, '#888888')]),
  ) as Record<Tone, string>;
  return {
    bg: v('--bg', '#ffffff'),
    surface: v('--surface', '#ffffff'),
    text: v('--text', '#1a1d2b'),
    muted: v('--text-muted', '#5c6480'),
    border: v('--border', '#dde2ee'),
    tones,
  };
}

/** `#rrggbb` + alpha → rgba(); other colour formats are returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m?.[1]) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Visible part of a chart in logical (bar index) units, as lightweight-charts reports it. */
export interface LogicalRange {
  from: number;
  to: number;
}

/** Fewest bars a zoom-in may leave on screen. */
export const MIN_BARS = 10;

/**
 * New visible range after zooming by `factor` (< 1 — closer, > 1 — farther), keeping the
 * right edge in place: the latest candles stay on screen, as in trading terminals.
 * `total` limits zoom-out to roughly the whole series (plus a small margin).
 */
export function zoomRange(range: LogicalRange, factor: number, total: number): LogicalRange {
  const width = range.to - range.from;
  if (!(width > 0) || !(factor > 0)) return range;
  const maxWidth = Math.max(MIN_BARS, total * 1.1);
  const next = Math.min(maxWidth, Math.max(MIN_BARS, width * factor));
  return { from: range.to - next, to: range.to };
}

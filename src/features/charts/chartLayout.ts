/**
 * Chart chrome sizes shared by CandleChart and its lazy wrapper (a tiny module, so the lazy
 * wrapper does not pull lightweight-charts into the main chunk).
 */

/** Header row(s) plus borders around the plot, measured in the browser. */
export const HEADER_HEIGHT = 35;
export const HEADER_OHLC_HEIGHT = 54;

/** Full height of a chart card whose plot is `plotHeight` px tall. */
export const chartCardHeight = (plotHeight: number, ohlc = true) =>
  plotHeight + (ohlc ? HEADER_OHLC_HEIGHT : HEADER_HEIGHT);

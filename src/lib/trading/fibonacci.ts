/**
 * Fibonacci retracement and extension levels (m06-l02). A retracement is drawn from the start
 * of an impulse to its end: in an up-move from the swing low to the swing high.
 */

export const RETRACEMENT_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
export const EXTENSION_RATIOS = [1.272, 1.618] as const;

export interface FibLevel {
  ratio: number;
  price: number;
}

/**
 * Retracement levels of the move `from` → `to`. For an up-move (from = low, to = high) the level
 * is `high − (high − low) × k`; for a down-move the mirror `low + (high − low) × k`.
 * Ratio 0 is the end of the move, ratio 1 its start.
 */
export function fibRetracement(
  from: number,
  to: number,
  ratios: readonly number[] = RETRACEMENT_RATIOS,
): FibLevel[] {
  return ratios.map((ratio) => ({ ratio, price: to - (to - from) * ratio }));
}

/**
 * Extension targets beyond the end of the move: `from + (to − from) × k`
 * (k = 1.272 → 27.2 % past the end of the impulse).
 */
export function fibExtension(
  from: number,
  to: number,
  ratios: readonly number[] = EXTENSION_RATIOS,
): FibLevel[] {
  return ratios.map((ratio) => ({ ratio, price: from + (to - from) * ratio }));
}

/** The "golden pocket" — the 0.5–0.618 retracement zone, as [nearer, deeper] prices. */
export function goldenPocket(from: number, to: number): { top: number; bottom: number } {
  const a = to - (to - from) * 0.5;
  const b = to - (to - from) * 0.618;
  return { top: Math.max(a, b), bottom: Math.min(a, b) };
}

/** A click near a candle snaps to its nearer extreme: the high or the low. */
export function snapToExtreme(candle: { h: number; l: number }, price: number): number {
  return Math.abs(price - candle.h) <= Math.abs(price - candle.l) ? candle.h : candle.l;
}

/** How deep a pullback went, as a share of the move (0 = none, 1 = the whole move). */
export function retracementDepth(from: number, to: number, pullback: number): number | null {
  if (to === from) return null;
  return (to - pullback) / (to - from);
}

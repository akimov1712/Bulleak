/** Profit and loss of a linear (USDT) position. */

import type { Side } from '@/types/trading';

export type { Side };

/** Long: `(exit − entry) × qty`, short: `(entry − exit) × qty`. Null for invalid input. */
export function pnl(side: Side, entry: number, exit: number, qty: number): number | null {
  if (![entry, exit, qty].every(Number.isFinite) || entry <= 0 || exit <= 0 || qty <= 0) {
    return null;
  }
  return side === 'long' ? (exit - entry) * qty : (entry - exit) * qty;
}

/** Price move in the position's favour, % of entry (negative = against). */
export function movePct(side: Side, entry: number, exit: number): number | null {
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || entry <= 0 || exit <= 0) return null;
  const move = ((exit - entry) / entry) * 100;
  return side === 'long' ? move : -move;
}

/** Return on margin (ROE, as Bybit shows it): the price move × leverage, in %. */
export function roePct(side: Side, entry: number, exit: number, leverage: number): number | null {
  const move = movePct(side, entry, exit);
  if (move === null || !Number.isFinite(leverage) || leverage < 1) return null;
  return move * leverage;
}

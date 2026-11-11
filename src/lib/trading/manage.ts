/**
 * Managing an open simulator trade (docs/04-features/stats-v2.md, section 3): moving the stop
 * or the take profit and closing half of the position. Every action is recorded in the trade.
 */
import type { Candle, Side, TradeAction } from '@/types/trading';
import { bookPart, type SimOrder, type TradeState } from './simulate';

/** Share of the position closed by «Закрыть 50 %». */
export const PARTIAL_SHARE = 0.5;

/**
 * A level can move to `price` only on its own side of the last close: the stop below the price
 * for a long (above for a short), the take profit on the other side.
 */
export function canMoveLevel(
  side: Side,
  level: 'sl' | 'tp',
  price: number,
  lastClose: number,
): boolean {
  if (!(Number.isFinite(price) && price > 0)) return false;
  const below = price < lastClose;
  const above = price > lastClose;
  if (level === 'sl') return side === 'long' ? below : above;
  return side === 'long' ? above : below;
}

/** The stop moved away from the price: more risk than before. */
export const movedAway = (side: Side, from: number, to: number): boolean =>
  side === 'long' ? to < from : to > from;

/** Moves a level of the open trade; null when the price is on the wrong side. */
export function moveLevel(
  order: SimOrder,
  level: 'sl' | 'tp',
  price: number,
  lastClose: number,
): SimOrder | null {
  if (!canMoveLevel(order.side, level, price, lastClose)) return null;
  return { ...order, [level]: price };
}

/**
 * Closes PARTIAL_SHARE of the position at the close of the last replayed candle. Once per
 * trade; null when already done or the trade is over.
 */
export function closePart(
  candles: readonly Candle[],
  order: SimOrder,
  state: TradeState,
  share = PARTIAL_SHARE,
): { order: SimOrder; state: TradeState } | null {
  const candle = candles[state.index];
  if (state.result || state.partial || !candle || !(share > 0 && share < 1)) return null;
  const qty = order.qty * share;
  return {
    order: { ...order, qty: order.qty - qty },
    state: {
      ...state,
      plannedRisk: state.plannedRisk ?? Math.abs(order.entry - order.sl) * order.qty,
      partial: bookPart(order, qty, candle.c),
    },
  };
}

/** Levels in force at the exit (after all moves). */
export function finalLevels(t: { sl: number; tp: number; actions?: readonly TradeAction[] }) {
  let { sl, tp } = t;
  for (const a of t.actions ?? []) {
    if (a.kind === 'move-sl') sl = a.price;
    if (a.kind === 'move-tp') tp = a.price;
  }
  return { sl, tp };
}

/**
 * Did the learner move the stop away from the price at any point? Undefined for trades
 * recorded before actions existed (the rule does not apply to them).
 */
export function stopMovedAway(t: { side: Side; sl: number; actions?: readonly TradeAction[] }) {
  if (!t.actions) return undefined;
  let sl = t.sl;
  for (const a of t.actions) {
    if (a.kind !== 'move-sl') continue;
    if (movedAway(t.side, sl, a.price)) return true;
    sl = a.price;
  }
  return false;
}

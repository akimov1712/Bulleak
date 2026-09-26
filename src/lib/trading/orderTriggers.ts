/**
 * When do resting orders fire? Used by the interactive order-types diagram.
 * Orders fire once the price *touches* their level, so what matters is the range the
 * price has visited (low…high), not only where it is now.
 */

export type RestingOrderKind =
  /** Buy at this price or cheaper: fires when price falls to the level. */
  | 'limit-buy'
  /** Sell at this price or higher: fires when price rises to the level. */
  | 'limit-sell'
  /** Conditional buy (breakout): market buy when price rises to the trigger. */
  | 'stop-buy'
  /** Conditional sell / stop-loss of a long: market sell when price falls to the trigger. */
  | 'stop-sell';

export interface RestingOrder {
  id: string;
  kind: RestingOrderKind;
  price: number;
}

/** Fires when the level is at or below the start price and the price came down to it. */
const firesOnDrop = (kind: RestingOrderKind) => kind === 'limit-buy' || kind === 'stop-sell';

export function isTriggered(order: RestingOrder, visitedLow: number, visitedHigh: number): boolean {
  return firesOnDrop(order.kind) ? visitedLow <= order.price : visitedHigh >= order.price;
}

export interface PriceWalk {
  low: number;
  high: number;
  current: number;
}

export const startWalk = (price: number): PriceWalk => ({
  low: price,
  high: price,
  current: price,
});

export const moveTo = (walk: PriceWalk, price: number): PriceWalk => ({
  low: Math.min(walk.low, price),
  high: Math.max(walk.high, price),
  current: price,
});

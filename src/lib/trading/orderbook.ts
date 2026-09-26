/** Order-book maths for lessons: how a market order walks the book. */

export interface BookLevel {
  price: number;
  /** Quantity in base currency (e.g. BTC). */
  qty: number;
}

export interface MarketFill {
  /** Quantity taken from each level, in book order (best price first). */
  fills: { price: number; qty: number }[];
  filledQty: number;
  /** Total paid (buy) or received (sell) in quote currency. */
  cost: number;
  /** cost / filledQty; null when nothing was filled. */
  avgPrice: number | null;
  /** Part of the order that could not be filled (book too thin). */
  unfilledQty: number;
  /** avgPrice vs the best price, in % (positive = worse for the taker). */
  slippagePct: number;
}

/**
 * Fill a market order of `qty` against `levels` (asks for a buy, bids for a sell),
 * which must be sorted best price first.
 */
export function fillMarketOrder(levels: readonly BookLevel[], qty: number): MarketFill {
  const fills: MarketFill['fills'] = [];
  let left = Math.max(0, qty);
  let cost = 0;
  for (const level of levels) {
    if (left <= 1e-12) break;
    const take = Math.min(left, level.qty);
    if (take <= 0) continue;
    fills.push({ price: level.price, qty: take });
    cost += take * level.price;
    left -= take;
  }
  const filledQty = Math.max(0, qty) - left;
  const avgPrice = filledQty > 0 ? cost / filledQty : null;
  const best = levels[0]?.price;
  const slippagePct =
    avgPrice !== null && best !== undefined && best > 0
      ? (Math.abs(avgPrice - best) / best) * 100
      : 0;
  return { fills, filledQty, cost, avgPrice, unfilledQty: Math.max(0, left), slippagePct };
}

/** Best ask − best bid, absolute and in % of the mid price. */
export function spread(bestBid: number, bestAsk: number): { abs: number; pct: number } {
  const abs = bestAsk - bestBid;
  const mid = (bestAsk + bestBid) / 2;
  return { abs, pct: mid > 0 ? (abs / mid) * 100 : 0 };
}

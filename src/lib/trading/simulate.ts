/**
 * Trade simulation on historical candles (simulator.md, «Логика»). The position is opened
 * at market on the close of candle `startIndex`; each later candle is checked for the stop
 * and the take profit. Pure functions: the simulator page replays a trade with `stepTrade`
 * candle by candle, `simulateTrade` runs it to the end at once.
 */

import type { Candle, SimOutcome } from '@/types/trading';
import { BYBIT_BASE_FEES, feeFor } from './fees';
import type { Side } from './pnl';

export const DEFAULT_MAX_BARS = 150;

export interface SimOrder {
  side: Side;
  entry: number;
  sl: number;
  tp: number;
  /** Quantity in coins. */
  qty: number;
  /** Taker fee in % charged on entry and exit (default: Bybit perpetual base taker). */
  feePct?: number;
}

export type OrderError = 'price' | 'qty' | 'sl-side' | 'tp-side';

/** Why an order can't be simulated, or null when it's fine. */
export function validateOrder(order: SimOrder): OrderError | null {
  const { side, entry, sl, tp, qty } = order;
  if (![entry, sl, tp].every((v) => Number.isFinite(v) && v > 0)) return 'price';
  if (!Number.isFinite(qty) || qty <= 0) return 'qty';
  if (order.feePct !== undefined && !(Number.isFinite(order.feePct) && order.feePct >= 0)) {
    return 'price';
  }
  if (side === 'long' ? sl >= entry : sl <= entry) return 'sl-side';
  if (side === 'long' ? tp <= entry : tp >= entry) return 'tp-side';
  return null;
}

export interface CandleHit {
  outcome: 'tp' | 'sl';
  price: number;
  /** Both levels were inside the candle's range; the stop is assumed first (conservative). */
  ambiguous: boolean;
  /** The candle opened beyond the level, so the fill is at the open (slippage). */
  gap: boolean;
}

/** Did this candle close the position? Null when neither level was reached. */
export function checkCandle(order: SimOrder, candle: Candle): CandleHit | null {
  const long = order.side === 'long';
  const pastSl = (price: number) => (long ? price <= order.sl : price >= order.sl);
  const pastTp = (price: number) => (long ? price >= order.tp : price <= order.tp);
  // The open comes first: a gap through a level fills at the open.
  if (pastSl(candle.o)) return { outcome: 'sl', price: candle.o, ambiguous: false, gap: true };
  if (pastTp(candle.o)) return { outcome: 'tp', price: candle.o, ambiguous: false, gap: true };
  const slHit = pastSl(long ? candle.l : candle.h);
  const tpHit = pastTp(long ? candle.h : candle.l);
  if (slHit) return { outcome: 'sl', price: order.sl, ambiguous: tpHit, gap: false };
  if (tpHit) return { outcome: 'tp', price: order.tp, ambiguous: false, gap: false };
  return null;
}

export interface SimResult {
  exitIndex: number;
  exitPrice: number;
  outcome: SimOutcome;
  /** Result after fees, in USDT. */
  pnl: number;
  /** Result before fees. */
  grossPnl: number;
  /** Entry + exit fees. */
  fees: number;
  /** pnl / planned risk (qty × |entry − sl|). */
  r: number;
  ambiguous: boolean;
  gap: boolean;
}

/** Books the exit: P&L, fees and R for leaving at `exitPrice` on candle `exitIndex`. */
export function closeTrade(
  order: SimOrder,
  exitIndex: number,
  exitPrice: number,
  outcome: SimOutcome,
  flags: { ambiguous?: boolean; gap?: boolean } = {},
): SimResult {
  const { side, entry, sl, qty } = order;
  const feePct = order.feePct ?? BYBIT_BASE_FEES.perpetual.taker;
  const grossPnl = side === 'long' ? (exitPrice - entry) * qty : (entry - exitPrice) * qty;
  const fees = feeFor(entry * qty, feePct) + feeFor(exitPrice * qty, feePct);
  const pnl = grossPnl - fees;
  const risk = Math.abs(entry - sl) * qty;
  return {
    exitIndex,
    exitPrice,
    outcome,
    pnl,
    grossPnl,
    fees,
    r: pnl / risk,
    ambiguous: flags.ambiguous ?? false,
    gap: flags.gap ?? false,
  };
}

export interface TradeState {
  /** Last candle already checked (starts at the entry candle). */
  index: number;
  result: SimResult | null;
}

export const startTrade = (startIndex: number): TradeState => ({ index: startIndex, result: null });

/**
 * Checks the next candle. Closes by SL/TP, or by `timeout` at the close once `maxBars`
 * candles have passed or the data ends. A closed state is returned unchanged.
 */
export function stepTrade(
  candles: readonly Candle[],
  startIndex: number,
  order: SimOrder,
  state: TradeState,
  maxBars = DEFAULT_MAX_BARS,
): TradeState {
  if (state.result) return state;
  const index = state.index + 1;
  const candle = candles[index];
  if (!candle) {
    // No more data: close where we are.
    const last = candles[state.index];
    if (!last) return state;
    return { index: state.index, result: closeTrade(order, state.index, last.c, 'timeout') };
  }
  const hit = checkCandle(order, candle);
  if (hit) {
    return {
      index,
      result: closeTrade(order, index, hit.price, hit.outcome, {
        ambiguous: hit.ambiguous,
        gap: hit.gap,
      }),
    };
  }
  const timedOut = index - startIndex >= maxBars || index === candles.length - 1;
  return { index, result: timedOut ? closeTrade(order, index, candle.c, 'timeout') : null };
}

/** Manual exit at the close of the last replayed candle. */
export function closeManually(
  candles: readonly Candle[],
  order: SimOrder,
  state: TradeState,
): TradeState {
  const candle = candles[state.index];
  if (state.result || !candle) return state;
  return { index: state.index, result: closeTrade(order, state.index, candle.c, 'manual') };
}

/**
 * Runs the whole trade. Null when the order is invalid or there is no candle after the
 * entry to replay.
 */
export function simulateTrade(
  candles: readonly Candle[],
  startIndex: number,
  order: SimOrder,
  maxBars = DEFAULT_MAX_BARS,
): SimResult | null {
  if (validateOrder(order) !== null) return null;
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= candles.length - 1) {
    return null;
  }
  if (!Number.isInteger(maxBars) || maxBars < 1) return null;
  let state = startTrade(startIndex);
  while (!state.result) state = stepTrade(candles, startIndex, order, state, maxBars);
  return state.result;
}

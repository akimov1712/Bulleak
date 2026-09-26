/**
 * Live plan of a simulator trade (order panel, simulator.md «Экран»): position size from
 * the risk, R:R, margin, approximate liquidation and warnings. Pure; the panel only shows it.
 */

import type { DatasetSymbol } from './candles';
import { BYBIT_BASE_FEES, feeFor } from './fees';
import { BTCUSDT_MMR_PCT, liquidationPrice, stopBeyondLiquidation } from './liquidation';
import type { Side } from './pnl';
import { positionSize, roundToStep } from './position';
import { validateOrder, type OrderError } from './simulate';

/** Bybit linear perpetual quantity steps and price ticks (instrument info, 2026-09). */
export const INSTRUMENT_STEPS: Record<DatasetSymbol, { qty: number; tick: number }> = {
  BTCUSDT: { qty: 0.001, tick: 0.1 },
  ETHUSDT: { qty: 0.01, tick: 0.01 },
  SOLUSDT: { qty: 0.1, tick: 0.01 },
};

export const RISK_OPTIONS = [0.5, 1, 2] as const;
export const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20] as const;
export const SIM_START_BALANCE = 10_000;

export interface PlanInput {
  side: Side;
  entry: number;
  sl: number | null;
  tp: number | null;
  riskPct: number;
  balance: number;
  leverage: number;
  symbol: DatasetSymbol;
  feePct?: number;
}

export type PlanError = OrderError | 'levels' | 'margin';
export type PlanWarning = 'liq-before-stop' | 'rr-below-1';

export interface TradePlan {
  error: PlanError | null;
  warnings: PlanWarning[];
  qty: number | null;
  notional: number | null;
  margin: number | null;
  riskUsd: number | null;
  rewardUsd: number | null;
  rr: number | null;
  /** Entry + exit taker fees at the stop, for reference. */
  fees: number | null;
  liquidation: number | null;
}

const EMPTY: Omit<TradePlan, 'error'> = {
  warnings: [],
  qty: null,
  notional: null,
  margin: null,
  riskUsd: null,
  rewardUsd: null,
  rr: null,
  fees: null,
  liquidation: null,
};

export function planTrade(input: PlanInput): TradePlan {
  const { side, entry, sl, tp, leverage, symbol } = input;
  if (sl === null || tp === null) return { ...EMPTY, error: 'levels' };
  const levelsError = validateOrder({ side, entry, sl, tp, qty: 1 });
  if (levelsError) return { ...EMPTY, error: levelsError };
  const size = positionSize({
    balance: input.balance,
    riskPct: input.riskPct,
    entry,
    stop: sl,
    leverage,
    qtyStep: INSTRUMENT_STEPS[symbol].qty,
  });
  if (!size || size.qty <= 0) return { ...EMPTY, error: 'qty' };
  const feePct = input.feePct ?? BYBIT_BASE_FEES.perpetual.taker;
  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);
  const liquidation =
    leverage > 1
      ? liquidationPrice({ side, entry, leverage, mmrPct: BTCUSDT_MMR_PCT, closeFeePct: feePct })
      : null;
  const warnings: PlanWarning[] = [];
  if (liquidation !== null && stopBeyondLiquidation(side, sl, liquidation)) {
    warnings.push('liq-before-stop');
  }
  if (rr < 1) warnings.push('rr-below-1');
  return {
    error: size.margin > input.balance ? 'margin' : null,
    warnings,
    qty: size.qty,
    notional: size.notional,
    margin: size.margin,
    riskUsd: size.riskUsd,
    rewardUsd: size.qty * Math.abs(tp - entry),
    rr,
    fees: feeFor(size.notional, feePct) + feeFor(size.qty * sl, feePct),
    liquidation,
  };
}

/** Starting SL/TP for a side: 1.5 ATR for the stop and 3 ATR for the target (R:R 2). */
export function defaultLevels(
  side: Side,
  entry: number,
  atrValue: number | null,
  tick: number,
): { sl: number; tp: number } {
  // Without ATR (very early candles) fall back to 1% of the price.
  const unit = atrValue !== null && atrValue > 0 ? atrValue : entry * 0.01;
  const dir = side === 'long' ? 1 : -1;
  return {
    sl: roundToTick(entry - dir * 1.5 * unit, tick),
    tp: roundToTick(entry + dir * 3 * unit, tick),
  };
}

/** Nearest price on the instrument's tick grid. */
export function roundToTick(price: number, tick: number): number {
  const steps = Math.round(price / tick);
  return roundToStep(steps * tick, tick) ?? price;
}

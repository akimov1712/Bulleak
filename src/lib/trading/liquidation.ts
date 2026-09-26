/**
 * Liquidation price of an isolated-margin USDT perpetual (linear) position, Bybit's formula:
 * LP = entry ∓ (initial margin − maintenance margin) / size, where
 * maintenance margin = value × MMR (+ estimated fee to close at the bankruptcy price).
 * Tier-1 only: the maintenance margin deduction of higher risk-limit tiers is ignored.
 * Approximate by design — the exact price is always shown in the Bybit interface.
 */

import type { Side } from './pnl';

/** Bybit BTCUSDT tier-1 maintenance margin rate (positions up to 2 000 000 USDT), in %. */
export const BTCUSDT_MMR_PCT = 0.5;

export interface LiquidationInput {
  side: Side;
  entry: number;
  leverage: number;
  /** Maintenance margin rate in %, e.g. 0.5. */
  mmrPct: number;
  /** Taker fee in % to include the estimated closing fee (Bybit does); 0 = ignore fees. */
  closeFeePct?: number;
}

/** Price where the margin is fully lost (0% margin). */
export function bankruptcyPrice(side: Side, entry: number, leverage: number): number | null {
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(leverage) || leverage < 1) {
    return null;
  }
  return side === 'long' ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage);
}

/**
 * Long: `entry × (1 − 1/lev + mmr)`, short: `entry × (1 + 1/lev − mmr)` (without fees).
 * Null for invalid input or when the maintenance margin is not below the initial margin
 * (the position would be liquidated immediately).
 */
export function liquidationPrice(input: LiquidationInput): number | null {
  const { side, entry, leverage, mmrPct } = input;
  const feePct = input.closeFeePct ?? 0;
  const bankruptcy = bankruptcyPrice(side, entry, leverage);
  if (bankruptcy === null) return null;
  if (!Number.isFinite(mmrPct) || mmrPct < 0 || !Number.isFinite(feePct) || feePct < 0) {
    return null;
  }
  // Maintenance margin per coin: value × MMR plus the fee to close at the bankruptcy price.
  const maintenance = (entry * mmrPct) / 100 + (bankruptcy * feePct) / 100;
  if (maintenance >= entry / leverage) return null;
  return side === 'long' ? bankruptcy + maintenance : bankruptcy - maintenance;
}

/** Distance from entry to the liquidation price, % of entry. */
export function liquidationDistancePct(entry: number, liquidation: number): number | null {
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(liquidation)) return null;
  return (Math.abs(entry - liquidation) / entry) * 100;
}

/** True when the stop would trigger only after liquidation (the stop is useless). */
export function stopBeyondLiquidation(side: Side, stop: number, liquidation: number): boolean {
  return side === 'long' ? stop <= liquidation : stop >= liquidation;
}

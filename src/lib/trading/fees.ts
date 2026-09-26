/** Trading fees: always charged on the notional value (position size), not on margin. */

export type FeeRole = 'maker' | 'taker';

export interface FeeSchedule {
  /** Percent, e.g. 0.055 for 0.055%. */
  maker: number;
  taker: number;
}

/** Bybit base (non-VIP) rates, checked September 2026. Account rates may differ. */
export const BYBIT_BASE_FEES = {
  spot: { maker: 0.1, taker: 0.1 },
  perpetual: { maker: 0.02, taker: 0.055 },
} as const satisfies Record<string, FeeSchedule>;

export const feeFor = (notional: number, ratePct: number) => (notional * ratePct) / 100;

export interface RoundTripFees {
  entry: number;
  exit: number;
  total: number;
  /** total / risk × 100; null when risk is not positive. */
  shareOfRiskPct: number | null;
}

/**
 * Fees for opening and closing a position of `notional` value.
 * `riskUsd` — how much the trade risks (entry→stop); shows how much of it fees eat.
 */
export function roundTripFees(
  notional: number,
  schedule: FeeSchedule,
  entryRole: FeeRole,
  exitRole: FeeRole,
  riskUsd?: number,
): RoundTripFees | null {
  if (!Number.isFinite(notional) || notional <= 0) return null;
  const entry = feeFor(notional, schedule[entryRole]);
  const exit = feeFor(notional, schedule[exitRole]);
  const total = entry + exit;
  const shareOfRiskPct =
    riskUsd !== undefined && Number.isFinite(riskUsd) && riskUsd > 0
      ? (total / riskUsd) * 100
      : null;
  return { entry, exit, total, shareOfRiskPct };
}

/**
 * Funding paid (positive) or received over `periods` funding intervals (8 h on BTCUSDT):
 * `notional × rate × periods`. The sign of `ratePct` follows Bybit: positive → longs pay.
 * Null for invalid input.
 */
export function fundingFee(notional: number, ratePct: number, periods: number): number | null {
  if (!Number.isFinite(notional) || notional <= 0 || !Number.isFinite(ratePct)) return null;
  if (!Number.isInteger(periods) || periods < 0) return null;
  return (notional * ratePct * periods) / 100;
}

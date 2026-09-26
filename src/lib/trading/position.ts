/** Position sizing from risk: the core of the `position` calculator and the simulator order panel. */

const isPos = (v: number) => Number.isFinite(v) && v > 0;

/** Number of decimals in a step such as 0.001 → 3 (used to clean up float noise). */
export function stepDecimals(step: number): number {
  if (!isPos(step)) return 0;
  const text = step.toString();
  const exp = /e-(\d+)$/.exec(text);
  if (exp) return Number(exp[1]);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Rounds a quantity DOWN to the exchange's quantity step (0.0137 with step 0.001 → 0.013):
 * rounding up would risk more than planned. Null for invalid input.
 */
export function roundToStep(value: number, step: number): number | null {
  if (!Number.isFinite(value) || value < 0 || !isPos(step)) return null;
  // The epsilon keeps exact multiples (0.013 / 0.001 = 12.999…) from dropping a step.
  const steps = Math.floor(value / step + 1e-9);
  return Number((steps * step).toFixed(stepDecimals(step)));
}

export interface PositionInput {
  balance: number;
  /** Percent of the balance to risk, e.g. 1 for 1%. */
  riskPct: number;
  entry: number;
  stop: number;
  /** Leverage for the margin estimate (default 1 = no leverage). */
  leverage?: number;
  /** Exchange quantity step; when set, qty is rounded down to it. */
  qtyStep?: number;
}

export interface PositionSize {
  /** Money lost if the stop is hit (without fees), after qty rounding. */
  riskUsd: number;
  /** Quantity in coins. */
  qty: number;
  /** Position value in USDT at the entry price. */
  notional: number;
  /** Margin needed at the given leverage. */
  margin: number;
  /** Distance entry → stop in % of the entry price. */
  stopDistancePct: number;
}

/** `qty = balance × risk / |entry − stop|`. Null for invalid input or stop = entry. */
export function positionSize(input: PositionInput): PositionSize | null {
  const { balance, riskPct, entry, stop } = input;
  const leverage = input.leverage ?? 1;
  if (!isPos(balance) || !isPos(riskPct) || riskPct > 100) return null;
  if (!isPos(entry) || !isPos(stop) || !isPos(leverage)) return null;
  const distance = Math.abs(entry - stop);
  if (distance === 0) return null;
  const rawQty = (balance * riskPct) / 100 / distance;
  const qty = input.qtyStep === undefined ? rawQty : roundToStep(rawQty, input.qtyStep);
  if (qty === null) return null;
  const notional = qty * entry;
  return {
    riskUsd: qty * distance,
    qty,
    notional,
    margin: notional / leverage,
    stopDistancePct: (distance / entry) * 100,
  };
}

/**
 * Position value from risk and stop distance in %: $1000 × 1% with a 2% stop → $500.
 * Null for invalid input.
 */
export function notionalFromStopPct(
  balance: number,
  riskPct: number,
  stopPct: number,
): number | null {
  if (!isPos(balance) || !isPos(riskPct) || !isPos(stopPct)) return null;
  return (balance * riskPct) / stopPct;
}

/** Margin (initial margin) for a position: `notional / leverage`. Null for invalid input. */
export function marginFor(notional: number, leverage: number): number | null {
  if (!isPos(notional) || !isPos(leverage)) return null;
  return notional / leverage;
}

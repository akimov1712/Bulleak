/** Compound growth for the `compounding` calculator (lesson m00-l02, /tools). */

export interface CompoundingResult {
  /** Balance after each month, index 0 = start. */
  balances: number[];
  final: number;
  /** Total growth in % over the whole period. */
  totalPct: number;
  /** Equivalent yearly growth in % (compounded). */
  yearlyPct: number;
}

/** Returns null for invalid input (negative deposit, rate ≤ −100%, non-integer months…). */
export function compound(
  deposit: number,
  monthlyPct: number,
  months: number,
): CompoundingResult | null {
  if (!Number.isFinite(deposit) || deposit <= 0) return null;
  if (!Number.isFinite(monthlyPct) || monthlyPct <= -100) return null;
  if (!Number.isInteger(months) || months < 1 || months > 600) return null;
  const factor = 1 + monthlyPct / 100;
  const balances = [deposit];
  for (let m = 1; m <= months; m++) balances.push((balances[m - 1] ?? deposit) * factor);
  const final = balances[months] ?? deposit;
  return {
    balances,
    final,
    totalPct: (final / deposit - 1) * 100,
    yearlyPct: (factor ** 12 - 1) * 100,
  };
}

export type RealismLevel = 'realistic' | 'ambitious' | 'unrealistic';

/**
 * How believable a steady monthly return is. Thresholds are deliberately rough:
 * even strong professionals rarely sustain more than a few % per month for years.
 */
export function realism(monthlyPct: number): RealismLevel {
  if (monthlyPct <= 3) return 'realistic';
  if (monthlyPct <= 6) return 'ambitious';
  return 'unrealistic';
}

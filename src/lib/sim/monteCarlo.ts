/**
 * Monte Carlo equity curves for a strategy with a fixed win rate and R:R (EquitySimulator,
 * lesson m09-l04). Seeded, so the same inputs and seed always give the same curves.
 */

import { mulberry32 } from '@/lib/random';

export interface MonteCarloInput {
  /** Win rate 0–1. */
  winrate: number;
  /** Win size in R (a loss is −1R). */
  rr: number;
  /** Risk per trade, % of the current balance. */
  riskPct: number;
  trades: number;
  runs: number;
  seed: number;
  /** How many full curves to keep for drawing (the statistics use every run). Default 20. */
  keepCurves?: number;
}

export interface MonteCarloRun {
  finalPct: number;
  maxDrawdownPct: number;
  maxLosingStreak: number;
}

export interface MonteCarloResult {
  runs: MonteCarloRun[];
  /** Balance after each trade (start = 1) for the first `keepCurves` runs. */
  curves: number[][];
  /** Median final result, %. */
  medianFinalPct: number;
  /** Share of runs that ended below the start (0–1). */
  losingShare: number;
  /** Median and 90th percentile of the max drawdown, %. */
  drawdownP50: number;
  drawdownP90: number;
  /** Median and 90th percentile of the longest losing streak. */
  streakP50: number;
  streakP90: number;
}

export const MONTE_CARLO_LIMITS = { maxTrades: 1000, maxRuns: 500 } as const;

/** Value at quantile q (0–1) of an unsorted list, nearest-rank. */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index] ?? Number.NaN;
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult | null {
  const { winrate, rr, riskPct, trades, runs, seed } = input;
  if (!Number.isFinite(winrate) || winrate < 0 || winrate > 1) return null;
  if (!Number.isFinite(rr) || rr <= 0) return null;
  if (!Number.isFinite(riskPct) || riskPct <= 0 || riskPct >= 100) return null;
  if (!Number.isInteger(trades) || trades < 1 || trades > MONTE_CARLO_LIMITS.maxTrades) return null;
  if (!Number.isInteger(runs) || runs < 1 || runs > MONTE_CARLO_LIMITS.maxRuns) return null;

  const rng = mulberry32(seed);
  const risk = riskPct / 100;
  const keep = input.keepCurves ?? 20;
  const out: MonteCarloRun[] = [];
  const curves: number[][] = [];
  for (let r = 0; r < runs; r++) {
    // Full curves only for the runs that are drawn; the rest keep just their summary.
    const curve = r < keep ? [1] : null;
    let balance = 1;
    let peak = 1;
    let worstDd = 0;
    let streak = 0;
    let longest = 0;
    for (let t = 0; t < trades; t++) {
      const win = rng() < winrate;
      balance *= win ? 1 + risk * rr : 1 - risk;
      curve?.push(balance);
      peak = Math.max(peak, balance);
      worstDd = Math.max(worstDd, (1 - balance / peak) * 100);
      streak = win ? 0 : streak + 1;
      longest = Math.max(longest, streak);
    }
    if (curve) curves.push(curve);
    out.push({ finalPct: (balance - 1) * 100, maxDrawdownPct: worstDd, maxLosingStreak: longest });
  }
  const finals = out.map((x) => x.finalPct);
  const dds = out.map((x) => x.maxDrawdownPct);
  const streaks = out.map((x) => x.maxLosingStreak);
  return {
    runs: out,
    curves,
    medianFinalPct: quantile(finals, 0.5),
    losingShare: finals.filter((f) => f < 0).length / runs,
    drawdownP50: quantile(dds, 0.5),
    drawdownP90: quantile(dds, 0.9),
    streakP50: quantile(streaks, 0.5),
    streakP90: quantile(streaks, 0.9),
  };
}

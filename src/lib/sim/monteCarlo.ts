/**
 * Monte Carlo equity curves for a strategy with a fixed win rate and R:R (EquitySimulator,
 * lesson m09-l04). Seeded, so the same inputs and seed always give the same curves.
 */

import { mulberry32 } from '@/lib/random';
import { maxDrawdownPct, maxLosingStreak } from '@/lib/trading/drawdown';

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
}

export interface MonteCarloRun {
  /** Balance after each trade, start = 1 (index 0). */
  curve: number[];
  finalPct: number;
  maxDrawdownPct: number;
  maxLosingStreak: number;
}

export interface MonteCarloResult {
  runs: MonteCarloRun[];
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
  const out: MonteCarloRun[] = [];
  for (let r = 0; r < runs; r++) {
    const curve = [1];
    const wins: boolean[] = [];
    let balance = 1;
    for (let t = 0; t < trades; t++) {
      const win = rng() < winrate;
      wins.push(win);
      balance *= win ? 1 + risk * rr : 1 - risk;
      curve.push(balance);
    }
    out.push({
      curve,
      finalPct: (balance - 1) * 100,
      maxDrawdownPct: maxDrawdownPct(curve),
      maxLosingStreak: maxLosingStreak(wins),
    });
  }
  const finals = out.map((x) => x.finalPct);
  const dds = out.map((x) => x.maxDrawdownPct);
  const streaks = out.map((x) => x.maxLosingStreak);
  return {
    runs: out,
    medianFinalPct: quantile(finals, 0.5),
    losingShare: finals.filter((f) => f < 0).length / runs,
    drawdownP50: quantile(dds, 0.5),
    drawdownP90: quantile(dds, 0.9),
    streakP50: quantile(streaks, 0.5),
    streakP90: quantile(streaks, 0.9),
  };
}

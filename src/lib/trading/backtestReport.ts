/**
 * Backtest report (m11-l05): strategy metrics and the course thresholds for moving on to a
 * forward test. Results are in R after fees, as the simulator stores them.
 */
import type { SimTrade } from '@/types/trading';
import { longestRun } from './drawdown';
import { profitFactor, simSummary } from './simStats';

/** Course thresholds (brief m11-l05): the backtest must pass all of them. */
export const FORWARD_TEST_THRESHOLDS = {
  minTrades: 30,
  minExpectancyR: 0.2,
  minProfitFactor: 1.3,
  /** Max drawdown at 1 % risk per trade, in %. */
  maxDrawdownPct: 15,
} as const;

export interface BacktestCheck {
  id: 'trades' | 'expectancy' | 'profitFactor' | 'drawdown';
  passed: boolean;
}

export interface BacktestReport {
  count: number;
  winrate: number | null;
  /** Average result in R — the expectancy of the sample. */
  expectancyR: number | null;
  profitFactor: number | null;
  /** Deepest peak-to-trough fall of an account risking 1 % per trade, in %. */
  maxDrawdownPct: number;
  maxLosingStreak: number;
  checks: BacktestCheck[];
  /** All thresholds passed. */
  ready: boolean;
}

type ReportTrade = Pick<SimTrade, 'at' | 'r' | 'pnl'>;

/** Max drawdown (%) of an account that risks `riskPct` of its balance on every trade. */
export function drawdownAtRisk(rs: readonly number[], riskPct = 1): number {
  let equity = 1;
  let peak = 1;
  let worst = 0;
  for (const r of rs) {
    equity *= 1 + (r * riskPct) / 100;
    peak = Math.max(peak, equity);
    worst = Math.max(worst, 1 - equity / peak);
  }
  return worst * 100;
}

export function backtestReport(trades: readonly ReportTrade[]): BacktestReport {
  const sorted = [...trades].sort((a, b) => a.at - b.at);
  const summary = simSummary(sorted);
  const pf = profitFactor(sorted);
  const maxDrawdownPct = drawdownAtRisk(sorted.map((t) => t.r));
  const t = FORWARD_TEST_THRESHOLDS;
  const checks: BacktestCheck[] = [
    { id: 'trades', passed: summary.count >= t.minTrades },
    { id: 'expectancy', passed: summary.avgR !== null && summary.avgR >= t.minExpectancyR },
    // No losing trades at all: the profit factor is undefined but not a failure.
    {
      id: 'profitFactor',
      passed: summary.count > 0 && (pf === null ? summary.wins > 0 : pf >= t.minProfitFactor),
    },
    { id: 'drawdown', passed: summary.count > 0 && maxDrawdownPct <= t.maxDrawdownPct },
  ];
  return {
    count: summary.count,
    winrate: summary.winrate,
    expectancyR: summary.avgR,
    profitFactor: pf,
    maxDrawdownPct,
    maxLosingStreak: longestRun(
      sorted.map((x) => x.pnl < 0),
      true,
    ),
    checks,
    ready: checks.every((c) => c.passed),
  };
}

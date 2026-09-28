/**
 * Forward test (m11-l06): journal trades on demo or testnet compared with the simulator backtest.
 * Both sides are measured the same way — in R after fees.
 */
import type { JournalTrade, SimTrade } from '@/types/trading';
import { longestRun } from '../trading/drawdown';
import { byCloseTime } from './metrics';

/** Accounts that count as a forward test. */
export const isForwardAccount = (t: Pick<JournalTrade, 'account'>) =>
  t.account === 'demo' || t.account === 'testnet';

/** Minimum forward-test sample (brief m11-l06). */
export const FORWARD_TARGET_TRADES = 30;

export interface ResultMetrics {
  count: number;
  /** 0–1; null without trades. */
  winrate: number | null;
  /** Average result in R; null without trades. */
  expectancyR: number | null;
  /** Σprofit / |Σloss|; null without losing trades. */
  profitFactor: number | null;
  /** Largest fall of the cumulative-R curve from its peak (≥ 0). */
  maxDrawdownR: number;
  longestLossStreak: number;
}

/** Metrics of results in time order; a win is a positive P&L after fees. */
export function resultMetrics(results: readonly { r: number; pnl: number }[]): ResultMetrics {
  const count = results.length;
  let cum = 0;
  let peak = 0;
  let dd = 0;
  for (const { r } of results) {
    cum += r;
    peak = Math.max(peak, cum);
    dd = Math.max(dd, peak - cum);
  }
  const profit = results.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const loss = -results.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
  return {
    count,
    winrate: count > 0 ? results.filter((t) => t.pnl > 0).length / count : null,
    expectancyR: count > 0 ? results.reduce((s, t) => s + t.r, 0) / count : null,
    profitFactor: loss > 0 ? profit / loss : null,
    maxDrawdownR: dd,
    longestLossStreak: longestRun(
      results.map((t) => t.pnl < 0),
      true,
    ),
  };
}

export interface ForwardComparison {
  backtest: ResultMetrics;
  forward: ResultMetrics & {
    /** Share of forward trades marked «followed the plan» (0–1); null without trades. */
    followedPlanShare: number | null;
  };
}

/** Backtest (simulator trades with `strategyTag`) vs forward (closed demo/testnet journal trades). */
export function forwardComparison(
  backtest: readonly Pick<SimTrade, 'at' | 'r' | 'pnl'>[],
  journal: readonly JournalTrade[],
): ForwardComparison {
  const bt = [...backtest].sort((a, b) => a.at - b.at);
  const fw = byCloseTime(journal.filter(isForwardAccount));
  return {
    backtest: resultMetrics(bt),
    forward: {
      ...resultMetrics(fw),
      followedPlanShare: fw.length > 0 ? fw.filter((t) => t.followedPlan).length / fw.length : null,
    },
  };
}

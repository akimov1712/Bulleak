/** Journal metrics (journal.md «Метрики»): computed over closed trades only. */
import type { JournalEmotion, JournalTrade } from '@/types/trading';
import { longestRun } from '@/lib/trading/drawdown';

/** A journal trade with a known result. */
export type ClosedTrade = JournalTrade & { pnl: number; r: number; closedAt: number };

export const isClosed = (t: JournalTrade): t is ClosedTrade =>
  t.pnl !== undefined && t.r !== undefined && t.closedAt !== undefined;

export interface EquityPoint {
  closedAt: number;
  /** Cumulative R after this trade. */
  r: number;
  /** Cumulative P&L after this trade. */
  pnl: number;
}

export interface JournalMetrics {
  count: number;
  wins: number;
  losses: number;
  /** 0–1; null without trades. */
  winrate: number | null;
  /** Σprofit / |Σloss|; null without losing trades (UI shows «—»). */
  profitFactor: number | null;
  /** Average result in R — the journal's expectancy per trade. */
  avgR: number | null;
  avgWinR: number | null;
  avgLossR: number | null;
  totalR: number;
  totalPnl: number;
  /** Largest fall of the cumulative-R curve from its peak (≥ 0). */
  maxDrawdownR: number;
  /** Same in % of the balance, when a starting balance is known. */
  maxDrawdownPct: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  /** Mean holding time, ms; null without trades. */
  avgDurationMs: number | null;
  /** Share of trades marked «followed the plan» (0–1); null without trades. */
  followedPlanShare: number | null;
  equity: EquityPoint[];
}

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length;

/** Closed trades in the order they were closed. */
export const byCloseTime = (trades: readonly JournalTrade[]): ClosedTrade[] =>
  trades.filter(isClosed).sort((a, b) => a.closedAt - b.closedAt || a.openedAt - b.openedAt);

export function journalMetrics(
  trades: readonly JournalTrade[],
  startBalance?: number,
): JournalMetrics {
  const closed = byCloseTime(trades);
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const profit = wins.reduce((s, t) => s + t.pnl, 0);
  const loss = -losses.reduce((s, t) => s + t.pnl, 0);

  const equity: EquityPoint[] = [];
  let r = 0;
  let pnl = 0;
  let peakR = 0;
  let maxDdR = 0;
  const hasBalance = startBalance !== undefined && startBalance > 0;
  let balance = startBalance ?? 0;
  let peakBalance = balance;
  let maxDdPct = 0;
  for (const t of closed) {
    r += t.r;
    pnl += t.pnl;
    equity.push({ closedAt: t.closedAt, r, pnl });
    peakR = Math.max(peakR, r);
    maxDdR = Math.max(maxDdR, peakR - r);
    if (hasBalance) {
      balance += t.pnl;
      peakBalance = Math.max(peakBalance, balance);
      if (peakBalance > 0) maxDdPct = Math.max(maxDdPct, (1 - balance / peakBalance) * 100);
    }
  }

  const count = closed.length;
  return {
    count,
    wins: wins.length,
    losses: losses.length,
    winrate: count > 0 ? wins.length / count : null,
    profitFactor: loss > 0 ? profit / loss : null,
    avgR: mean(closed.map((t) => t.r)),
    avgWinR: mean(wins.map((t) => t.r)),
    avgLossR: mean(losses.map((t) => t.r)),
    totalR: r,
    totalPnl: pnl,
    maxDrawdownR: maxDdR,
    maxDrawdownPct: hasBalance ? maxDdPct : null,
    longestWinStreak: longestRun(
      closed.map((t) => t.pnl > 0),
      true,
    ),
    longestLossStreak: longestRun(
      closed.map((t) => t.pnl < 0),
      true,
    ),
    avgDurationMs: mean(closed.map((t) => t.closedAt - t.openedAt)),
    followedPlanShare: count > 0 ? closed.filter((t) => t.followedPlan).length / count : null,
    equity,
  };
}

export interface GroupStats<K extends string> {
  key: K;
  count: number;
  winrate: number;
  avgR: number;
  totalR: number;
}

/** Breakdown by setup or emotion («сделки в состоянии FOMO: винрейт 20%»), most trades first. */
export function groupStats<K extends 'setup' | 'emotion'>(
  trades: readonly JournalTrade[],
  by: K,
): GroupStats<K extends 'emotion' ? JournalEmotion : string>[] {
  type Key = K extends 'emotion' ? JournalEmotion : string;
  const groups = new Map<Key, ClosedTrade[]>();
  for (const t of trades.filter(isClosed)) {
    const key = t[by] as Key;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      count: list.length,
      winrate: list.filter((t) => t.pnl > 0).length / list.length,
      avgR: list.reduce((s, t) => s + t.r, 0) / list.length,
      totalR: list.reduce((s, t) => s + t.r, 0),
    }))
    .sort((a, b) => b.count - a.count || b.totalR - a.totalR);
}

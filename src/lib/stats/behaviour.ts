/** Behavioural metrics (docs/04-features/stats-v2.md, section 6). */
import { toDateKey } from '@/lib/date';

export interface HeldTrade {
  /** Entry time: groups trades by day. */
  at: number;
  /** Holding time in any unit (ms in the journal, candles in the simulator). */
  held: number;
  r: number;
  pnl: number;
}

export interface Disposition {
  /** Mean holding of losers / of winners; > 1 — losers are held longer. Null without both. */
  ratio: number | null;
  winners: number;
  losers: number;
}

/** Disposition effect: losers held longer than winners (cut profits, let losses run). */
export function disposition(trades: readonly HeldTrade[]): Disposition {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const mean = (xs: readonly HeldTrade[]) => xs.reduce((s, t) => s + t.held, 0) / xs.length;
  const winHold = wins.length > 0 ? mean(wins) : 0;
  return {
    ratio: wins.length > 0 && losses.length > 0 && winHold > 0 ? mean(losses) / winHold : null,
    winners: wins.length,
    losers: losses.length,
  };
}

export interface Overtrading {
  /** Days with trades. */
  days: number;
  /** A day with more trades than this is «busy» (90th percentile of trades per day). */
  threshold: number;
  busyDays: number;
  /** Mean R per trade on busy days and on the others; null without such trades. */
  busyAvgR: number | null;
  otherAvgR: number | null;
}

/** Overtrading: days far busier than usual and how they went. Null under 5 trading days. */
export function overtrading(trades: readonly HeldTrade[]): Overtrading | null {
  const byDay = new Map<string, HeldTrade[]>();
  for (const t of trades) {
    const key = toDateKey(t.at);
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }
  if (byDay.size < 5) return null;
  const counts = [...byDay.values()].map((d) => d.length).sort((a, b) => a - b);
  const threshold = counts[Math.floor(0.9 * (counts.length - 1))] ?? 0;
  const busy = [...byDay.values()].filter((d) => d.length > threshold).flat();
  const other = [...byDay.values()].filter((d) => d.length <= threshold).flat();
  const avg = (xs: readonly HeldTrade[]) =>
    xs.length > 0 ? xs.reduce((s, t) => s + t.r, 0) / xs.length : null;
  return {
    days: byDay.size,
    threshold,
    busyDays: [...byDay.values()].filter((d) => d.length > threshold).length,
    busyAvgR: avg(busy),
    otherAvgR: avg(other),
  };
}

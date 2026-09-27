/** Simulator statistics (stats.md «Тренажёр»). */
import type { SimTrade } from '@/types/trading';
import { profitFactor, simSummary, type SimSummary } from '@/lib/trading/simStats';

export interface SimStats extends SimSummary {
  profitFactor: number | null;
  bestR: number | null;
  worstR: number | null;
  /** Virtual balance: before the first trade, then after each trade (oldest first). */
  balanceCurve: number[];
}

export function simStats(trades: readonly SimTrade[]): SimStats {
  const sorted = [...trades].sort((a, b) => a.at - b.at);
  const rs = sorted.map((t) => t.r);
  const first = sorted[0];
  const balanceCurve = first ? [first.balanceBefore] : [];
  for (const t of sorted) balanceCurve.push((balanceCurve.at(-1) ?? t.balanceBefore) + t.pnl);
  return {
    ...simSummary(sorted),
    profitFactor: profitFactor(sorted),
    bestR: rs.length > 0 ? Math.max(...rs) : null,
    worstR: rs.length > 0 ? Math.min(...rs) : null,
    balanceCurve,
  };
}

export interface RBin {
  /** Lower edge of the bin, in R. */
  from: number;
  count: number;
}

/** Histogram of results in R with `width`-wide bins, covering min…max. */
export function rHistogram(rs: readonly number[], width = 0.5): RBin[] {
  if (rs.length === 0 || !(width > 0)) return [];
  const lo = Math.floor(Math.min(...rs) / width);
  const hi = Math.floor(Math.max(...rs) / width);
  const bins: RBin[] = [];
  for (let i = lo; i <= hi; i++) bins.push({ from: i * width, count: 0 });
  for (const r of rs) {
    const bin = bins[Math.floor(r / width) - lo];
    if (bin) bin.count += 1;
  }
  return bins;
}

/** Results over time and by group (docs/04-features/stats-v2.md, section 5). */
import { longestRun } from '@/lib/trading/drawdown';

export interface Result {
  r: number;
  pnl: number;
}

export interface CurveStats {
  /** Cumulative R after each trade, starting at 0. */
  curveR: number[];
  maxDrawdownR: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

/** Results in time order. A win is a positive P&L after fees. */
export function curveStats(results: readonly Result[]): CurveStats {
  const curveR = [0];
  let peak = 0;
  let dd = 0;
  for (const { r } of results) {
    const next = (curveR[curveR.length - 1] ?? 0) + r;
    curveR.push(next);
    peak = Math.max(peak, next);
    dd = Math.max(dd, peak - next);
  }
  return {
    curveR,
    maxDrawdownR: dd,
    longestWinStreak: longestRun(
      results.map((t) => t.pnl > 0),
      true,
    ),
    longestLossStreak: longestRun(
      results.map((t) => t.pnl < 0),
      true,
    ),
  };
}

export interface GroupRow {
  label: string;
  count: number;
  winrate: number;
  avgR: number;
  totalR: number;
}

/** Groups by `labelOf`, most trades first (equal counts: better total R first). */
export function breakdown<T extends Result>(
  items: readonly T[],
  labelOf: (item: T) => string,
): GroupRow[] {
  const groups = new Map<string, T[]>();
  for (const t of items) {
    const key = labelOf(t);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([label, list]) => {
      const totalR = list.reduce((s, t) => s + t.r, 0);
      return {
        label,
        count: list.length,
        winrate: list.filter((t) => t.pnl > 0).length / list.length,
        avgR: totalR / list.length,
        totalR,
      };
    })
    .sort((a, b) => b.count - a.count || b.totalR - a.totalR || (a.label < b.label ? -1 : 1));
}

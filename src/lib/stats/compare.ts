/** Simulator and journal side by side (docs/04-features/stats-v2.md, section 8). */
import type { Result } from './breakdown';
import { bootstrapMean, type MeanInterval } from './confidence';

export interface SourceMetrics {
  trades: number;
  expectancy: MeanInterval | null;
  /** Discipline index 0–100; null without checks. */
  discipline: number | null;
  /** Σprofit / |Σloss|; null without losses. */
  profitFactor: number | null;
}

export function sourceMetrics(
  results: readonly Result[],
  discipline: number | null,
): SourceMetrics {
  const profit = results.filter((r) => r.pnl > 0).reduce((s, r) => s + r.pnl, 0);
  const loss = -results.filter((r) => r.pnl < 0).reduce((s, r) => s + r.pnl, 0);
  return {
    trades: results.length,
    expectancy: bootstrapMean(results.map((r) => r.r)),
    discipline,
    profitFactor: loss > 0 ? profit / loss : null,
  };
}

/** Discipline differs by this many points: worth a note. */
export const DISCIPLINE_GAP = 20;
/** Each side needs this many trades before results are compared. */
export const MIN_TRADES_TO_COMPARE = 10;

export type Divergence =
  'discipline-lower-in-journal' | 'discipline-lower-in-sim' | 'results-differ';

/**
 * Notable differences: discipline indices apart by DISCIPLINE_GAP or more; expectancy intervals
 * that do not overlap (the difference is larger than chance), with enough trades on both sides.
 */
export function divergences(sim: SourceMetrics, journal: SourceMetrics): Divergence[] {
  const out: Divergence[] = [];
  if (sim.discipline !== null && journal.discipline !== null) {
    if (sim.discipline - journal.discipline >= DISCIPLINE_GAP)
      out.push('discipline-lower-in-journal');
    if (journal.discipline - sim.discipline >= DISCIPLINE_GAP) out.push('discipline-lower-in-sim');
  }
  const a = sim.expectancy;
  const b = journal.expectancy;
  if (
    a &&
    b &&
    sim.trades >= MIN_TRADES_TO_COMPARE &&
    journal.trades >= MIN_TRADES_TO_COMPARE &&
    (a.high < b.low || b.high < a.low)
  ) {
    out.push('results-differ');
  }
  return out;
}

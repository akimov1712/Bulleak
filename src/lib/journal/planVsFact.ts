/**
 * Plan vs fact (T-2505): how closed journal trades ended compared with their planned stop and
 * take profit. Shows the habits behind the numbers: cutting winners early, cutting losers
 * before the stop, losing more than planned.
 */
import type { JournalTrade } from '@/types/trading';

export type ExitKind = 'target' | 'stop' | 'early-win' | 'early-loss' | 'beyond-stop';

export const EXIT_LABEL: Record<ExitKind, string> = {
  target: 'По тейку',
  stop: 'По стопу',
  'early-win': 'Раньше тейка в плюсе',
  'early-loss': 'Раньше стопа в минусе',
  'beyond-stop': 'Убыток больше стопа',
};

/** Exit within this share of the planned risk from a level counts as «at the level». */
const LEVEL_TOLERANCE = 0.1;

export interface PlanFact {
  trade: JournalTrade;
  kind: ExitKind;
  /** Planned reward in R (null without a take profit). */
  plannedR: number | null;
  /** Realized move in R, before fees. */
  actualR: number;
}

/** One closed trade against its plan; null for open or invalid trades. */
export function planVsFact(trade: JournalTrade): PlanFact | null {
  if (trade.exit === undefined || trade.closedAt === undefined) return null;
  const dir = trade.side === 'long' ? 1 : -1;
  const risk = (trade.entry - trade.sl) * dir;
  if (!(risk > 0)) return null;
  const actualR = ((trade.exit - trade.entry) * dir) / risk;
  const plannedR = trade.tp === undefined ? null : ((trade.tp - trade.entry) * dir) / risk;
  let kind: ExitKind;
  if (actualR < -1 - LEVEL_TOLERANCE) kind = 'beyond-stop';
  else if (actualR <= -1 + LEVEL_TOLERANCE) kind = 'stop';
  else if (plannedR !== null && actualR >= plannedR - LEVEL_TOLERANCE) kind = 'target';
  else kind = actualR > 0 ? 'early-win' : 'early-loss';
  return { trade, kind, plannedR, actualR };
}

export interface PlanFactSummary {
  count: number;
  byKind: Record<ExitKind, number>;
  /** Share of trades that ended at a planned level (stop or take). */
  byPlanShare: number | null;
  /** Sum of R left before the take on early winners (planned − actual). */
  leftOnTableR: number;
  /** Sum of R lost beyond −1R. */
  extraLossR: number;
}

export function summarizePlanFact(trades: readonly JournalTrade[]): PlanFactSummary {
  const rows = trades.flatMap((t) => {
    const row = planVsFact(t);
    return row ? [row] : [];
  });
  const byKind: Record<ExitKind, number> = {
    target: 0,
    stop: 0,
    'early-win': 0,
    'early-loss': 0,
    'beyond-stop': 0,
  };
  let leftOnTableR = 0;
  let extraLossR = 0;
  for (const r of rows) {
    byKind[r.kind] += 1;
    if (r.kind === 'early-win' && r.plannedR !== null) leftOnTableR += r.plannedR - r.actualR;
    if (r.kind === 'beyond-stop') extraLossR += -1 - r.actualR;
  }
  return {
    count: rows.length,
    byKind,
    byPlanShare: rows.length ? (byKind.target + byKind.stop) / rows.length : null,
    leftOnTableR,
    extraLossR,
  };
}

/**
 * Discipline rules for simulator and journal trades (docs/04-features/stats-v2.md, section 2).
 * One implementation for statistics and the learner model (behaviour estimate B).
 */
import type { JournalTrade, SimTrade } from '@/types/trading';
import { isClosed, type ClosedTrade } from '@/lib/journal/metrics';
import { toDateKey } from '@/lib/date';
import { stopMovedAway } from '@/lib/trading/manage';

export type RuleId = 'risk' | 'rr' | 'daily-loss' | 'revenge' | 'stop-moved' | 'plan';

export interface DisciplineRule {
  id: RuleId;
  /** Skill of the graph (src/content/skills.ts) the rule measures. */
  skill: string;
  title: string;
  /** The simulator can check it (the learner model reads only simulator trades). */
  sim: boolean;
}

export const DISCIPLINE_RULES: readonly DisciplineRule[] = [
  { id: 'risk', skill: 'risk-per-trade', title: 'Риск на сделку не больше 1 %', sim: true },
  { id: 'rr', skill: 'expectancy', title: 'Плановое R:R не меньше 1,5', sim: true },
  {
    id: 'daily-loss',
    skill: 'drawdown',
    title: 'Без новых сделок после дневного убытка 3 %',
    sim: true,
  },
  { id: 'revenge', skill: 'emotions', title: 'Без сделки из мести после убытка', sim: true },
  { id: 'stop-moved', skill: 'trade-management', title: 'Стоп не отодвигается от цены', sim: true },
  { id: 'plan', skill: 'plan-discipline', title: 'Сделка по торговому плану', sim: false },
];

export const COURSE_LIMITS = {
  maxRiskPct: 1,
  minRr: 1.5,
  dailyLossPct: 3,
  /** Same limit when the balance is unknown (journal): 3 losses of 1R. */
  dailyLossR: 3,
  revengeWindowMs: 15 * 60_000,
};
export type Limits = typeof COURSE_LIMITS;

/** What the rules need from a trade, from either source. */
export interface DisciplineTrade {
  /** Entry time; trades are checked in this order. */
  at: number;
  closedAt: number;
  entry: number;
  sl: number;
  tp?: number;
  /** % of the balance at risk, when the balance is known (simulator). */
  riskPct?: number;
  /** A comparable size of risk (revenge: «bigger than last time»). */
  riskSize: number;
  /** Result in R. */
  r: number;
  loss: boolean;
  /** Loss in % of the balance (simulator); otherwise the loss counts in R. */
  lossPct?: number;
  revengeMarked?: boolean;
  followedPlan?: boolean;
  /** The stop was moved away from the price during the trade (T-2002). */
  stopMovedAway?: boolean;
}

export function fromSim(t: SimTrade): DisciplineTrade {
  const moved = stopMovedAway(t);
  return {
    at: t.at,
    closedAt: t.at,
    entry: t.entry,
    sl: t.sl,
    tp: t.tp,
    riskPct: t.riskPct,
    riskSize: t.riskPct,
    r: t.r,
    loss: t.pnl < 0,
    lossPct: t.pnl < 0 && t.balanceBefore > 0 ? (-t.pnl / t.balanceBefore) * 100 : 0,
    ...(moved !== undefined && { stopMovedAway: moved }),
  };
}

export function fromJournal(t: ClosedTrade): DisciplineTrade {
  return {
    at: t.openedAt,
    closedAt: t.closedAt,
    entry: t.entry,
    sl: t.sl,
    ...(t.tp !== undefined && { tp: t.tp }),
    riskSize: Math.abs(t.entry - t.sl) * t.qty,
    r: t.r,
    loss: t.pnl < 0,
    revengeMarked: t.emotion === 'revenge',
    followedPlan: t.followedPlan,
  };
}

export interface RuleCheck {
  rule: RuleId;
  ok: boolean;
}

const EPS = 1e-9;

/** Planned reward to risk of the order (0 when the stop sits on the entry). */
export function plannedRr(t: { entry: number; sl: number; tp: number }): number {
  const risk = Math.abs(t.entry - t.sl);
  return risk === 0 ? 0 : Math.abs(t.tp - t.entry) / risk;
}

interface Context {
  /** Losses earlier the same day: in % (known balance) and in R (unknown). */
  lostPct: number;
  lostR: number;
  previous?: DisciplineTrade;
}

function checkWith(t: DisciplineTrade, ctx: Context, limits: Limits): RuleCheck[] {
  const checks: RuleCheck[] = [];
  if (t.riskPct !== undefined)
    checks.push({ rule: 'risk', ok: t.riskPct <= limits.maxRiskPct + EPS });
  if (t.tp !== undefined) {
    checks.push({
      rule: 'rr',
      ok: plannedRr({ entry: t.entry, sl: t.sl, tp: t.tp }) + EPS >= limits.minRr,
    });
  }
  if (ctx.lostPct > 0 || ctx.lostR > 0) {
    checks.push({
      rule: 'daily-loss',
      ok: ctx.lostPct + EPS < limits.dailyLossPct && ctx.lostR + EPS < limits.dailyLossR,
    });
  }
  const p = ctx.previous;
  // The loss must be known at entry: overlapping trades (opened before it closed) do not count.
  const sinceLoss = p !== undefined && p.loss ? t.at - p.closedAt : -1;
  const afterLoss = p !== undefined && sinceLoss >= 0 && sinceLoss <= limits.revengeWindowMs;
  if (t.revengeMarked) checks.push({ rule: 'revenge', ok: false });
  else if (afterLoss) checks.push({ rule: 'revenge', ok: t.riskSize <= p.riskSize * (1 + EPS) });
  if (t.stopMovedAway !== undefined) checks.push({ rule: 'stop-moved', ok: !t.stopMovedAway });
  if (t.followedPlan !== undefined) checks.push({ rule: 'plan', ok: t.followedPlan });
  return checks;
}

/**
 * Checks of every trade, in one pass. `trades` oldest first (by entry). Daily-loss and revenge
 * apply only after a loss; rules without data (no balance, no take-profit) do not apply.
 */
export function disciplineChecks(
  trades: readonly DisciplineTrade[],
  limits: Limits = COURSE_LIMITS,
): RuleCheck[][] {
  let day = '';
  const ctx: Context = { lostPct: 0, lostR: 0 };
  return trades.map((t) => {
    const key = toDateKey(t.at);
    if (key !== day) {
      day = key;
      ctx.lostPct = 0;
      ctx.lostR = 0;
    }
    const checks = checkWith(t, ctx, limits);
    if (t.loss) {
      if (t.lossPct !== undefined) ctx.lostPct += t.lossPct;
      else ctx.lostR += Math.max(0, -t.r);
    }
    ctx.previous = t;
    return checks;
  });
}

/** Own simulator trades (no strategy backtests, no deleted records), oldest first. */
export const simDisciplineTrades = (trades: readonly SimTrade[]): DisciplineTrade[] =>
  trades
    .filter((t) => !t.deleted && !t.strategyTag)
    .sort((a, b) => a.at - b.at)
    .map(fromSim);

/** Closed journal trades by entry time. */
export const journalDisciplineTrades = (trades: readonly JournalTrade[]): DisciplineTrade[] =>
  trades
    .filter(isClosed)
    .filter((t) => !t.deleted)
    .sort((a, b) => a.openedAt - b.openedAt)
    .map(fromJournal);

/**
 * Behaviour estimate B per skill from the learner's simulator trades.
 * See docs/04-features/learner-model.md, section 5.
 */
import type { SimTrade } from '@/types/trading';
import { toDateKey } from '@/lib/date';

export type RuleId = 'risk' | 'rr' | 'daily-loss' | 'revenge';

export interface BehaviourRule {
  id: RuleId;
  /** Skill of the graph (src/content/skills.ts) the rule measures. */
  skill: string;
  title: string;
}

export const BEHAVIOUR_RULES: readonly BehaviourRule[] = [
  { id: 'risk', skill: 'risk-per-trade', title: 'Риск на сделку не больше 1 %' },
  { id: 'rr', skill: 'expectancy', title: 'Плановое R:R не меньше 1,5' },
  { id: 'daily-loss', skill: 'drawdown', title: 'Без новых сделок после дневного убытка 3 %' },
  { id: 'revenge', skill: 'emotions', title: 'Без сделки из мести после убытка' },
];

export const COURSE_LIMITS = {
  maxRiskPct: 1,
  minRr: 1.5,
  dailyLossPct: 3,
  revengeWindowMs: 15 * 60_000,
};
export type Limits = typeof COURSE_LIMITS;

/** Old trades weigh less: the weight halves every this many days. */
export const BEHAVIOUR_HALF_LIFE_DAYS = 30;
const DAY_MS = 86_400_000;
const EPS = 1e-9;

export interface RuleCheck {
  rule: RuleId;
  ok: boolean;
}

/** Planned reward to risk of the order (0 when the stop sits on the entry). */
export function plannedRr(t: Pick<SimTrade, 'entry' | 'sl' | 'tp'>): number {
  const risk = Math.abs(t.entry - t.sl);
  return risk === 0 ? 0 : Math.abs(t.tp - t.entry) / risk;
}

const lossPct = (t: SimTrade) =>
  t.pnl < 0 && t.balanceBefore > 0 ? (-t.pnl / t.balanceBefore) * 100 : 0;

/**
 * Rules that apply to `trade` and whether they were kept. `before` are the learner's earlier
 * trades, oldest first. The daily-loss and revenge rules apply only after a loss.
 */
export function checkTrade(
  trade: SimTrade,
  before: readonly SimTrade[],
  limits: Limits = COURSE_LIMITS,
): RuleCheck[] {
  const day = toDateKey(trade.at);
  const lostToday = before
    .filter((t) => toDateKey(t.at) === day)
    .reduce((sum, t) => sum + lossPct(t), 0);
  return checkWith(trade, lostToday, before[before.length - 1], limits);
}

/** checkTrade with the context precomputed: loss % earlier today and the previous trade. */
function checkWith(
  trade: SimTrade,
  lostToday: number,
  previous: SimTrade | undefined,
  limits: Limits,
): RuleCheck[] {
  const checks: RuleCheck[] = [
    { rule: 'risk', ok: trade.riskPct <= limits.maxRiskPct + EPS },
    { rule: 'rr', ok: plannedRr(trade) + EPS >= limits.minRr },
  ];
  if (lostToday > 0) checks.push({ rule: 'daily-loss', ok: lostToday + EPS < limits.dailyLossPct });

  if (previous && previous.pnl < 0 && trade.at - previous.at <= limits.revengeWindowMs) {
    checks.push({ rule: 'revenge', ok: trade.riskPct <= previous.riskPct + EPS });
  }
  return checks;
}

export interface SkillBehaviour {
  skill: string;
  rule: RuleId;
  /** Beta(alpha, beta) of the share of kept rules. */
  alpha: number;
  beta: number;
  /** Mean of the Beta: B. */
  b: number;
  /** Trades the rule applied to. */
  trades: number;
  kept: number;
  lastAt: number;
}

/**
 * B for every rule skill with at least one applicable trade. `trades` are the learner's own
 * trades (tradeEvents), oldest first; skills without trades are absent: «no data», not 0.
 */
export function behaviourBySkill(
  trades: readonly SimTrade[],
  now: number,
  limits: Limits = COURSE_LIMITS,
): Map<string, SkillBehaviour> {
  const skillOf = new Map(BEHAVIOUR_RULES.map((r) => [r.id, r.skill]));
  const acc = new Map<
    RuleId,
    { kept: number; broken: number; trades: number; ok: number; lastAt: number }
  >();
  // One pass: the day's running loss and the previous trade (same result as checkTrade).
  let day = '';
  let lostToday = 0;
  let previous: SimTrade | undefined;
  for (const trade of trades) {
    const key = toDateKey(trade.at);
    if (key !== day) {
      day = key;
      lostToday = 0;
    }
    const w = 0.5 ** (Math.max(0, now - trade.at) / DAY_MS / BEHAVIOUR_HALF_LIFE_DAYS);
    for (const c of checkWith(trade, lostToday, previous, limits)) {
      const a = acc.get(c.rule) ?? { kept: 0, broken: 0, trades: 0, ok: 0, lastAt: 0 };
      acc.set(c.rule, {
        kept: a.kept + (c.ok ? w : 0),
        broken: a.broken + (c.ok ? 0 : w),
        trades: a.trades + 1,
        ok: a.ok + (c.ok ? 1 : 0),
        lastAt: trade.at,
      });
    }
    lostToday += lossPct(trade);
    previous = trade;
  }
  const out = new Map<string, SkillBehaviour>();
  for (const [rule, a] of acc) {
    const skill = skillOf.get(rule);
    if (!skill) continue;
    const alpha = 1 + a.kept;
    const beta = 1 + a.broken;
    out.set(skill, {
      skill,
      rule,
      alpha,
      beta,
      b: alpha / (alpha + beta),
      trades: a.trades,
      kept: a.ok,
      lastAt: a.lastAt,
    });
  }
  return out;
}

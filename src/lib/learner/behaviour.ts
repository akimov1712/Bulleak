/**
 * Behaviour estimate B per skill from the learner's simulator trades.
 * See docs/04-features/learner-model.md, section 5.
 */
import type { SimTrade } from '@/types/trading';
import {
  COURSE_LIMITS,
  DISCIPLINE_RULES,
  disciplineChecks,
  fromSim,
  plannedRr,
  type DisciplineRule,
  type Limits,
  type RuleCheck,
  type RuleId,
} from '@/lib/discipline/rules';

export { COURSE_LIMITS, plannedRr };
export type { Limits, RuleCheck, RuleId };
export type BehaviourRule = DisciplineRule;

/** Rules the simulator can check: the learner model reads only simulator trades. */
export const BEHAVIOUR_RULES: readonly BehaviourRule[] = DISCIPLINE_RULES.filter((r) => r.sim);

/** Old trades weigh less: the weight halves every this many days. */
export const BEHAVIOUR_HALF_LIFE_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * Rules that apply to `trade` and whether they were kept. `before` are the learner's earlier
 * trades, oldest first. The daily-loss and revenge rules apply only after a loss.
 */
export function checkTrade(
  trade: SimTrade,
  before: readonly SimTrade[],
  limits: Limits = COURSE_LIMITS,
): RuleCheck[] {
  return disciplineChecks([...before, trade].map(fromSim), limits).at(-1) ?? [];
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
  const checks = disciplineChecks(trades.map(fromSim), limits);
  trades.forEach((trade, i) => {
    const w = 0.5 ** (Math.max(0, now - trade.at) / DAY_MS / BEHAVIOUR_HALF_LIFE_DAYS);
    for (const c of checks[i] ?? []) {
      const a = acc.get(c.rule) ?? { kept: 0, broken: 0, trades: 0, ok: 0, lastAt: 0 };
      acc.set(c.rule, {
        kept: a.kept + (c.ok ? w : 0),
        broken: a.broken + (c.ok ? 0 : w),
        trades: a.trades + 1,
        ok: a.ok + (c.ok ? 1 : 0),
        lastAt: trade.at,
      });
    }
  });
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

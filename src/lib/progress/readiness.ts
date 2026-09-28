/**
 * Real-trading readiness (m12-l01): automatic criteria from progress, the simulator backtest and
 * the journal. Manual points (money, account security, taxes) stay in the lesson checklist.
 */
import type { ExamKey, ExamProgress, TradingPlan, CustomStrategy } from '@/types/progress';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { forwardComparison } from '../journal/forward';
import { PLAN_SECTIONS } from '@/content/tradingPlan';

/** Modules whose exams must be passed before real trading: 0–11. */
export const READINESS_EXAMS: readonly ExamKey[] = Array.from(
  { length: 12 },
  (_, i) => `m${String(i).padStart(2, '0')}` as ExamKey,
);

export const READINESS_THRESHOLDS = {
  backtestTrades: 30,
  backtestExpectancyR: 0.2,
  forwardTrades: 30,
  /** Forward expectancy must be above this (strictly). */
  forwardExpectancyR: 0,
  followedPlanShare: 0.9,
} as const;

export type ReadinessId = 'exams' | 'backtest' | 'forward' | 'plan' | 'strategy' | 'limits';

export interface ReadinessItem {
  id: ReadinessId;
  passed: boolean;
}

export interface ReadinessInput {
  exams: Partial<Record<ExamKey, ExamProgress>>;
  tradingPlan: TradingPlan | null;
  strategy: CustomStrategy | null;
  /** All simulator trades; backtest ones carry a strategy tag. */
  simTrades: readonly Pick<SimTrade, 'at' | 'r' | 'pnl' | 'strategyTag'>[];
  journal: readonly JournalTrade[];
}

export interface Readiness {
  items: ReadinessItem[];
  ready: boolean;
  examsPassed: number;
  examsTotal: number;
  backtest: { count: number; expectancyR: number | null };
  forward: { count: number; expectancyR: number | null; followedPlanShare: number | null };
}

const filled = (text: string | undefined) => (text ?? '').trim().length > 0;

export function readiness(input: ReadinessInput): Readiness {
  const t = READINESS_THRESHOLDS;
  const examsPassed = READINESS_EXAMS.filter((k) => input.exams[k]?.passedAt !== undefined).length;
  const { backtest, forward } = forwardComparison(
    input.simTrades.filter((s) => s.strategyTag !== undefined),
    input.journal,
  );
  const plan = input.tradingPlan;
  const items: ReadinessItem[] = [
    { id: 'exams', passed: examsPassed === READINESS_EXAMS.length },
    {
      id: 'backtest',
      passed:
        backtest.count >= t.backtestTrades &&
        backtest.expectancyR !== null &&
        backtest.expectancyR >= t.backtestExpectancyR,
    },
    {
      id: 'forward',
      passed:
        forward.count >= t.forwardTrades &&
        forward.expectancyR !== null &&
        forward.expectancyR > t.forwardExpectancyR &&
        forward.followedPlanShare !== null &&
        forward.followedPlanShare >= t.followedPlanShare,
    },
    {
      id: 'plan',
      passed: plan !== null && PLAN_SECTIONS.every((s) => filled(plan.sections[s.id])),
    },
    {
      id: 'strategy',
      passed: input.strategy !== null && input.strategy.rules.some((r) => filled(r)),
    },
    { id: 'limits', passed: plan !== null && filled(plan.sections.risk) },
  ];
  return {
    items,
    ready: items.every((i) => i.passed),
    examsPassed,
    examsTotal: READINESS_EXAMS.length,
    backtest: { count: backtest.count, expectancyR: backtest.expectancyR },
    forward: {
      count: forward.count,
      expectancyR: forward.expectancyR,
      followedPlanShare: forward.followedPlanShare,
    },
  };
}

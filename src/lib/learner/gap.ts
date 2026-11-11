/**
 * Knowledge–behaviour gap and the kind of deficit per skill.
 * See docs/04-features/learner-model.md, section 6, and ROADMAP.md, section 5.3.
 */
import { betaCdf } from './beta';
import type { SkillBehaviour } from './behaviour';
import { MASTERED_P, type SkillKnowledge } from './knowledge';

/** Gap that matters. */
export const GAP_DELTA = 0.2;
/** Confidence that the gap is larger than GAP_DELTA. */
export const GAP_CONFIDENCE = 0.9;
/** Fewer checked trades are too little evidence, whatever the probability says. */
export const GAP_MIN_TRADES = 3;
/** Below this K the skill needs theory first. */
export const KNOWS_P = 0.6;

/**
 * P(K − B > δ) with K taken as known and B ~ Beta(α, β): P(B < K − δ).
 */
export function gapProbability(
  k: number,
  b: Pick<SkillBehaviour, 'alpha' | 'beta'>,
  delta = GAP_DELTA,
): number {
  return betaCdf(k - delta, b.alpha, b.beta);
}

/**
 * - new: no answers yet;
 * - knowledge: K below KNOWS_P — theory and review;
 * - behaviour: knows, but trades break the rule (significant gap) — scenario and own trade review;
 * - practice: knows a rule skill, no trades yet;
 * - learning: knows, not mastered yet, no gap;
 * - mastered: mastered and no gap.
 */
export type Deficit = 'new' | 'knowledge' | 'behaviour' | 'practice' | 'learning' | 'mastered';

export interface SkillState {
  skill: string;
  knowledge?: SkillKnowledge;
  behaviour?: SkillBehaviour;
  /** The skill has a behaviour rule (B can be measured). */
  hasRule: boolean;
  /** K − B, when both exist. */
  gap?: number;
  /** P(K − B > δ), when both exist. */
  gapProbability?: number;
  significantGap: boolean;
  deficit: Deficit;
}

export function skillState(
  skill: string,
  knowledge: SkillKnowledge | undefined,
  behaviour: SkillBehaviour | undefined,
  hasRule: boolean,
): SkillState {
  const base = { skill, knowledge, behaviour, hasRule };
  if (!knowledge) return { ...base, significantGap: false, deficit: 'new' };
  const k = knowledge.p;
  const gap = behaviour ? k - behaviour.b : undefined;
  const probability = behaviour ? gapProbability(k, behaviour) : undefined;
  const significantGap =
    probability !== undefined &&
    probability >= GAP_CONFIDENCE &&
    (behaviour?.trades ?? 0) >= GAP_MIN_TRADES;
  const withGap = {
    ...base,
    ...(gap !== undefined && { gap }),
    ...(probability !== undefined && { gapProbability: probability }),
    significantGap,
  };
  if (k < KNOWS_P) return { ...withGap, deficit: 'knowledge' };
  if (significantGap) return { ...withGap, deficit: 'behaviour' };
  if (hasRule && !behaviour) return { ...withGap, deficit: 'practice' };
  return { ...withGap, deficit: knowledge.mastered && k >= MASTERED_P ? 'mastered' : 'learning' };
}

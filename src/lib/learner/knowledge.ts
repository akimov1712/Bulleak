/**
 * Knowledge estimate K per skill: Bayesian knowledge tracing (Corbett, Anderson, 1995) with
 * forgetting. See docs/04-features/learner-model.md, section 4.
 */
import type { QuestionType } from '@/types/quiz';
import type { AnswerEvent } from './events';

export interface BktParams {
  /** Knew the skill before the first answer. */
  pL0: number;
  /** Learned it after an answer. */
  pT: number;
  /** Slipped: answered wrong while knowing. */
  pS: number;
  /** Guessed right without knowing, when the question type is unknown. */
  pG: number;
}

export const DEFAULT_BKT: BktParams = { pL0: 0.2, pT: 0.15, pS: 0.1, pG: 0.2 };

/** Knowledge drifts back to pL0 with this half-life. */
export const FORGET_HALF_LIFE_DAYS = 30;
export const MASTERED_P = 0.85;
export const MASTERED_MIN_ANSWERS = 3;

const DAY_MS = 86_400_000;

/** Chance to answer right by luck, by question type. */
export function guessChance(
  type: QuestionType | undefined,
  params: BktParams = DEFAULT_BKT,
): number {
  switch (type) {
    case 'truefalse':
      return 0.5;
    case 'single':
      return 0.25;
    case 'multi':
    case 'chart-click':
    case 'match':
      return 0.1;
    case 'numeric':
    case 'order':
      return 0.05;
    default:
      return params.pG;
  }
}

/** One BKT step: posterior after the answer, then the chance to learn from it. */
export function bktStep(
  pL: number,
  ok: boolean,
  pG: number,
  params: BktParams = DEFAULT_BKT,
): number {
  const { pS, pT } = params;
  const known = ok ? pL * (1 - pS) : pL * pS;
  const unknown = ok ? (1 - pL) * pG : (1 - pL) * (1 - pG);
  const posterior = known + unknown === 0 ? pL : known / (known + unknown);
  return posterior + (1 - posterior) * pT;
}

/** Forgetting: the part of knowledge above pL0 halves every FORGET_HALF_LIFE_DAYS. */
export function forget(pL: number, ms: number, params: BktParams = DEFAULT_BKT): number {
  if (!(ms > 0) || pL <= params.pL0) return pL;
  return params.pL0 + (pL - params.pL0) * 0.5 ** (ms / DAY_MS / FORGET_HALF_LIFE_DAYS);
}

export interface SkillKnowledge {
  skill: string;
  /** K now, after forgetting since the last answer. */
  p: number;
  /** K right after the last answer. */
  pAtLast: number;
  answers: number;
  correct: number;
  lastAt: number;
  mastered: boolean;
}

/**
 * K for every skill that has answers. `events` must be oldest first (as learningEvents returns);
 * an answer counts once for each of its skills.
 */
export function knowledgeBySkill(
  events: readonly AnswerEvent[],
  now: number,
  paramsOf: (skill: string) => BktParams = () => DEFAULT_BKT,
): Map<string, SkillKnowledge> {
  const state = new Map<string, { p: number; answers: number; correct: number; lastAt: number }>();
  for (const e of events) {
    for (const skill of e.skills) {
      const params = paramsOf(skill);
      const s = state.get(skill) ?? { p: params.pL0, answers: 0, correct: 0, lastAt: e.at };
      // Hints (docs/04-features/hints.md): after the rule a right answer tells as little as a
      // coin flip; after the walkthrough it is not the learner's own answer at all.
      const ok = e.ok && (e.hint ?? 0) < 3;
      const pG =
        (e.hint ?? 0) >= 2
          ? Math.max(0.5, guessChance(e.type, params))
          : guessChance(e.type, params);
      const p = bktStep(forget(s.p, e.at - s.lastAt, params), ok, pG, params);
      state.set(skill, {
        p,
        answers: s.answers + 1,
        correct: s.correct + (ok ? 1 : 0),
        lastAt: e.at,
      });
    }
  }
  const out = new Map<string, SkillKnowledge>();
  for (const [skill, s] of state) {
    const p = forget(s.p, now - s.lastAt, paramsOf(skill));
    out.set(skill, {
      skill,
      p,
      pAtLast: s.p,
      answers: s.answers,
      correct: s.correct,
      lastAt: s.lastAt,
      mastered: p >= MASTERED_P && s.answers >= MASTERED_MIN_ANSWERS,
    });
  }
  return out;
}

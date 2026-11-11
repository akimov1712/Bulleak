/** The learner model in one call: events → K, B, gap and deficit per skill. */
import type { SimTrade } from '@/types/trading';
import { BEHAVIOUR_RULES, behaviourBySkill } from './behaviour';
import { tradeEvents, type AnswerEvent } from './events';
import { skillState, type SkillState } from './gap';
import { knowledgeBySkill } from './knowledge';

export interface LearnerModelInput {
  /** answerEvents(attempts, …), oldest first. */
  answers: readonly AnswerEvent[];
  trades: readonly SimTrade[];
  /** Skill ids; the result keeps this order. */
  skills: readonly string[];
  now: number;
}

export function learnerModel(input: LearnerModelInput): SkillState[] {
  const knowledge = knowledgeBySkill(input.answers, input.now);
  const own = tradeEvents(input.trades).map((e) => e.trade);
  const behaviour = behaviourBySkill(own, input.now);
  const ruleSkills = new Set(BEHAVIOUR_RULES.map((r) => r.skill));
  return input.skills.map((id) =>
    skillState(id, knowledge.get(id), behaviour.get(id), ruleSkills.has(id), own.length > 0),
  );
}

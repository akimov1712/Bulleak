/** The learner model in one call: events → K, B, gap and deficit per skill. */
import type { QuizAttempt } from '@/types/progress';
import type { SimTrade } from '@/types/trading';
import { BEHAVIOUR_RULES, behaviourBySkill } from './behaviour';
import { answerEvents, tradeEvents, type SkillsOfTags } from './events';
import { skillState, type SkillState } from './gap';
import { knowledgeBySkill } from './knowledge';

export interface LearnerModelInput {
  attempts: readonly QuizAttempt[];
  trades: readonly SimTrade[];
  /** Skill ids in display order. */
  skills: readonly string[];
  skillsOfTags: SkillsOfTags;
  now: number;
}

export function learnerModel(input: LearnerModelInput): SkillState[] {
  const knowledge = knowledgeBySkill(answerEvents(input.attempts, input.skillsOfTags), input.now);
  const behaviour = behaviourBySkill(
    tradeEvents(input.trades).map((e) => e.trade),
    input.now,
  );
  const ruleSkills = new Set(BEHAVIOUR_RULES.map((r) => r.skill));
  return input.skills.map((id) =>
    skillState(id, knowledge.get(id), behaviour.get(id), ruleSkills.has(id)),
  );
}

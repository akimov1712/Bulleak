/** Learner model: skills, knowledge and behaviour. See docs/04-features/learner-model.md. */
import type { LessonId } from './course';

export type SkillGroup =
  | 'basics'
  | 'chart'
  | 'patterns'
  | 'indicators'
  | 'context'
  | 'derivatives'
  | 'risk'
  | 'mind'
  | 'strategy';

export interface Skill {
  /** kebab-case, stable: progress and research data refer to it. */
  id: string;
  title: string;
  group: SkillGroup;
  /** Question tags of this skill. A question belongs to every skill that shares a tag with it. */
  tags: readonly string[];
  /** Lessons that teach the skill, main one first. */
  lessons: readonly LessonId[];
  /** Skills to learn before this one. The graph has no cycles. */
  requires: readonly string[];
}

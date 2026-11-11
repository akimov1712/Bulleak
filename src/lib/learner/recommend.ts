/**
 * Next step from the learner model (docs/04-features/learner-model.md, sections 6 and 9):
 * a significant knowledge–behaviour gap first, then due reviews, then theory for a weak skill,
 * then practice for a known rule; otherwise the course continues as before.
 */
import type { SkillState } from './gap';

export type Recommendation =
  | { kind: 'gap'; skill: string }
  | { kind: 'review'; skills: string[] }
  | { kind: 'theory'; skill: string }
  | { kind: 'practice'; skill: string }
  | { kind: 'course' };

/**
 * `states` in prerequisite order (skillIndex.order), `requires` gives a skill's prerequisites.
 * A weak skill is offered only when none of its prerequisites is weak itself — the earlier one
 * comes first.
 */
export function recommendStep(
  states: readonly SkillState[],
  dueSkills: readonly string[],
  requires: (skill: string) => readonly string[],
): Recommendation {
  const gap = states.find((s) => s.deficit === 'behaviour');
  if (gap) return { kind: 'gap', skill: gap.skill };
  if (dueSkills.length > 0) return { kind: 'review', skills: [...dueSkills] };
  const weak = new Set(states.filter((s) => s.deficit === 'knowledge').map((s) => s.skill));
  const theory = states.find(
    (s) => weak.has(s.skill) && requires(s.skill).every((r) => !weak.has(r)),
  );
  if (theory) return { kind: 'theory', skill: theory.skill };
  const practice = states.find((s) => s.deficit === 'practice');
  if (practice) return { kind: 'practice', skill: practice.skill };
  return { kind: 'course' };
}

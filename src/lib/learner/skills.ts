/** Lookups over the skill graph (docs/04-features/learner-model.md, section 2). Pure: the graph is passed in. */
import type { Skill } from '@/types/learner';

/** Problems in a skill graph (empty list = valid). */
export function skillGraphProblems(skills: readonly Skill[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const s of skills) {
    if (ids.has(s.id)) problems.push(`${s.id}: duplicate id`);
    ids.add(s.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) problems.push(`${s.id}: id is not kebab-case`);
    if (!s.title.trim()) problems.push(`${s.id}: empty title`);
    if (s.tags.length === 0) problems.push(`${s.id}: no tags`);
    if (new Set(s.tags).size !== s.tags.length) problems.push(`${s.id}: duplicate tag`);
    if (s.lessons.length === 0) problems.push(`${s.id}: no lessons`);
    if (s.requires.includes(s.id)) problems.push(`${s.id}: requires itself`);
  }
  for (const s of skills) {
    for (const r of s.requires)
      if (!ids.has(r)) problems.push(`${s.id}: unknown prerequisite ${r}`);
  }
  if (problems.length === 0 && topologicalOrder(skills) === null)
    problems.push('prerequisites form a cycle');
  return problems;
}

/** Skill ids so that prerequisites come first (stable: graph order breaks ties); null on a cycle. */
export function topologicalOrder(skills: readonly Skill[]): string[] | null {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const state = new Map<string, 'visiting' | 'done'>();
  const order: string[] = [];
  const visit = (id: string): boolean => {
    const st = state.get(id);
    if (st === 'done') return true;
    if (st === 'visiting') return false;
    state.set(id, 'visiting');
    for (const r of byId.get(id)?.requires ?? []) if (byId.has(r) && !visit(r)) return false;
    state.set(id, 'done');
    order.push(id);
    return true;
  };
  for (const s of skills) if (!visit(s.id)) return null;
  return order;
}

export function createSkillIndex(skills: readonly Skill[]) {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const byTag = new Map<string, string[]>();
  for (const s of skills) {
    for (const t of s.tags) {
      const list = byTag.get(t) ?? [];
      list.push(s.id);
      byTag.set(t, list);
    }
  }
  const order = topologicalOrder(skills) ?? skills.map((s) => s.id);

  return {
    skills,
    /** Prerequisites first. */
    order,
    getSkill: (id: string): Skill | undefined => byId.get(id),
    /** Skills a question with these tags belongs to, in graph order, without repeats. */
    skillsOfTags(tags: readonly string[]): string[] {
      const found = new Set(tags.flatMap((t) => byTag.get(t) ?? []));
      return skills.filter((s) => found.has(s.id)).map((s) => s.id);
    },
    /** Tags of the skill that are glossary terms. */
    termsOf(id: string, isTerm: (tag: string) => boolean): string[] {
      return (byId.get(id)?.tags ?? []).filter(isTerm);
    },
    /** Every prerequisite of the skill passes `known`. */
    prerequisitesMet(id: string, known: (skillId: string) => boolean): boolean {
      return (byId.get(id)?.requires ?? []).every(known);
    },
  };
}

export type SkillIndex = ReturnType<typeof createSkillIndex>;

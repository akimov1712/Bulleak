/**
 * Psychology situations (T-2504): short branching stories — a losing streak, a sharp move,
 * news. Every choice is judged by the trading plan, not by whether it would have made money.
 */

/** good — by the plan; risky — defensible but costly habit; bad — breaks a rule. */
export type ChoiceVerdict = 'good' | 'risky' | 'bad';

export interface SituationChoice {
  id: string;
  text: string;
  verdict: ChoiceVerdict;
  feedback: string;
  /** Next step id; absent — the situation ends here. */
  next?: string;
}

export interface SituationStep {
  id: string;
  text: string;
  choices: SituationChoice[];
}

export interface Situation {
  id: string;
  title: string;
  /** What this situation trains, one line. */
  skill: string;
  steps: SituationStep[];
}

const POINTS: Record<ChoiceVerdict, number> = { good: 1, risky: 0.5, bad: 0 };

export function stepById(situation: Situation, id: string): SituationStep | undefined {
  return situation.steps.find((s) => s.id === id);
}

export function choiceById(step: SituationStep, id: string): SituationChoice | undefined {
  return step.choices.find((c) => c.id === id);
}

/** Discipline share 0–1 over the choices made; null before the first choice. */
export function disciplineScore(verdicts: readonly ChoiceVerdict[]): number | null {
  if (verdicts.length === 0) return null;
  return verdicts.reduce((sum, v) => sum + POINTS[v], 0) / verdicts.length;
}

/** Problems in situation content: missing steps, dead ends, unreachable steps, no good path. */
export function situationProblems(situation: Situation): string[] {
  const p: string[] = [];
  const ids = new Set(situation.steps.map((s) => s.id));
  if (ids.size !== situation.steps.length) p.push('duplicate step ids');
  const first = situation.steps[0];
  if (!first) return ['no steps'];
  const reached = new Set<string>([first.id]);
  const queue = [first];
  while (queue.length) {
    const step = queue.shift();
    if (!step) break;
    if (step.choices.length < 2) p.push(`${step.id}: needs ≥2 choices`);
    if (!step.choices.some((c) => c.verdict === 'good')) p.push(`${step.id}: no good choice`);
    for (const c of step.choices) {
      if (c.feedback.length < 20) p.push(`${step.id}/${c.id}: feedback too short`);
      if (!c.next) continue;
      if (!ids.has(c.next)) p.push(`${step.id}/${c.id}: unknown next ${c.next}`);
      else if (!reached.has(c.next)) {
        reached.add(c.next);
        const nextStep = stepById(situation, c.next);
        if (nextStep) queue.push(nextStep);
      }
    }
  }
  for (const id of ids) if (!reached.has(id)) p.push(`${id}: unreachable`);
  return p;
}

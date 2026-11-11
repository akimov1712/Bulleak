/**
 * Contextual tips from the learner's own data (docs/04-features/hints.md, section 4). Each rule
 * looks at the last trades or the learner model and gives at most one tip.
 */
import type { SimTrade } from '@/types/trading';
import {
  disciplineChecks,
  plannedRr,
  simDisciplineTrades,
  COURSE_LIMITS,
} from '@/lib/discipline/rules';

export const TIP_WINDOW = 10;
export const TIP_SNOOZE_MS = 7 * 86_400_000;

export type Tip =
  | { id: 'stop-moved'; count: number; of: number }
  | { id: 'revenge'; count: number; of: number }
  | { id: 'low-rr'; avgRr: number }
  | { id: 'misconception'; skill: string };

/** All tips that apply, most important first. */
export function contextTips(trades: readonly SimTrade[], misconceptions: readonly string[]): Tip[] {
  const own = simDisciplineTrades(trades);
  const recent = own.slice(-TIP_WINDOW);
  const checks = disciplineChecks(own).slice(-TIP_WINDOW);
  const broken = (rule: string) =>
    checks.filter((c) => c.some((x) => x.rule === rule && !x.ok)).length;
  const tips: Tip[] = [];

  const moved = broken('stop-moved');
  if (moved >= 2) tips.push({ id: 'stop-moved', count: moved, of: recent.length });
  const revenge = broken('revenge');
  if (revenge >= 2) tips.push({ id: 'revenge', count: revenge, of: recent.length });
  const withTp = recent.filter((t) => t.tp !== undefined);
  if (withTp.length >= 5) {
    const avgRr =
      withTp.reduce((s, t) => s + plannedRr({ entry: t.entry, sl: t.sl, tp: t.tp ?? t.entry }), 0) /
      withTp.length;
    if (avgRr < COURSE_LIMITS.minRr) tips.push({ id: 'low-rr', avgRr });
  }
  const skill = misconceptions[0];
  if (skill) tips.push({ id: 'misconception', skill });
  return tips;
}

/** The first tip not snoozed: `snoozed` maps a tip id to the time it may come back. */
export function pickTip(
  tips: readonly Tip[],
  snoozed: Readonly<Record<string, number>>,
  now: number,
): Tip | null {
  return tips.find((t) => (snoozed[t.id] ?? 0) <= now) ?? null;
}

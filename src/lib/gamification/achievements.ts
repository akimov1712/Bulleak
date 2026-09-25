import type { AchievementContext, AchievementDef } from '@/types/achievements';
import type { ProgressState } from '@/types/progress';

/** Achievements that are newly earned in `state` (never returns already-unlocked ids). */
export function evaluateAchievements(
  defs: readonly AchievementDef[],
  state: ProgressState,
  ctx: AchievementContext,
): AchievementDef[] {
  return defs.filter((def) => state.achievements[def.id] === undefined && def.check(state, ctx));
}

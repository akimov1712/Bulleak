import type { ProgressEvent } from './events';
import type { ProgressState } from './progress';
import type { CourseIndex } from '@/lib/content';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'learning' | 'habit' | 'practice' | 'other';

export interface AchievementContext {
  now: number;
  /** The event that just happened (for event-based achievements). */
  event?: ProgressEvent;
  course: CourseIndex;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Emoji shown on the badge. */
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp: number;
  /** Hidden ("???") until unlocked. */
  secret?: boolean;
  /** Evaluated on the state AFTER the event was applied. */
  check: (state: ProgressState, ctx: AchievementContext) => boolean;
  /** Optional counter for the achievements page: current / target. */
  progress?: (
    state: ProgressState,
    ctx: Omit<AchievementContext, 'event'>,
  ) => { current: number; target: number };
}

/** Levels and ranks — docs/04-features/gamification.md («Уровни»). */

export const MAX_LEVEL = 20;

/** Rank titles; each covers two levels (1–2, 3–4, …). */
export const RANKS = [
  'Новичок',
  'Наблюдатель',
  'Ученик',
  'Чартист',
  'Аналитик',
  'Риск-менеджер',
  'Стратег',
  'Свинг-трейдер',
  'Профи',
  'Мастер рынка',
] as const;

/** Total XP needed to reach `level` (level 1 = 0). Rounded to tens. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const clamped = Math.min(level, MAX_LEVEL);
  return Math.round((60 * (clamped - 1) ** 1.6) / 10) * 10;
}

export function rankForLevel(level: number): string {
  const index = Math.min(RANKS.length - 1, Math.max(0, Math.floor((level - 1) / 2)));
  return RANKS[index] ?? RANKS[0];
}

export interface LevelInfo {
  level: number;
  rank: string;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP from the current level to the next (0 at max level). */
  levelSpan: number;
  /** 0..1 progress to the next level (1 at max level). */
  progress: number;
  /** XP still needed for the next level (0 at max). */
  toNext: number;
  isMax: boolean;
}

export function levelFromXp(xp: number): LevelInfo {
  const total = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let level = 1;
  while (level < MAX_LEVEL && total >= xpForLevel(level + 1)) level++;
  const isMax = level === MAX_LEVEL;
  const floor = xpForLevel(level);
  const levelSpan = isMax ? 0 : xpForLevel(level + 1) - floor;
  const intoLevel = total - floor;
  return {
    level,
    rank: rankForLevel(level),
    intoLevel,
    levelSpan,
    progress: isMax ? 1 : intoLevel / levelSpan,
    toNext: isMax ? 0 : levelSpan - intoLevel,
    isMax,
  };
}

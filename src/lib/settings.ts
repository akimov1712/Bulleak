import type { Settings, TourId } from '@/types/settings';

const isTourId = (v: unknown): v is TourId => v === 'home' || v === 'simulator';

/** Keeps only valid settings fields (persisted data, backup files). */
export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (typeof raw !== 'object' || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'system') out.theme = r.theme;
  if (typeof r.sound === 'boolean') out.sound = r.sound;
  if (
    r.dailyGoalXp === 20 ||
    r.dailyGoalXp === 50 ||
    r.dailyGoalXp === 100 ||
    r.dailyGoalXp === 150
  )
    out.dailyGoalXp = r.dailyGoalXp;
  if (typeof r.freeMode === 'boolean') out.freeMode = r.freeMode;
  if (r.reducedMotion === 'system' || r.reducedMotion === 'on' || r.reducedMotion === 'off')
    out.reducedMotion = r.reducedMotion;
  if (r.hints === 'all' || r.hints === 'less' || r.hints === 'off') out.hints = r.hints;
  if (Array.isArray(r.toursSeen)) out.toursSeen = [...new Set(r.toursSeen.filter(isTourId))];
  return out;
}

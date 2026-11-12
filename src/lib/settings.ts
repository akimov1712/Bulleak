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

/**
 * Version of the settings document on the server. 2 — sound and animations on by default
 * (2026-11-12); documents without it were written by older clients with the old defaults.
 */
export const SYNCED_SETTINGS_SCHEMA = 2;

/** Settings as sent to the server: valid fields plus the document version. */
export function settingsForSync(settings: unknown): Record<string, unknown> {
  return { ...sanitizeSettings(settings), schema: SYNCED_SETTINGS_SCHEMA };
}

/** Settings from the server; an old document gets the same upgrade as the local v1 → v2 one. */
export function settingsFromSync(raw: unknown): Partial<Settings> {
  const out = sanitizeSettings(raw);
  const schema = typeof raw === 'object' && raw !== null ? (raw as { schema?: unknown }).schema : 0;
  if (typeof schema === 'number' && schema >= SYNCED_SETTINGS_SCHEMA) return out;
  return { ...out, sound: true, reducedMotion: 'on' };
}

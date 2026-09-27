/** Trading plan and custom strategy: ids and normalization of stored data (T-611). */
import type { CustomStrategy, PlanSectionId, TradingPlan } from '@/types/progress';

export const PLAN_SECTION_IDS: readonly PlanSectionId[] = [
  'goals',
  'markets',
  'routine',
  'risk',
  'strategy',
  'news',
  'emotions',
  'review',
  'changes',
];

/** Upper bounds keep a corrupted or hostile backup from bloating localStorage. */
const MAX_TEXT = 4000;
const MAX_RULES = 30;
const MAX_RULE = 300;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function sanitizePlan(raw: unknown): TradingPlan | null {
  if (!isObject(raw) || !isObject(raw.sections)) return null;
  const sections: TradingPlan['sections'] = {};
  for (const id of PLAN_SECTION_IDS) {
    const text = raw.sections[id];
    if (typeof text === 'string') sections[id] = text.slice(0, MAX_TEXT);
  }
  return { sections, updatedAt: finite(raw.updatedAt) };
}

export function sanitizeStrategy(raw: unknown): CustomStrategy | null {
  if (!isObject(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.rules)) return null;
  const rules = raw.rules
    .filter((r): r is string => typeof r === 'string')
    .map((r) => r.trim().slice(0, MAX_RULE))
    .filter(Boolean)
    .slice(0, MAX_RULES);
  if (rules.length === 0) return null;
  return { name: raw.name.trim().slice(0, 80), rules, updatedAt: finite(raw.updatedAt) };
}

/** Rules edited in the form → stored rules (trimmed, empty lines dropped). */
export const cleanRules = (rules: readonly string[]) =>
  rules
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, MAX_RULES);

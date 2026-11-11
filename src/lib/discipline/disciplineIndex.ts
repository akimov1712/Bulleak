/** Discipline index (docs/04-features/stats-v2.md, section 4). */
import { DISCIPLINE_RULES, type RuleCheck, type RuleId } from './rules';

/** The index looks at this many latest trades. */
export const DISCIPLINE_WINDOW = 20;
/** Fewer trades: «мало данных». */
export const DISCIPLINE_MIN_TRADES = 5;

/** Share of kept checks over a window of trades, 0–100; null when nothing was checked. */
function indexOf(window: readonly (readonly RuleCheck[])[]): number | null {
  const all = window.flat();
  if (all.length === 0) return null;
  return (all.filter((c) => c.ok).length / all.length) * 100;
}

/** The index after each trade (over the trades up to it, at most DISCIPLINE_WINDOW). */
export function disciplineSeries(
  checks: readonly (readonly RuleCheck[])[],
  window = DISCIPLINE_WINDOW,
): (number | null)[] {
  return checks.map((_, i) => indexOf(checks.slice(Math.max(0, i + 1 - window), i + 1)));
}

export interface RuleTally {
  rule: RuleId;
  title: string;
  checked: number;
  broken: number;
}

export interface DisciplineSummary {
  trades: number;
  /** Current index; null without checks. */
  index: number | null;
  /** Fewer than DISCIPLINE_MIN_TRADES trades: the index is shown as «мало данных». */
  fewTrades: boolean;
  /** Index after each trade (null entries skipped by charts). */
  series: (number | null)[];
  /** Per rule over the window, most broken first; rules never checked are left out. */
  rules: RuleTally[];
}

export function disciplineSummary(
  checks: readonly (readonly RuleCheck[])[],
  window = DISCIPLINE_WINDOW,
): DisciplineSummary {
  const recent = checks.slice(-window).flat();
  const rules = DISCIPLINE_RULES.map((r) => {
    const mine = recent.filter((c) => c.rule === r.id);
    return {
      rule: r.id,
      title: r.title,
      checked: mine.length,
      broken: mine.filter((c) => !c.ok).length,
    };
  })
    .filter((t) => t.checked > 0)
    .sort((a, b) => b.broken / b.checked - a.broken / a.checked || b.broken - a.broken);
  const series = disciplineSeries(checks, window);
  return {
    trades: checks.length,
    index: series[series.length - 1] ?? null,
    fewTrades: checks.length < DISCIPLINE_MIN_TRADES,
    series,
    rules,
  };
}

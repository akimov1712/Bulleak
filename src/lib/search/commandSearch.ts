/** Site-wide search for the command palette (⌘K): pages, lessons, terms, calculators. */
import { normalize } from '@/lib/glossary/search';

export type CommandKind = 'page' | 'module' | 'lesson' | 'term' | 'tool' | 'cheatsheet';

export interface CommandItem {
  /** Unique within the index; also the React key. */
  id: string;
  kind: CommandKind;
  title: string;
  /** Second line: module, short definition… Searched with a lower rank. */
  subtitle?: string;
  /** Extra names that count as the title (aliases, English terms). */
  keywords?: readonly string[];
  /** Router path to open. */
  to: string;
}

/** Order of kinds when ranks tie: navigation first, reference last. */
const KIND_ORDER: Record<CommandKind, number> = {
  page: 0,
  module: 1,
  lesson: 2,
  tool: 3,
  cheatsheet: 4,
  term: 5,
};

/**
 * Rank: 0 exact title/keyword, 1 a word of it starts with the query, 2 it contains the query,
 * 3 only the subtitle contains it; null — no match. Every query word must match somewhere.
 */
function rank(item: CommandItem, words: readonly string[]): number | null {
  const names = [item.title, ...(item.keywords ?? [])].map(normalize);
  const subtitle = normalize(item.subtitle ?? '');
  const phrase = words.join(' ');
  if (names.includes(phrase)) return 0;
  let worst = 0;
  for (const w of words) {
    let r: number;
    if (
      names.some(
        (n) => n.startsWith(w) || n.split(/[\s\-—–·:,.()«»]+/).some((p) => p.startsWith(w)),
      )
    )
      r = 1;
    else if (names.some((n) => n.includes(w))) r = 2;
    else if (subtitle.includes(w)) r = 3;
    else return null;
    worst = Math.max(worst, r);
  }
  return worst;
}

/** Items matching every word of the query, best first; an empty query returns nothing. */
export function searchCommands(
  items: readonly CommandItem[],
  query: string,
  limit = 20,
): CommandItem[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return items
    .map((item, order) => ({ item, order, rank: rank(item, words) }))
    .filter((x): x is { item: CommandItem; order: number; rank: number } => x.rank !== null)
    .sort(
      (a, b) =>
        a.rank - b.rank || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.order - b.order,
    )
    .slice(0, limit)
    .map((x) => x.item);
}

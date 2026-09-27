/** Glossary search and alphabetical index (glossary.md): case- and «ё/е»-insensitive. */
import type { GlossaryTerm } from '@/types/glossary';

/** Lower case, ё → е, single spaces. */
export const normalize = (text: string) =>
  text.toLowerCase().replaceAll('ё', 'е').replace(/\s+/g, ' ').trim();

const collator = new Intl.Collator('ru', { sensitivity: 'base' });
export const byTerm = (a: GlossaryTerm, b: GlossaryTerm) => collator.compare(a.term, b.term);

/**
 * Rank: 0 exact name/alias, 1 name/alias starts with the query, 2 name/alias contains it,
 * 3 only the short definition contains it; null — no match.
 */
function rank(term: GlossaryTerm, q: string): number | null {
  const names = [term.term, ...term.aliases].map(normalize);
  if (names.some((n) => n === q)) return 0;
  if (names.some((n) => n.startsWith(q) || n.split(' ').some((w) => w.startsWith(q)))) return 1;
  if (names.some((n) => n.includes(q))) return 2;
  if (normalize(term.short).includes(q)) return 3;
  return null;
}

/** Terms matching the query, best matches first; all terms alphabetically for an empty query. */
export function searchTerms(terms: readonly GlossaryTerm[], query: string): GlossaryTerm[] {
  const q = normalize(query);
  if (q === '') return [...terms].sort(byTerm);
  return terms
    .map((term) => ({ term, rank: rank(term, q) }))
    .filter((x): x is { term: GlossaryTerm; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || byTerm(a.term, b.term))
    .map((x) => x.term);
}

/** First letter for the А–Я / A–Z index (ё is filed under Е, digits under «#»). */
export function indexLetter(term: GlossaryTerm): string {
  const first = normalize(term.term).charAt(0).toUpperCase();
  return /[A-ZА-Я]/.test(first) ? first : '#';
}

/** Terms grouped by index letter, Cyrillic first, then Latin, then «#». */
export function alphabetGroups(terms: readonly GlossaryTerm[]): [string, GlossaryTerm[]][] {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const t of [...terms].sort(byTerm)) {
    const letter = indexLetter(t);
    groups.set(letter, [...(groups.get(letter) ?? []), t]);
  }
  const order = (l: string) => (/[А-Я]/.test(l) ? 0 : /[A-Z]/.test(l) ? 1 : 2);
  return [...groups.entries()].sort(([a], [b]) => order(a) - order(b) || collator.compare(a, b));
}

import { paths } from '@/app/paths';
import { NAV_SECTIONS, secondaryNav } from '@/app/layout/nav';
import { course } from '@/content/course';
import { glossary } from '@/content/glossary';
import { CHEATSHEETS } from '@/content/cheatsheets';
import { CALCULATOR_LIST } from '@/features/calculators/registry';
import type { CommandItem } from '@/lib/search/commandSearch';

/** Everything the ⌘K search can open. Built once, when the palette is first loaded. */
export const SEARCH_INDEX: readonly CommandItem[] = [
  ...[...NAV_SECTIONS.flatMap((s) => s.items), ...secondaryNav].map((item): CommandItem => ({
    id: `page:${item.to}`,
    kind: 'page',
    title: item.label,
    subtitle: item.description,
    to: item.to,
  })),
  ...course.map((m): CommandItem => ({
    id: `module:${m.id}`,
    kind: 'module',
    title: `Модуль ${m.index}. ${m.title}`,
    keywords: [m.title],
    subtitle: m.description,
    to: paths.module(m.id),
  })),
  ...course.flatMap((m) =>
    m.lessons.map((l): CommandItem => ({
      id: `lesson:${l.id}`,
      kind: 'lesson',
      title: l.title,
      subtitle: `Урок ${m.index}.${l.index} · ${m.title}`,
      to: paths.lesson(l.id),
    })),
  ),
  ...CALCULATOR_LIST.map((c): CommandItem => ({
    id: `tool:${c.id}`,
    kind: 'tool',
    title: c.title,
    subtitle: c.description,
    to: paths.tools(c.id),
  })),
  ...CHEATSHEETS.map((c): CommandItem => ({
    id: `cheatsheet:${c.id}`,
    kind: 'cheatsheet',
    title: c.title,
    subtitle: 'Шпаргалка',
    to: paths.cheatsheets(),
  })),
  ...glossary.map((t): CommandItem => ({
    id: `term:${t.id}`,
    kind: 'term',
    title: t.term,
    keywords: t.aliases,
    subtitle: t.short,
    to: paths.glossary(t.id),
  })),
];

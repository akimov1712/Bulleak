import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { paths } from '@/app/paths';
import { getTerm } from '@/content/glossary';

/** Popover body of an inline term; loaded with the glossary on first open (see Term). */
export function TermCard({ id }: { id: string }) {
  const term = getTerm(id);
  if (!term) return <span>Термин не найден</span>;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="font-extrabold">{term.term}</span>
      <span className="text-text-muted">{term.short}</span>
      <Link
        to={paths.glossary(term.id)}
        className="inline-flex items-center gap-1 text-xs font-extrabold text-info hover:underline"
      >
        <BookOpen className="size-3.5" aria-hidden="true" />
        Подробнее в глоссарии
      </Link>
    </span>
  );
}

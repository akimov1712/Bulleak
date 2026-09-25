import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Popover } from '@/components/ui/Popover';
import { getTerm } from '@/content/glossary';
import { paths } from '@/app/paths';

export interface TermProps {
  id: string;
  children: ReactNode;
}

/** Inline glossary term: dotted underline, popover with the short definition on hover/focus/tap. */
export function Term({ id, children }: TermProps) {
  const term = getTerm(id);
  if (!term) {
    if (import.meta.env.DEV) throw new Error(`Глоссарий: неизвестный термин "${id}"`);
    return <>{children}</>;
  }
  return (
    <Popover
      trigger="hover"
      placement="top"
      content={
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
      }
    >
      <button
        type="button"
        className="cursor-help rounded-sm font-[inherit] text-inherit underline decoration-info decoration-dotted decoration-2 underline-offset-4 hover:bg-info-soft"
      >
        {children}
      </button>
    </Popover>
  );
}

import { lazy, Suspense, type ReactNode } from 'react';
import { Popover } from '@/components/ui/Popover';

// The glossary is large: load it with the card on first open, not with every lesson page.
// Unknown ids are caught by the content validation test (content.test.ts).
const TermCard = lazy(() => import('./TermCard').then((m) => ({ default: m.TermCard })));

export interface TermProps {
  id: string;
  children: ReactNode;
}

/** Inline glossary term: dotted underline, popover with the short definition on hover/focus/tap. */
export function Term({ id, children }: TermProps) {
  return (
    <Popover
      trigger="hover"
      placement="top"
      content={
        <Suspense fallback={<span className="text-text-muted">Загружаю…</span>}>
          <TermCard id={id} />
        </Suspense>
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

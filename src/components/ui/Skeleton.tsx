import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-surface-2', className)} />
  );
}

/** Full-width loading placeholder for lazy pages. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Загрузка" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export interface EmptyStateProps {
  /** Illustration slot (usually the mascot). */
  art?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** 1 when the empty state is the whole page (it then carries the page heading). */
  headingLevel?: 1 | 2 | 3;
}

export function EmptyState({
  art,
  title,
  description,
  action,
  className,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-(--radius-card) border-2 border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      {art}
      <Heading className="text-xl font-extrabold">{title}</Heading>
      {description && <div className="max-w-md text-text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

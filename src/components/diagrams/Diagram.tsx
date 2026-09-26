import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { diagramComponent } from './registry';

export interface DiagramProps {
  name: string;
  caption?: string;
}

/** SVG diagram from the registry, used in MDX as <Diagram name="candle-anatomy" />. */
export function Diagram({ name, caption }: DiagramProps) {
  const Component = diagramComponent(name);
  return (
    <figure className="my-6" data-diagram={name}>
      {Component ? (
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-2xl" />}>
          {/* eslint-disable-next-line react-hooks/static-components -- stable per name, cached in registry */}
          <Component />
        </Suspense>
      ) : (
        <p
          role="alert"
          className="rounded-2xl border-2 border-dashed border-warn p-4 text-center text-sm text-warn"
        >
          Схема «{name}» не найдена
        </p>
      )}
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}

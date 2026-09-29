import { lazy, Suspense, type ComponentType } from 'react';

/**
 * A lesson block loaded on demand: its code (and heavy dependencies such as the database or
 * the glossary) stays out of the lesson page chunk until a lesson actually uses the block.
 */
export function lazyBlock<P extends object>(
  load: () => Promise<ComponentType<P>>,
  minHeight = '6rem',
): ComponentType<P> {
  const Lazy = lazy(() => load().then((component) => ({ default: component })));
  function LazyLessonBlock(props: P) {
    return (
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="my-6 animate-pulse rounded-3xl bg-surface-2"
            style={{ minHeight }}
          />
        }
      >
        <Lazy {...props} />
      </Suspense>
    );
  }
  return LazyLessonBlock;
}

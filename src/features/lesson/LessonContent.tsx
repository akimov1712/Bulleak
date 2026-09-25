import { use } from 'react';
import { MDXProvider } from '@mdx-js/react';
import type { LessonId } from '@/types/course';
import { mdxComponents } from './mdxComponents';
import { lessonContentPromise } from './lessonCache';

/** Suspends until the lesson's MDX chunk is loaded, then renders it with lesson components. */
export function LessonContent({ id }: { id: LessonId }) {
  const Content = use(lessonContentPromise(id));
  return (
    <MDXProvider components={mdxComponents}>
      {/* The promise is cached per lesson, so `Content` is the same module-level MDX component
          on every render — no remounting, which is what static-components guards against. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Content />
    </MDXProvider>
  );
}

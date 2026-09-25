import type { MDXContent } from 'mdx/types';
import type { LessonId } from '@/types/course';
import { loadLesson } from '@/content/loaders';

const cache = new Map<LessonId, Promise<MDXContent>>();

/** Stable promise per lesson so `use()` + Suspense do not refetch on re-render. */
export function lessonContentPromise(id: LessonId): Promise<MDXContent> {
  let promise = cache.get(id);
  if (!promise) {
    promise = loadLesson(id);
    cache.set(id, promise);
  }
  return promise;
}

/** Drop a cached load so a failed lesson can be retried. */
export function forgetLessonContent(id: LessonId): void {
  cache.delete(id);
}

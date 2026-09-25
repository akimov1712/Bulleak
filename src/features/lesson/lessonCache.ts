import type { MDXContent } from 'mdx/types';
import type { LessonId } from '@/types/course';
import { loadLesson } from '@/content/loaders';
import { createPromiseCache } from '@/lib/promiseCache';

const cache = createPromiseCache<LessonId, MDXContent>();

/** Stable promise per lesson so `use()` + Suspense do not refetch on re-render. */
export const lessonContentPromise = (id: LessonId) => cache.get(id, () => loadLesson(id));

/** Drop a cached load so a failed lesson can be retried. */
export const forgetLessonContent = (id: LessonId) => cache.forget(id);

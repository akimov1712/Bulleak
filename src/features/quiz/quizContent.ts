import type { LessonId, ModuleId } from '@/types/course';
import type { Quiz } from '@/types/quiz';
import { loadExam, loadQuiz } from '@/content/loaders';
import { createPromiseCache } from '@/lib/promiseCache';

const cache = createPromiseCache<string, Quiz>();

/** Stable promises for `use()` + Suspense. */
export const lessonQuizPromise = (id: LessonId) => cache.get(`lesson:${id}`, () => loadQuiz(id));
export const examPromise = (id: ModuleId) => cache.get(`exam:${id}`, () => loadExam(id));

export const forgetQuiz = (key: string) => cache.forget(key);

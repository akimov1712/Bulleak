import type { LessonId, ModuleId } from '@/types/course';
import type { Quiz } from '@/types/quiz';
import { loadExam, loadFinalExam, loadQuiz } from '@/content/loaders';
import { createPromiseCache } from '@/lib/promiseCache';

const cache = createPromiseCache<string, Quiz>();

/** Stable promises for `use()` + Suspense. */
export const lessonQuizPromise = (id: LessonId) => cache.get(`lesson:${id}`, () => loadQuiz(id));
export const examPromise = (id: ModuleId) => cache.get(`exam:${id}`, () => loadExam(id));

export const forgetQuiz = (key: string) => cache.forget(key);

const finalCache = createPromiseCache<'final', Awaited<ReturnType<typeof loadFinalExam>>>();

/** The final exam module (theory pool + practical scenarios). */
export const finalExamPromise = () => finalCache.get('final', loadFinalExam);
/** Drop a failed load so the error screen's retry fetches again. */
export const forgetFinalExam = () => finalCache.forget('final');

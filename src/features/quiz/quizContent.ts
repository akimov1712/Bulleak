import type { LessonId, ModuleId } from '@/types/course';
import type { Quiz } from '@/types/quiz';
import { loadExam, loadQuiz } from '@/content/loaders';

const cache = new Map<string, Promise<Quiz>>();

function cached(key: string, load: () => Promise<Quiz>): Promise<Quiz> {
  let promise = cache.get(key);
  if (!promise) {
    promise = load();
    cache.set(key, promise);
  }
  return promise;
}

/** Stable promises for `use()` + Suspense. */
export const lessonQuizPromise = (id: LessonId) => cached(`lesson:${id}`, () => loadQuiz(id));
export const examPromise = (id: ModuleId) => cached(`exam:${id}`, () => loadExam(id));

export function forgetQuiz(key: string): void {
  cache.delete(key);
}

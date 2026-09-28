import type { MDXContent } from 'mdx/types';
import type { LessonId, ModuleId } from '@/types/course';
import type { Quiz } from '@/types/quiz';
import { lessonIdFromPath, moduleIdFromExamPath } from '@/lib/content';

/**
 * Lazy loaders for lesson content. Each lesson/quiz/exam is its own chunk.
 * Layout: src/content/modules/mXX/lYY/{index.mdx,quiz.ts}, src/content/modules/mXX/exam.ts
 */

type MdxModule = { default: MDXContent };
type QuizModule = { quiz: Quiz };
type ExamModule = { exam: Quiz };

function byLessonId<T>(globbed: Record<string, () => Promise<T>>) {
  const map = new Map<LessonId, () => Promise<T>>();
  for (const [file, load] of Object.entries(globbed)) {
    const id = lessonIdFromPath(file);
    if (id) map.set(id, load);
  }
  return map;
}

const lessonLoaders = byLessonId(import.meta.glob<MdxModule>('./modules/*/*/index.mdx'));
const quizLoaders = byLessonId(import.meta.glob<QuizModule>('./modules/*/*/quiz.ts'));

const examLoaders = new Map<ModuleId, () => Promise<ExamModule>>();
for (const [file, load] of Object.entries(import.meta.glob<ExamModule>('./modules/*/exam.ts'))) {
  const id = moduleIdFromExamPath(file);
  if (id) examLoaders.set(id, load);
}

export class ContentMissingError extends Error {
  constructor(what: string) {
    super(`Контент ещё не написан: ${what}`);
    this.name = 'ContentMissingError';
  }
}

export function hasLessonContent(id: LessonId): boolean {
  return lessonLoaders.has(id);
}

export function hasQuiz(id: LessonId): boolean {
  return quizLoaders.has(id);
}

export function hasExam(id: ModuleId): boolean {
  return examLoaders.has(id);
}

export async function loadLesson(id: LessonId): Promise<MDXContent> {
  const load = lessonLoaders.get(id);
  if (!load) throw new ContentMissingError(`урок ${id}`);
  return (await load()).default;
}

export async function loadQuiz(id: LessonId): Promise<Quiz> {
  const load = quizLoaders.get(id);
  if (!load) throw new ContentMissingError(`тест урока ${id}`);
  return (await load()).quiz;
}

export async function loadExam(id: ModuleId): Promise<Quiz> {
  const load = examLoaders.get(id);
  if (!load) throw new ContentMissingError(`экзамен модуля ${id}`);
  return (await load()).exam;
}

/** Final exam: the pooled theory part and the practical scenarios (its own chunk). */
export const loadFinalExam = () => import('./final-exam');

/** For content validation tests: every discovered content file. */
export const contentInventory = {
  lessons: [...lessonLoaders.keys()],
  quizzes: [...quizLoaders.keys()],
  exams: [...examLoaders.keys()],
  loadQuiz,
  loadExam,
};

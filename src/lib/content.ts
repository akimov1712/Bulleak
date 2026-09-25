import type { CourseModule, LessonId, LessonMeta, ModuleId } from '@/types/course';

/** Lookups over a course definition. Pure: the course array is passed in. */
export function createCourseIndex(course: readonly CourseModule[]) {
  const modules = [...course].sort((a, b) => a.index - b.index);
  const lessons: LessonMeta[] = modules.flatMap((m) =>
    [...m.lessons].sort((a, b) => a.index - b.index),
  );
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const lessonPosition = new Map(lessons.map((l, i) => [l.id, i]));

  return {
    modules,
    lessons,
    getModule: (id: string): CourseModule | undefined => moduleById.get(id as ModuleId),
    getLesson: (id: string): LessonMeta | undefined => lessonById.get(id as LessonId),
    /** Next lesson in course order (crosses module boundaries). */
    nextLesson(id: LessonId): LessonMeta | undefined {
      const pos = lessonPosition.get(id);
      return pos === undefined ? undefined : lessons[pos + 1];
    },
    prevLesson(id: LessonId): LessonMeta | undefined {
      const pos = lessonPosition.get(id);
      return pos === undefined || pos === 0 ? undefined : lessons[pos - 1];
    },
    /** Module that follows `id`, if any. */
    nextModule(id: ModuleId): CourseModule | undefined {
      const m = moduleById.get(id);
      return m ? modules[modules.indexOf(m) + 1] : undefined;
    },
  };
}

export type CourseIndex = ReturnType<typeof createCourseIndex>;

/** "m03-l02" → "modules/m03/l02" (folder of the lesson's MDX and quiz). */
export function lessonPath(id: LessonId): string {
  const [moduleId, lessonPart] = id.split('-');
  return `modules/${moduleId}/${lessonPart}`;
}

/** Inverse of lessonPath for glob keys like "./modules/m03/l02/index.mdx". */
export function lessonIdFromPath(filePath: string): LessonId | null {
  const match = filePath.match(/modules\/(m\d\d)\/(l\d\d)\//);
  return match ? (`${match[1]}-${match[2]}` as LessonId) : null;
}

/** "./modules/m03/exam.ts" → "m03". */
export function moduleIdFromExamPath(filePath: string): ModuleId | null {
  const match = filePath.match(/modules\/(m\d\d)\/exam\.ts$/);
  return match ? (match[1] as ModuleId) : null;
}

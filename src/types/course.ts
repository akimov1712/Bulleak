/** Course structure. Source of truth: docs/02-architecture/data-model.md */

export type ModuleId = `m${string}`; // "m00".."m12"
export type LessonId = `m${string}-l${string}`; // "m03-l02"

export type ModuleColor =
  'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'teal' | 'yellow' | 'red';

export type LessonPractice = 'simulator' | 'calculator' | 'journal' | 'chart';

export interface LessonMeta {
  id: LessonId;
  moduleId: ModuleId;
  /** Position within the module, starting at 1. */
  index: number;
  title: string;
  /** One sentence for cards and popovers. */
  summary: string;
  /** Estimated reading + practice time. */
  minutes: number;
  /** Glossary term ids introduced in this lesson. */
  terms: string[];
  practice?: LessonPractice;
  scenarioIds?: string[];
}

export interface CourseModule {
  id: ModuleId;
  /** 0..12 */
  index: number;
  title: string;
  description: string;
  /** lucide icon name (kebab-case). */
  icon: string;
  color: ModuleColor;
  cover?: string;
  lessons: LessonMeta[];
  /** Module 0 has no exam. */
  hasExam: boolean;
}

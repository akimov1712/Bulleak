import type { LessonId } from './course';

export type GlossaryCategory =
  | 'basics'
  | 'exchange'
  | 'chart'
  | 'indicators'
  | 'macro'
  | 'futures'
  | 'risk'
  | 'psychology'
  | 'strategy';

export interface GlossaryTerm {
  id: string;
  /** Display name, e.g. "Кредитное плечо". */
  term: string;
  /** Other spellings for search: English name, abbreviations. */
  aliases: string[];
  /** One sentence for popovers. */
  short: string;
  /** 2–5 sentences for the glossary page (plain text, paragraphs split by blank lines). */
  full: string;
  category: GlossaryCategory;
  related: string[];
  /** Lesson where the term is introduced. */
  lessonId: LessonId;
}

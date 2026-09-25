import { describe, expect, it } from 'vitest';
import type { CourseModule } from '@/types/course';
import { createCourseIndex, lessonIdFromPath, lessonPath, moduleIdFromExamPath } from './content';
import { course } from '@/content/course';

const mini: CourseModule[] = [
  {
    id: 'm01',
    index: 1,
    title: 'B',
    description: '',
    icon: 'x',
    color: 'blue',
    hasExam: true,
    lessons: [
      { id: 'm01-l02', moduleId: 'm01', index: 2, title: 'b2', summary: '', minutes: 1, terms: [] },
      { id: 'm01-l01', moduleId: 'm01', index: 1, title: 'b1', summary: '', minutes: 1, terms: [] },
    ],
  },
  {
    id: 'm00',
    index: 0,
    title: 'A',
    description: '',
    icon: 'x',
    color: 'green',
    hasExam: false,
    lessons: [
      { id: 'm00-l01', moduleId: 'm00', index: 1, title: 'a1', summary: '', minutes: 1, terms: [] },
    ],
  },
];

describe('createCourseIndex', () => {
  const idx = createCourseIndex(mini);

  it('orders modules and lessons by index', () => {
    expect(idx.modules.map((m) => m.id)).toEqual(['m00', 'm01']);
    expect(idx.lessons.map((l) => l.id)).toEqual(['m00-l01', 'm01-l01', 'm01-l02']);
  });

  it('navigates across module boundaries', () => {
    expect(idx.nextLesson('m00-l01')?.id).toBe('m01-l01');
    expect(idx.prevLesson('m01-l01')?.id).toBe('m00-l01');
    expect(idx.prevLesson('m00-l01')).toBeUndefined();
    expect(idx.nextLesson('m01-l02')).toBeUndefined();
    expect(idx.nextLesson('m09-l09')).toBeUndefined();
    expect(idx.nextModule('m00')?.id).toBe('m01');
    expect(idx.nextModule('m01')).toBeUndefined();
    expect(idx.nextModule('m77')).toBeUndefined();
  });

  it('looks up by id', () => {
    expect(idx.getModule('m01')?.title).toBe('B');
    expect(idx.getLesson('m01-l02')?.title).toBe('b2');
    expect(idx.getLesson('nope')).toBeUndefined();
  });
});

describe('paths', () => {
  it('maps lesson ids to folders and back', () => {
    expect(lessonPath('m03-l02')).toBe('modules/m03/l02');
    expect(lessonIdFromPath('./modules/m03/l02/index.mdx')).toBe('m03-l02');
    expect(lessonIdFromPath('./other/file.ts')).toBeNull();
    expect(moduleIdFromExamPath('./modules/m03/exam.ts')).toBe('m03');
    expect(moduleIdFromExamPath('./modules/m03/l01/quiz.ts')).toBeNull();
  });
});

describe('real course registry', () => {
  const idx = createCourseIndex(course);

  it('has 13 modules and 62 lessons with unique, well-formed ids', () => {
    expect(idx.modules).toHaveLength(13);
    expect(idx.lessons).toHaveLength(62);
    expect(new Set(idx.lessons.map((l) => l.id)).size).toBe(62);
    for (const m of idx.modules) {
      m.lessons.forEach((l, i) => {
        expect(l.moduleId).toBe(m.id);
        expect(l.id).toBe(`${m.id}-l${String(i + 1).padStart(2, '0')}`);
        expect(l.minutes).toBeGreaterThan(0);
        expect(l.title.trim().length).toBeGreaterThan(1);
      });
    }
  });

  it('only module 0 has no exam', () => {
    expect(idx.modules.filter((m) => !m.hasExam).map((m) => m.id)).toEqual(['m00']);
  });
});

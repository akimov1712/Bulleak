/**
 * The assistant's course index (server/data/course-index.json) must match the content.
 * After changing lessons, the glossary or cheat sheets: `npm run ai:index`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COURSE_INDEX_VERSION, courseIndexFileSchema } from '@bulleak/shared';
import { buildCourseChunks } from '@/lib/ai/courseChunks';
import { lessonPath } from '@/lib/content';
import { CHEATSHEETS } from './cheatsheets';
import { courseIndex } from './courseIndex';
import { glossary } from './glossary';

const CONTENT = path.resolve(import.meta.dirname);

function build() {
  const lessons = courseIndex.lessons.flatMap((lesson) => {
    const file = path.join(CONTENT, lessonPath(lesson.id), 'index.mdx');
    if (!fs.existsSync(file)) return [];
    return [{ id: lesson.id, title: lesson.title, mdx: fs.readFileSync(file, 'utf8') }];
  });
  return {
    version: COURSE_INDEX_VERSION,
    chunks: buildCourseChunks({ lessons, terms: glossary, cheatsheets: CHEATSHEETS }),
  };
}

describe('assistant course index', () => {
  const index = build();

  it('covers every written lesson, term and cheat sheet', () => {
    expect(() => courseIndexFileSchema.parse(index)).not.toThrow();
    const refs = new Set(index.chunks.map((c) => c.ref));
    for (const lesson of courseIndex.lessons) {
      if (fs.existsSync(path.join(CONTENT, lessonPath(lesson.id), 'index.mdx')))
        expect(refs, lesson.id).toContain(lesson.id);
    }
    expect(index.chunks.filter((c) => c.kind === 'term')).toHaveLength(glossary.length);
    expect(new Set(index.chunks.map((c) => c.id)).size).toBe(index.chunks.length);
  });

  it('leaves no markup in the excerpts', () => {
    for (const c of index.chunks) {
      expect(c.text, c.id).not.toMatch(/<\/?[A-Z][A-Za-z]*|\*\*|items=\{/);
    }
  });

  it('is up to date in server/data (npm run ai:index)', async () => {
    await expect(`${JSON.stringify(index, null, 1)}\n`).toMatchFileSnapshot(
      '../../server/data/course-index.json',
    );
  });
});

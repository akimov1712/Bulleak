import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MDXProvider } from '@mdx-js/react';
import {
  ContentMissingError,
  contentInventory,
  hasLessonContent,
  loadExam,
  loadLesson,
  loadQuiz,
} from './loaders';

// Minimal stand-ins: this test checks the MDX pipeline, not the real blocks (T-204).
const Stub = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
const stubs = Object.fromEntries(
  [
    'Goals',
    'Summary',
    'Term',
    'Example',
    'Compare',
    'Warning',
    'Tip',
    'Reveal',
    'Steps',
    'Step',
    'Checklist',
  ].map((name) => [name, Stub]),
);

describe('content loaders', () => {
  it('discovers the sample lesson and its quiz', () => {
    expect(contentInventory.lessons).toContain('m00-l01');
    expect(contentInventory.quizzes).toContain('m00-l01');
    expect(hasLessonContent('m00-l01')).toBe(true);
    expect(hasLessonContent('m12-l04')).toBe(false);
  });

  it('compiles and renders MDX with GFM tables', async () => {
    const Lesson = await loadLesson('m00-l01');
    render(
      <MDXProvider components={stubs}>
        <Lesson />
      </MDXProvider>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Трейдинг простыми словами' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('loads the quiz module', async () => {
    const quiz = await loadQuiz('m00-l01');
    expect(quiz.id).toBe('m00-l01');
    expect(quiz.questions.length).toBeGreaterThanOrEqual(8);
  });

  it('throws a typed error for missing content', async () => {
    await expect(loadLesson('m12-l04')).rejects.toBeInstanceOf(ContentMissingError);
    await expect(loadQuiz('m12-l04')).rejects.toBeInstanceOf(ContentMissingError);
    await expect(loadExam('m01')).rejects.toBeInstanceOf(ContentMissingError);
  });
});

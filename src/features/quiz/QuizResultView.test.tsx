import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { QuizResult } from '@/types/quiz';
import { QuizResultView } from './QuizResultView';

const failed: QuizResult = {
  quizId: 'final',
  correct: 9,
  total: 10,
  ratio: 0.9,
  passed: false,
  perQuestion: [],
};

describe('QuizResultView', () => {
  it('uses the default exam wording for a failed attempt', () => {
    render(
      <QuizResultView kind="exam" result={failed} questions={[]} passRatio={0.85} actions={null} />,
    );
    expect(screen.getByText(/Для сдачи нужно 85\s?%/)).toBeInTheDocument();
  });

  it('shows a custom verdict when the page gives one (final exam failed on practice)', () => {
    render(
      <QuizResultView
        kind="exam"
        result={failed}
        questions={[]}
        passRatio={0.85}
        actions={null}
        failVerdict="Теория сдана, но практическая часть — нет."
      />,
    );
    expect(screen.getByText('Теория сдана, но практическая часть — нет.')).toBeInTheDocument();
    expect(screen.queryByText(/Для сдачи нужно/)).not.toBeInTheDocument();
  });
});

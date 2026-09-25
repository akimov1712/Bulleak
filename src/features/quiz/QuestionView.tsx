import type { PreparedQuestion } from '@/lib/quiz/prepare';
import type { AnswerByType } from '@/types/quiz';
import {
  MultiQuestionView,
  SingleQuestionView,
  TrueFalseQuestionView,
} from './questions/ChoiceQuestions';
import {
  MatchQuestionView,
  NumericQuestionView,
  OrderQuestionView,
} from './questions/InputQuestions';
import type { QuestionState } from './questions/types';

interface QuestionViewProps {
  question: PreparedQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  state: QuestionState;
}

/** Renders the right answer UI for a question type. */
export function QuestionView({ question: q, value, onChange, state }: QuestionViewProps) {
  switch (q.type) {
    case 'single':
      return (
        <SingleQuestionView
          question={q}
          value={value as AnswerByType['single']}
          onChange={onChange}
          state={state}
        />
      );
    case 'multi':
      return (
        <MultiQuestionView
          question={q}
          value={value as AnswerByType['multi']}
          onChange={onChange}
          state={state}
        />
      );
    case 'truefalse':
      return (
        <TrueFalseQuestionView
          question={q}
          value={value as AnswerByType['truefalse']}
          onChange={onChange}
          state={state}
        />
      );
    case 'numeric':
      return (
        <NumericQuestionView
          question={q}
          value={value as AnswerByType['numeric']}
          onChange={onChange}
          state={state}
        />
      );
    case 'match':
      return (
        <MatchQuestionView
          question={q}
          value={value as AnswerByType['match']}
          onChange={onChange}
          state={state}
        />
      );
    case 'order':
      return (
        <OrderQuestionView
          question={q}
          value={value as AnswerByType['order']}
          onChange={onChange}
          state={state}
        />
      );
    case 'chart-click':
      // Implemented with the chart component in T-405.
      return (
        <p className="rounded-2xl border-2 border-dashed border-border p-4 text-text-muted">
          Вопросы с кликом по графику появятся вместе с графиками.
        </p>
      );
  }
}

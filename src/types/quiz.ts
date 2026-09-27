/** Quizzes and exams. Source of truth: docs/02-architecture/data-model.md, docs/03-content/quiz-spec.md */
import type { IndicatorSpec } from '@/features/charts/annotations';

export interface QuizOption {
  id: string;
  text: string;
}

interface BaseQuestion {
  id: string;
  prompt: string;
  /** Why the right answer is right and the typical mistake is wrong. */
  explanation: string;
  /** Glossary term ids / topics for weak-topic statistics (1–3). */
  tags: string[];
  /** Optional image path under public/. */
  image?: string;
}

export interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: QuizOption[];
  correct: string;
}

export interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  options: QuizOption[];
  correct: string[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'truefalse';
  correct: boolean;
}

export interface NumericQuestion extends BaseQuestion {
  type: 'numeric';
  correct: number;
  /** Accepted when |answer − correct| ≤ tolerance. */
  tolerance: number;
  unit?: string;
}

export type ChartClickTarget =
  { kind: 'price'; min: number; max: number } | { kind: 'candle'; indices: number[] };

export interface ChartClickQuestion extends BaseQuestion {
  type: 'chart-click';
  /** Dataset name, e.g. "BTCUSDT-240". */
  dataset: string;
  /** Candle index range shown on the chart. */
  from: number;
  to: number;
  target: ChartClickTarget;
  /** Show the volume histogram under the candles. */
  volume?: boolean;
  /** Indicators drawn on the chart (overlays or panes), e.g. RSI for «где RSI ушёл ниже 30». */
  indicators?: IndicatorSpec[];
}

export interface MatchQuestion extends BaseQuestion {
  type: 'match';
  pairs: { left: string; right: string }[];
}

export interface OrderQuestion extends BaseQuestion {
  type: 'order';
  /** Items in the correct order. */
  items: string[];
}

export type Question =
  | SingleQuestion
  | MultiQuestion
  | TrueFalseQuestion
  | NumericQuestion
  | ChartClickQuestion
  | MatchQuestion
  | OrderQuestion;

export type QuestionType = Question['type'];

export type QuizKind = 'lesson' | 'exam' | 'final';

export interface Quiz {
  /** Lesson id, module id (exam) or "final". */
  id: string;
  kind: QuizKind;
  questions: Question[];
  /** Pass threshold as a fraction, 0.8 = 80%. */
  passRatio: number;
  /** Draw this many questions from the pool (exams). */
  sample?: number;
}

/** Answer value per question type. */
export interface AnswerByType {
  single: string;
  multi: string[];
  truefalse: boolean;
  numeric: number;
  'chart-click': { price: number } | { candle: number };
  /** left text → chosen right text */
  match: Record<string, string>;
  /** items in the user's order */
  order: string[];
}

export type AnswerValue = AnswerByType[QuestionType];

export interface QuestionResult {
  id: string;
  correct: boolean;
  tags: string[];
}

export interface QuizResult {
  quizId: string;
  correct: number;
  total: number;
  /** correct / total */
  ratio: number;
  passed: boolean;
  perQuestion: QuestionResult[];
}

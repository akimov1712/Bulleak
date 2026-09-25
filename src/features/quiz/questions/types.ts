/** "answering" → learner edits; "correct"/"wrong" → locked, feedback shown. */
export type QuestionState = 'answering' | 'correct' | 'wrong';

export interface QuestionProps<Q, A> {
  question: Q;
  value: A | undefined;
  onChange: (value: A) => void;
  state: QuestionState;
}

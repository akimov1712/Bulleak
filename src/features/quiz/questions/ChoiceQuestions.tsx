import type { MultiQuestion, SingleQuestion, TrueFalseQuestion } from '@/types/quiz';
import { OptionCard, type OptionLook } from './OptionCard';
import { useDigitKeys } from './useDigitKeys';
import type { QuestionProps } from './types';

function lookFor(
  state: QuestionProps<unknown, unknown>['state'],
  chosen: boolean,
  isCorrect: boolean,
): OptionLook {
  if (state === 'answering') return chosen ? 'selected' : 'idle';
  if (isCorrect) return chosen ? 'correct' : 'missed';
  return chosen ? 'wrong' : 'idle';
}

export function SingleQuestionView({
  question,
  value,
  onChange,
  state,
}: QuestionProps<SingleQuestion, string>) {
  const answering = state === 'answering';
  useDigitKeys(question.options.length, answering, (i) => {
    const option = question.options[i];
    if (option) onChange(option.id);
  });
  return (
    <div role="radiogroup" aria-label="Варианты ответа" className="flex flex-col gap-3">
      {question.options.map((o, i) => (
        <OptionCard
          key={o.id}
          role="radio"
          checked={value === o.id}
          look={lookFor(state, value === o.id, o.id === question.correct)}
          shortcut={i < 9 ? i + 1 : undefined}
          disabled={!answering}
          onSelect={() => onChange(o.id)}
        >
          {o.text}
        </OptionCard>
      ))}
    </div>
  );
}

export function MultiQuestionView({
  question,
  value = [],
  onChange,
  state,
}: QuestionProps<MultiQuestion, string[]>) {
  const answering = state === 'answering';
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  useDigitKeys(question.options.length, answering, (i) => {
    const option = question.options[i];
    if (option) toggle(option.id);
  });
  return (
    <div role="group" aria-label="Варианты ответа" className="flex flex-col gap-3">
      {question.options.map((o, i) => (
        <OptionCard
          key={o.id}
          role="checkbox"
          checked={value.includes(o.id)}
          look={lookFor(state, value.includes(o.id), question.correct.includes(o.id))}
          shortcut={i < 9 ? i + 1 : undefined}
          disabled={!answering}
          onSelect={() => toggle(o.id)}
        >
          {o.text}
        </OptionCard>
      ))}
    </div>
  );
}

const TF_OPTIONS = [
  { value: true, label: 'Верно' },
  { value: false, label: 'Неверно' },
] as const;

export function TrueFalseQuestionView({
  question,
  value,
  onChange,
  state,
}: QuestionProps<TrueFalseQuestion, boolean>) {
  const answering = state === 'answering';
  useDigitKeys(2, answering, (i) => {
    const option = TF_OPTIONS[i];
    if (option) onChange(option.value);
  });
  return (
    <div role="radiogroup" aria-label="Верно или неверно" className="grid grid-cols-2 gap-3">
      {TF_OPTIONS.map((o, i) => (
        <OptionCard
          key={o.label}
          role="radio"
          checked={value === o.value}
          look={lookFor(state, value === o.value, o.value === question.correct)}
          shortcut={i + 1}
          disabled={!answering}
          onSelect={() => onChange(o.value)}
        >
          <span className="text-lg font-extrabold">{o.label}</span>
        </OptionCard>
      ))}
    </div>
  );
}

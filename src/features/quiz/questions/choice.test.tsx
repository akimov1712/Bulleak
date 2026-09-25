import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MultiQuestion, SingleQuestion, TrueFalseQuestion } from '@/types/quiz';
import { MultiQuestionView, SingleQuestionView, TrueFalseQuestionView } from './ChoiceQuestions';
import type { QuestionState } from './types';

const base = { id: 'q', prompt: '?', explanation: '', tags: [] };
const single: SingleQuestion = {
  ...base,
  type: 'single',
  options: [
    { id: 'a', text: 'Рыночный' },
    { id: 'b', text: 'Лимитный' },
    { id: 'c', text: 'Условный' },
  ],
  correct: 'b',
};
const multi: MultiQuestion = {
  ...base,
  type: 'multi',
  options: single.options,
  correct: ['a', 'c'],
};
const tf: TrueFalseQuestion = { ...base, type: 'truefalse', correct: false };

function Controlled<A>({
  render: renderView,
  state = 'answering',
}: {
  render: (value: A | undefined, onChange: (v: A) => void, state: QuestionState) => React.ReactNode;
  state?: QuestionState;
}) {
  const [value, setValue] = useState<A>();
  return (
    <>
      {renderView(value, setValue, state)}
      <output data-testid="value">{JSON.stringify(value ?? null)}</output>
    </>
  );
}

const valueOf = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null');

describe('SingleQuestionView', () => {
  it('selects by click and by digit keys', async () => {
    render(
      <Controlled<string>
        render={(v, on, s) => (
          <SingleQuestionView question={single} value={v} onChange={on} state={s} />
        )}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Рыночный/ }));
    expect(valueOf()).toBe('a');
    await userEvent.keyboard('3');
    expect(valueOf()).toBe('c');
    expect(screen.getByRole('radio', { name: /Условный/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('9');
    expect(valueOf()).toBe('c');
  });

  it('shows correct and wrong after checking and locks input', async () => {
    const onChange = (): void => {
      throw new Error('should be locked');
    };
    render(<SingleQuestionView question={single} value="a" onChange={onChange} state="wrong" />);
    expect(screen.getByRole('radio', { name: /Рыночный/ })).toHaveAccessibleName(/неверно/);
    expect(screen.getByRole('radio', { name: /Лимитный/ })).toHaveAccessibleName(
      /правильный вариант/,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Условный/ }));
    await userEvent.keyboard('2');
  });
});

describe('MultiQuestionView', () => {
  it('toggles options on and off', async () => {
    render(
      <Controlled<string[]>
        render={(v, on, s) => (
          <MultiQuestionView question={multi} value={v} onChange={on} state={s} />
        )}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Рыночный/ }));
    await userEvent.keyboard('3');
    expect(valueOf()).toEqual(['a', 'c']);
    await userEvent.keyboard('1');
    expect(valueOf()).toEqual(['c']);
  });

  it('marks missed correct options after a wrong answer', () => {
    render(<MultiQuestionView question={multi} value={['a']} onChange={() => {}} state="wrong" />);
    expect(screen.getByRole('checkbox', { name: /Рыночный/ })).toHaveAccessibleName(/верно/);
    expect(screen.getByRole('checkbox', { name: /Условный/ })).toHaveAccessibleName(
      /правильный вариант/,
    );
  });
});

describe('TrueFalseQuestionView', () => {
  it('answers with keys 1/2', async () => {
    render(
      <Controlled<boolean>
        render={(v, on, s) => (
          <TrueFalseQuestionView question={tf} value={v} onChange={on} state={s} />
        )}
      />,
    );
    await userEvent.keyboard('2');
    expect(valueOf()).toBe(false);
    await userEvent.click(screen.getByRole('radio', { name: /^Верно/ }));
    expect(valueOf()).toBe(true);
  });
});

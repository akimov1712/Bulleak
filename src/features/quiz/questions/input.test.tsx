import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MatchQuestion, NumericQuestion, OrderQuestion } from '@/types/quiz';
import { MatchQuestionView, NumericQuestionView, OrderQuestionView } from './InputQuestions';

const base = { id: 'q', prompt: '?', explanation: '', tags: [] };
const numeric: NumericQuestion = {
  ...base,
  type: 'numeric',
  correct: 0.01,
  tolerance: 0.0005,
  unit: 'BTC',
};
const match: MatchQuestion & { rights: string[] } = {
  ...base,
  type: 'match',
  pairs: [
    { left: 'PoW', right: 'Bitcoin' },
    { left: 'PoS', right: 'Ethereum' },
  ],
  rights: ['Ethereum', 'Bitcoin'],
};
const order: OrderQuestion & { shuffled: string[] } = {
  ...base,
  type: 'order',
  items: ['Теория', 'Тренажёр', 'Демо'],
  shuffled: ['Демо', 'Теория', 'Тренажёр'],
};

function Harness<A>({
  children,
}: {
  children: (v: A | undefined, on: (v: A) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState<A>();
  return (
    <>
      {children(value, setValue)}
      <output data-testid="v">{JSON.stringify(value ?? null)}</output>
    </>
  );
}
const valueOf = () => JSON.parse(screen.getByTestId('v').textContent ?? 'null');

describe('NumericQuestionView', () => {
  it('emits parsed numbers with comma decimals', async () => {
    render(
      <Harness<number | undefined>>
        {(v, on) => (
          <NumericQuestionView question={numeric} value={v} onChange={on} state="answering" />
        )}
      </Harness>,
    );
    await userEvent.type(screen.getByLabelText('Твой ответ (BTC)'), '0,01');
    expect(valueOf()).toBe(0.01);
  });

  it('clears the answer when the field is emptied', async () => {
    render(
      <Harness<number | undefined>>
        {(v, on) => (
          <NumericQuestionView question={numeric} value={v} onChange={on} state="answering" />
        )}
      </Harness>,
    );
    const input = screen.getByLabelText('Твой ответ (BTC)');
    await userEvent.type(input, '10');
    expect(valueOf()).toBe(10);
    await userEvent.clear(input);
    expect(valueOf()).toBeNull();
  });

  it('is disabled after checking', () => {
    render(
      <NumericQuestionView question={numeric} value={0.02} onChange={() => {}} state="wrong" />,
    );
    expect(screen.getByLabelText('Твой ответ (BTC)')).toBeDisabled();
  });
});

describe('MatchQuestionView', () => {
  it('builds the pairing via selects', async () => {
    render(
      <Harness<Record<string, string>>>
        {(v, on) => (
          <MatchQuestionView question={match} value={v} onChange={on} state="answering" />
        )}
      </Harness>,
    );
    await userEvent.selectOptions(screen.getByLabelText('PoW'), 'Bitcoin');
    await userEvent.selectOptions(screen.getByLabelText('PoS'), 'Ethereum');
    expect(valueOf()).toEqual({ PoW: 'Bitcoin', PoS: 'Ethereum' });
  });

  it('shows the right pair for mistakes', () => {
    render(
      <MatchQuestionView
        question={match}
        value={{ PoW: 'Ethereum', PoS: 'Ethereum' }}
        onChange={() => {}}
        state="wrong"
      />,
    );
    expect(screen.getByText('Правильно: Bitcoin')).toBeInTheDocument();
    expect(screen.queryByText('Правильно: Ethereum')).not.toBeInTheDocument();
  });
});

describe('OrderQuestionView', () => {
  it('starts from the shuffled order and moves items with buttons', async () => {
    render(
      <Harness<string[]>>
        {(v, on) => (
          <OrderQuestionView question={order} value={v} onChange={on} state="answering" />
        )}
      </Harness>,
    );
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Демо'),
      expect.stringContaining('Теория'),
      expect.stringContaining('Тренажёр'),
    ]);
    expect(screen.getByRole('button', { name: 'Поднять «Демо»' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Опустить «Демо»' }));
    await userEvent.click(screen.getByRole('button', { name: 'Опустить «Демо»' }));
    expect(valueOf()).toEqual(['Теория', 'Тренажёр', 'Демо']);
  });

  it('marks wrong positions after checking', () => {
    render(
      <OrderQuestionView
        question={order}
        value={order.shuffled}
        onChange={() => {}}
        state="wrong"
      />,
    );
    expect(screen.getByText('→ место 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Поднять/ })).not.toBeInTheDocument();
  });
});

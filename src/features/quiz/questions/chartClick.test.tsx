import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChartClickQuestion } from '@/types/quiz';
import type { CandleChartProps } from '@/features/charts/CandleChart';
import { ChartClickQuestionView } from './ChartClickQuestion';
import type { QuestionState } from './types';

const chartProps = vi.hoisted(() => ({ last: null as CandleChartProps | null }));

// The real chart needs canvas; the mock exposes its props and a fake click button.
vi.mock('@/features/charts/LazyCandleChart', () => ({
  LazyCandleChart: (props: CandleChartProps) => {
    chartProps.last = props;
    return (
      <button
        type="button"
        data-testid="chart"
        onClick={() => props.onPick?.({ index: 105, time: 0, price: 64321.987 })}
      />
    );
  },
}));

const base = {
  id: 'q',
  prompt: 'Где уровень?',
  explanation: '',
  tags: [],
  type: 'chart-click' as const,
  dataset: 'BTCUSDT-240',
  from: 100,
  to: 110,
};
const priceQ: ChartClickQuestion = { ...base, target: { kind: 'price', min: 64000, max: 64500 } };
const candleQ: ChartClickQuestion = { ...base, target: { kind: 'candle', indices: [104, 105] } };

function Harness({ q, state = 'answering' }: { q: ChartClickQuestion; state?: QuestionState }) {
  const [value, setValue] = useState<{ price: number } | { candle: number } | undefined>();
  return (
    <>
      <ChartClickQuestionView question={q} value={value} onChange={setValue} state={state} />
      <output data-testid="value">{JSON.stringify(value ?? null)}</output>
    </>
  );
}

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as unknown;

describe('ChartClickQuestionView', () => {
  it('shows the question range and places a rounded price level on click', async () => {
    render(<Harness q={priceQ} />);
    expect(chartProps.last).toMatchObject({
      dataset: 'BTCUSDT-240',
      from: { index: 100 },
      to: { index: 110 },
    });
    await userEvent.click(screen.getByTestId('chart'));
    expect(value()).toEqual({ price: 64320 });
    expect(chartProps.last?.annotations).toEqual([
      expect.objectContaining({ type: 'hline', price: 64320, label: 'Твой ответ', tone: 'info' }),
    ]);
    expect(screen.getByLabelText('Цена')).toHaveValue('64320');
  });

  it('accepts a typed price and clears the answer on empty input', () => {
    render(<Harness q={priceQ} />);
    const input = screen.getByLabelText('Цена');
    fireEvent.change(input, { target: { value: '64100,5' } });
    expect(value()).toEqual({ price: 64100.5 });
    fireEvent.change(input, { target: { value: '' } });
    expect(value()).toBeNull();
  });

  it('selects candles by click and by arrow buttons within the range', async () => {
    render(<Harness q={candleQ} />);
    expect(screen.getByText('Свеча не выбрана')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Следующая свеча' }));
    expect(value()).toEqual({ candle: 100 });
    await userEvent.click(screen.getByRole('button', { name: 'Предыдущая свеча' }));
    expect(value()).toEqual({ candle: 100 });
    await userEvent.click(screen.getByTestId('chart'));
    expect(value()).toEqual({ candle: 105 });
    expect(screen.getByText('Свеча 6 из 11')).toBeInTheDocument();
    expect(chartProps.last?.annotations).toEqual([
      expect.objectContaining({ type: 'marker', time: { index: 105 }, text: 'Твой выбор' }),
    ]);
  });

  it('starts from the last candle when stepping backwards first', async () => {
    render(<Harness q={candleQ} />);
    await userEvent.click(screen.getByRole('button', { name: 'Предыдущая свеча' }));
    expect(value()).toEqual({ candle: 110 });
  });

  it('after checking: locks input and highlights the right answer', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChartClickQuestionView
        question={priceQ}
        value={{ price: 70000 }}
        onChange={onChange}
        state="wrong"
      />,
    );
    expect(chartProps.last?.onPick).toBeUndefined();
    expect(screen.getByLabelText('Цена')).toBeDisabled();
    expect(chartProps.last?.annotations).toEqual([
      expect.objectContaining({ type: 'zone', top: 64500, bottom: 64000, tone: 'bull' }),
      expect.objectContaining({ type: 'hline', price: 70000, tone: 'bear' }),
    ]);
    rerender(
      <ChartClickQuestionView
        question={candleQ}
        value={{ candle: 105 }}
        onChange={onChange}
        state="correct"
      />,
    );
    expect(screen.getByRole('button', { name: 'Следующая свеча' })).toBeDisabled();
    expect(chartProps.last?.annotations).toEqual([
      expect.objectContaining({ type: 'marker', time: { index: 104 }, text: '✓' }),
      expect.objectContaining({ type: 'marker', time: { index: 105 }, text: '✓' }),
      expect.objectContaining({ type: 'marker', time: { index: 105 }, tone: 'bull' }),
    ]);
  });

  it('reports an unknown dataset', () => {
    render(<Harness q={{ ...priceQ, dataset: 'DOGE-1' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('DOGE-1');
  });
});

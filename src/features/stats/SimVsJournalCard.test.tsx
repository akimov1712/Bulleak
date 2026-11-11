import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { sourceMetrics } from '@/lib/stats/compare';
import { SimVsJournalCard } from './SimVsJournalCard';

const res = (rs: number[]) => rs.map((r) => ({ r, pnl: r * 10 }));

describe('SimVsJournalCard', () => {
  it('shows both columns and explains a discipline gap', () => {
    render(
      <SimVsJournalCard
        sim={sourceMetrics(res([2, -1, 1]), 95)}
        journal={sourceMetrics(res([-1, -1, 2]), 60)}
      />,
    );
    const card = screen.getByLabelText('Тренажёр и журнал');
    expect(card).toHaveTextContent('Дисциплина: 95 / 100');
    expect(card).toHaveTextContent('Дисциплина: 60 / 100');
    expect(screen.getByRole('status')).toHaveTextContent(
      'В тренажёре правила соблюдаются заметно чаще',
    );
  });

  it('hides when one side has no trades', () => {
    const { container } = render(
      <SimVsJournalCard sim={sourceMetrics(res([1, 2]), 90)} journal={sourceMetrics([], null)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

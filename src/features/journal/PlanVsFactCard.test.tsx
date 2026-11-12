import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { JournalTrade } from '@/types/trading';
import { PlanVsFactCard } from './PlanVsFactCard';

const trade = (exit: number | undefined): JournalTrade => ({
  openedAt: 1,
  closedAt: exit === undefined ? undefined : 2,
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  sl: 95,
  tp: 110,
  exit,
  qty: 1,
  leverage: 1,
  fees: 0,
  setup: '',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
});

describe('PlanVsFactCard', () => {
  it('is hidden without closed trades', () => {
    const { container } = render(<PlanVsFactCard trades={[trade(undefined)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows exits by plan, what early exits left and losses beyond the stop', () => {
    render(<PlanVsFactCard trades={[trade(110), trade(104), trade(92)]} />);
    expect(screen.getByRole('heading', { name: 'План и факт' })).toBeInTheDocument();
    expect(screen.getByText('33 % из 3')).toBeInTheDocument();
    expect(screen.getByText(/оставили до тейка 1,2R/)).toBeInTheDocument();
    expect(screen.getByText(/Убытки сверх стопа: 0,6R/)).toBeInTheDocument();
  });
});

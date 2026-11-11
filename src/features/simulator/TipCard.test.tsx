import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useProgress } from '@/store/progressStore';
import type { SimTrade } from '@/types/trading';
import { TipCard } from './TipCard';

const T0 = new Date(2026, 10, 11, 12).getTime();
const moved = (i: number): SimTrade => ({
  at: T0 + i * 3_600_000,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 0,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 1000,
  qty: 2,
  exitPrice: 90,
  exitIndex: 5,
  outcome: 'sl',
  pnl: -20,
  r: -2,
  fees: 0,
  actions: [{ index: 2, kind: 'move-sl', price: 90 }],
});

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
});

describe('TipCard', () => {
  it('shows a tip about own trades and hides it for a week', () => {
    render(
      <MemoryRouter>
        <TipCard trades={[moved(0), moved(1)]} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Совет')).toHaveTextContent(
      'отодвигал стоп от цены в 2 сделках из 2',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть совет на неделю' }));
    expect(screen.queryByLabelText('Совет')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('tc-tips-snoozed') ?? '{}')).toHaveProperty(
      'stop-moved',
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import type { SimTrade } from '@/types/trading';
import { SimHistory } from './SimHistory';

const trade = (extra: Partial<SimTrade>): SimTrade => ({
  at: Date.UTC(2026, 8, 26, 12),
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 500,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 10_000,
  qty: 20,
  exitPrice: 110,
  exitIndex: 510,
  outcome: 'tp',
  pnl: 197.7,
  r: 1.98,
  fees: 2.3,
  ...extra,
});

const renderHistory = () =>
  render(
    <MemoryRouter>
      <SimHistory />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await db.simTrades.clear();
});

describe('SimHistory', () => {
  it('shows an empty state with the mascot when there are no trades', async () => {
    renderHistory();
    expect(await screen.findByText('Сделок пока нет')).toBeInTheDocument();
  });

  it('lists trades with a summary and filters by kind', async () => {
    await simRepo.add(trade({}));
    await simRepo.add(
      trade({ at: Date.UTC(2026, 8, 26, 13), scenarioId: 'm03-sr-bounce', pnl: -105, r: -1.05 }),
    );
    await simRepo.add(trade({ strategyTag: 'tps', pnl: 300, r: 3 }));
    renderHistory();
    // Free trades by default; scenario and backtest trades never mix into its summary.
    expect(await screen.findByText('BTC 4H')).toBeInTheDocument();
    expect(screen.queryByText('Отскок от поддержки')).not.toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Сценарии' }));
    expect(screen.getByText('Отскок от поддержки')).toBeInTheDocument();
    expect(screen.queryByText('BTC 4H')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Бэктест' }));
    expect(screen.getByText('Бэктест · tps')).toBeInTheDocument();
  });
});

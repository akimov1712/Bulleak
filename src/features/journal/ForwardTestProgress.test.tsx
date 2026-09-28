import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { journalRepo } from '@/db/journalRepo';
import { simRepo } from '@/db/simRepo';
import { BacktestVsForward } from '@/features/stats/BacktestVsForward';
import type { JournalTrade } from '@/types/trading';
import { ForwardTestProgress } from './ForwardTestProgress';

const trade = (extra: Partial<JournalTrade>): JournalTrade => ({
  openedAt: Date.UTC(2026, 8, 1),
  closedAt: Date.UTC(2026, 8, 2),
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  exit: 120,
  sl: 90,
  qty: 1,
  leverage: 1,
  fees: 0,
  pnl: 20,
  r: 2,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
  ...extra,
});

beforeEach(async () => {
  await db.journal.clear();
  await db.simTrades.clear();
});

describe('ForwardTestProgress', () => {
  it('counts closed demo and testnet trades and the share made by the plan', async () => {
    await journalRepo.add(trade({}));
    await journalRepo.add(trade({ account: 'testnet', followedPlan: false }));
    await journalRepo.add(trade({ account: 'real' }));
    await journalRepo.add(
      trade({ closedAt: undefined, exit: undefined, pnl: undefined, r: undefined }),
    );
    render(
      <MemoryRouter>
        <ForwardTestProgress />
      </MemoryRouter>,
    );
    expect(await screen.findByText('2/30')).toBeInTheDocument();
    expect(
      screen.getByText(/По плану: 50\s?% сделок\. До выборки — 28 сделок/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Записать сделку' })).toHaveAttribute(
      'href',
      '/journal/new',
    );
  });
});

describe('BacktestVsForward', () => {
  it('shows both columns only when backtest and forward trades exist', async () => {
    const { container } = render(<BacktestVsForward />);
    await journalRepo.add(trade({ r: -1, pnl: -10 }));
    expect(container).toBeEmptyDOMElement();
    await simRepo.add({
      at: 1,
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
      pnl: 200,
      r: 2,
      fees: 0,
      strategyTag: 'tps',
    });
    const table = await screen.findByRole('table');
    const row = within(table).getByRole('row', { name: /Матожидание/ });
    expect(row).toHaveTextContent('+2');
    expect(row).toHaveTextContent('−1');
  });
});

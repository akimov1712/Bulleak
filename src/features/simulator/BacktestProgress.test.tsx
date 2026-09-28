import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import type { SimTrade } from '@/types/trading';
import { BacktestProgress } from './BacktestProgress';

const trade = (strategyTag?: string): SimTrade => ({
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
  ...(strategyTag ? { strategyTag } : {}),
});

const renderBlock = () =>
  render(
    <MemoryRouter>
      <BacktestProgress strategy="tps" />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await db.simTrades.clear();
});

describe('BacktestProgress', () => {
  it('counts only backtest trades of the strategy and links to backtest mode', async () => {
    await simRepo.add(trade('tps'));
    await simRepo.add(trade('tps'));
    await simRepo.add(trade());
    renderBlock();
    expect(await screen.findByText('2/30')).toBeInTheDocument();
    expect(screen.getByText(/До первых выводов — 28 сделок/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Продолжить бэктест' })).toHaveAttribute(
      'href',
      '/simulator?backtest=tps',
    );
  });

  it('starts from zero and rejects unknown strategies', async () => {
    renderBlock();
    expect(await screen.findByText('0/30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Начать бэктест' })).toBeInTheDocument();
    render(
      <MemoryRouter>
        <BacktestProgress strategy="nope" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('nope');
  });
});

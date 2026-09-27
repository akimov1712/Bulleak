import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { journalRepo } from '@/db/journalRepo';
import type { JournalTrade } from '@/types/trading';
import { JournalPage } from './JournalPage';

const H = 3_600_000;
const trade = (extra: Partial<JournalTrade>): JournalTrade => ({
  openedAt: Date.UTC(2026, 8, 1),
  closedAt: Date.UTC(2026, 8, 1) + 8 * H,
  account: 'testnet',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  exit: 120,
  sl: 90,
  qty: 10,
  leverage: 2,
  fees: 0,
  pnl: 200,
  r: 2,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
  ...extra,
});

/** Value of a KPI tile by its label. */
const tile = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

const renderPage = () =>
  render(
    <MemoryRouter>
      <JournalPage />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await db.journal.clear();
});

describe('JournalPage', () => {
  it('shows an empty state with a button to add a trade', async () => {
    renderPage();
    expect(await screen.findByText('Журнал пока пуст')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Новая сделка/ }).length).toBeGreaterThan(0);
  });

  it('shows KPIs, the list and breakdowns, and filters by account and result', async () => {
    await journalRepo.add(trade({}));
    await journalRepo.add(
      trade({
        openedAt: Date.UTC(2026, 8, 2),
        closedAt: Date.UTC(2026, 8, 2) + H,
        exit: 95,
        pnl: -50,
        r: -0.5,
        account: 'real',
        emotion: 'fomo',
        side: 'short',
        sl: 110,
      }),
    );
    await journalRepo.add(
      trade({
        openedAt: Date.UTC(2026, 8, 3),
        exit: undefined,
        pnl: undefined,
        r: undefined,
        closedAt: undefined,
      }),
    );
    renderPage();
    expect(await screen.findByText('Кривая капитала')).toBeInTheDocument();
    // 2 closed trades: 1 win of 2, PF 200 / 50 = 4
    expect(tile('Винрейт')).toBe('50%');
    expect(tile('Профит-фактор')).toBe('4');
    expect(tile('Сделок')).toBe('2');
    expect(screen.getByText('По эмоциям')).toBeInTheDocument();
    expect(screen.getAllByText('FOMO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('открыта').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Реальный' }));
    expect(tile('Винрейт')).toBe('0%');
    const accounts = screen.getByRole('radiogroup', { name: 'Счёт' });
    fireEvent.click(within(accounts).getByRole('radio', { name: 'Все' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Открытые' }));
    // Only the open trade is listed; it has no result, so the KPIs are empty.
    expect(screen.getAllByText('открыта').length).toBeGreaterThan(0);
    expect(screen.queryByText('Кривая капитала')).not.toBeInTheDocument();
  });
});

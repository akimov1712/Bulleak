import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { journalRepo } from '@/db/journalRepo';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { JournalEntryPage } from './JournalEntryPage';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/journal" element={<h1>Список журнала</h1>} />
        <Route path="/journal/:entryId" element={<JournalEntryPage />} />
      </Routes>
    </MemoryRouter>,
  );

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(async () => {
  await db.journal.clear();
  useProgress.setState(createInitialProgress(Date.now()));
});

describe('JournalEntryPage', () => {
  it('shows a field error for a stop on the wrong side and saves nothing', async () => {
    renderAt('/journal/new');
    await screen.findByRole('heading', { name: 'Новая сделка' });
    fill('Цена входа', '60000');
    fill('Стоп-лосс', '61000');
    fill('Объём (в монетах)', '0,01');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText(/Стоп должен быть по другую сторону/)).toBeInTheDocument();
    expect(await journalRepo.count()).toBe(0);
  });

  it('saves a closed trade with P&L and R and counts it once', async () => {
    renderAt('/journal/new');
    await screen.findByRole('heading', { name: 'Новая сделка' });
    fill('Цена входа', '60000');
    fill('Стоп-лосс', '59000');
    fill('Объём (в монетах)', '0,01');
    fill('Дата и время входа', '2026-09-20T10:00');
    fill('Цена выхода', '62000');
    fill('Дата и время выхода', '2026-09-21T10:00');
    expect(screen.getByText('+2R · $20,00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('heading', { name: 'Список журнала' })).toBeInTheDocument();
    const [saved] = await journalRepo.list();
    expect(saved).toMatchObject({ pnl: 20, r: 2, symbol: 'BTCUSDT' });
    expect(useProgress.getState().counters.journalEntries).toBe(1);
  });

  it('edits and deletes an existing trade after confirmation', async () => {
    const id = await journalRepo.add({
      openedAt: Date.UTC(2026, 8, 1),
      account: 'testnet',
      symbol: 'ETHUSDT',
      side: 'short',
      market: 'perp',
      entry: 3000,
      sl: 3100,
      qty: 1,
      leverage: 2,
      fees: 0,
      setup: 'breakout',
      timeframe: '1H',
      followedPlan: true,
      emotion: 'calm',
      notes: '',
      tags: [],
    });
    renderAt(`/journal/${id}`);
    expect(await screen.findByText('ETHUSDT · Short')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    const dialog = await screen.findByRole('dialog', { name: 'Удалить сделку?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await waitFor(async () => expect(await journalRepo.count()).toBe(0));
  });

  it('shows «not found» for an unknown id', async () => {
    renderAt('/journal/999');
    expect(await screen.findByText('Сделка не найдена')).toBeInTheDocument();
  });
});

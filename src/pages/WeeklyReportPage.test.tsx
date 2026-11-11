import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import { toDateKey } from '@/lib/date';
import { emptyDay } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';

beforeEach(async () => {
  localStorage.clear();
  useProgress.getState().reset();
  await db.simTrades.clear();
  await db.journal.clear();
});

describe('WeeklyReportPage', () => {
  it('sums the week and offers PDF and CSV', async () => {
    useProgress.setState({
      activity: { [toDateKey(Date.now())]: { ...emptyDay(), xp: 70, quizzes: 1 } },
    });
    await simRepo.add({
      at: Date.now() - 1000,
      scenarioId: null,
      dataset: 'BTCUSDT-240',
      startIndex: 1,
      side: 'long',
      entry: 100,
      sl: 95,
      tp: 110,
      riskPct: 2,
      balanceBefore: 1000,
      qty: 2,
      exitPrice: 110,
      exitIndex: 5,
      outcome: 'tp',
      pnl: 20,
      r: 2,
      fees: 0,
    });
    render(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/stats/week'] })} />,
    );
    const learning = await screen.findByLabelText('Учёба');
    expect(learning).toHaveTextContent('70 XP');
    expect(learning).toHaveTextContent('1 из 7');
    expect(screen.getByLabelText('Практика')).toHaveTextContent('Правила соблюдены50 / 100');
    expect(screen.getByRole('button', { name: 'Сохранить в PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Тренажёр · 1 сделка/ })).toBeInTheDocument();
  });
});

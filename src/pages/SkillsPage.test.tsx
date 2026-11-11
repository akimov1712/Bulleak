import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import { useProgress } from '@/store/progressStore';
import type { SimTrade } from '@/types/trading';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
}

const trade = (at: number): SimTrade => ({
  at,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 0,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 3,
  balanceBefore: 1000,
  qty: 6,
  exitPrice: 110,
  exitIndex: 5,
  outcome: 'tp',
  pnl: 60,
  r: 2,
  fees: 0,
});

beforeEach(async () => {
  localStorage.clear();
  useProgress.getState().reset();
  await db.simTrades.clear();
});

describe('SkillsPage', () => {
  it('invites to the first test while nothing is known', async () => {
    renderAt('/skills');
    expect(await screen.findByText('Навыки появятся после первого теста')).toBeInTheDocument();
  });

  it('shows knowledge per group and flags «knows, but breaks the rule»', async () => {
    const answers = Array.from({ length: 6 }, (_, i) => ({
      q: `q${i}`,
      ok: true,
      tags: ['risk-per-trade'],
      type: 'single' as const,
    }));
    useProgress.setState({
      quizAttempts: [
        { quizId: 'm09-l01', at: Date.now() - 1000, ratio: 1, passed: true, tags: {}, answers },
      ],
    });
    for (let i = 0; i < 5; i++) await simRepo.add(trade(Date.now() - 500 + i));

    renderAt('/skills');
    const group = (await screen.findByRole('heading', { name: 'Риск-менеджмент' })).closest('div');
    expect(group).not.toBeNull();
    const row = within(group as HTMLElement)
      .getByRole('heading', { name: 'Риск на сделку и лимиты' })
      .closest('li') as HTMLElement;
    expect(within(row).getByText('Знаю, но нарушаю')).toBeInTheDocument();
    expect(within(row).getByText('отлично')).toBeInTheDocument();
    expect(within(row).getByText('часто нарушается')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'В тренажёр' })).toBeInTheDocument();
    expect(screen.getByLabelText('Сводка')).toHaveTextContent('Знаю, но нарушаю1');
  });
});

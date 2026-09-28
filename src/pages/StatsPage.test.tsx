import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import { toDateKey } from '@/lib/date';
import { createInitialProgress, emptyDay } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { StatsPage } from './StatsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  );

beforeEach(async () => {
  useProgress.setState(createInitialProgress(Date.now()));
  await db.simTrades.clear();
  await db.journal.clear();
});

describe('StatsPage', () => {
  it('every tab has an empty state for a new learner', async () => {
    renderPage();
    expect(screen.getByText('Статистики пока нет')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Тренажёр' }));
    expect(await screen.findByText('Сделок в тренажёре пока нет')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Журнал' }));
    expect(await screen.findByText('Журнал пуст')).toBeInTheDocument();
  });

  it('simulator tab: backtest report checks the forward-test thresholds', async () => {
    const base = {
      scenarioId: null,
      dataset: 'BTCUSDT-240',
      startIndex: 500,
      side: 'long' as const,
      entry: 100,
      sl: 95,
      tp: 110,
      riskPct: 1,
      balanceBefore: 10_000,
      qty: 20,
      exitPrice: 110,
      exitIndex: 510,
      fees: 0,
      strategyTag: 'tps',
    };
    for (let i = 0; i < 5; i++) {
      await simRepo.add({ ...base, at: i, outcome: 'tp', pnl: 200, r: 2 });
    }
    await simRepo.add({ ...base, at: 9, outcome: 'sl', pnl: -100, r: -1 });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Тренажёр' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Бэктест' }));
    expect(
      await screen.findByRole('heading', { name: 'Отчёт бэктеста: Trend Pullback Swing (TPS)' }),
    ).toBeInTheDocument();
    const checks = screen.getByRole('list', { name: 'Пороги курса для форвард-теста' });
    expect(checks).toHaveTextContent('Сделок не меньше 30');
    expect(screen.getAllByLabelText('не выполнено')).toHaveLength(1);
    expect(screen.getByText(/Пороги пока не пройдены/)).toBeInTheDocument();
  });

  it('learning tab: KPIs, XP chart, weak topics with a lesson link', () => {
    const now = Date.now();
    useProgress.setState({
      xp: 120,
      activity: { [toDateKey(now)]: { ...emptyDay(), xp: 120 } },
      quizAttempts: [
        { quizId: 'm01-l01', at: now, ratio: 0.5, passed: false, tags: { altcoin: [1, 4] } },
      ],
    });
    renderPage();
    expect(screen.getByText('120 XP')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /XP за последние 30 дней, всего 120/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Стоит повторить')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /урок «/ }).length).toBeGreaterThan(0);
    expect(screen.getByText('Последние тесты')).toBeInTheDocument();
  });
});

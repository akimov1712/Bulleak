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
  it('simulator tab: R curve and breakdowns by instrument, timeframe and side', async () => {
    const t = (i: number, dataset: string, side: 'long' | 'short', r: number) => ({
      at: Date.UTC(2026, 10, 1 + i, 12),
      scenarioId: null,
      dataset,
      startIndex: 500,
      side,
      entry: 100,
      sl: 95,
      tp: 110,
      riskPct: 1,
      balanceBefore: 10_000,
      qty: 1,
      exitPrice: 110,
      exitIndex: 510,
      outcome: 'tp' as const,
      pnl: r * 100,
      r,
      fees: 0,
    });
    await simRepo.add(t(0, 'BTCUSDT-240', 'long', 2));
    await simRepo.add(t(1, 'BTCUSDT-60', 'short', -1));
    await simRepo.add(t(2, 'ETHUSDT-240', 'long', -1));
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Тренажёр' }));
    const curve = await screen.findByLabelText('Результат в R');
    expect(curve).toHaveTextContent('Убытков подряд2');
    const byTf = screen.getByRole('heading', { name: 'По таймфрейму' }).closest('div');
    expect(byTf).toHaveTextContent('4H2');
    expect(byTf).toHaveTextContent('1H1');
  });

  it('discipline tab: rules kept in simulator trades, index after five trades', async () => {
    const trade = (i: number, riskPct: number) => ({
      at: Date.UTC(2026, 10, 1 + i, 12),
      scenarioId: null,
      dataset: 'BTCUSDT-240',
      startIndex: 500,
      side: 'long' as const,
      entry: 100,
      sl: 95,
      tp: 110,
      riskPct,
      balanceBefore: 10_000,
      qty: 1,
      exitPrice: 110,
      exitIndex: 510,
      outcome: 'tp' as const,
      pnl: 10,
      r: 2,
      fees: 0,
    });
    for (let i = 0; i < 4; i++) await simRepo.add(trade(i, 1));
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Дисциплина' }));
    expect(await screen.findByText('мало данных')).toBeInTheDocument();

    await simRepo.add(trade(4, 2));
    // 10 checks (risk + R:R per trade), one broken → 90.
    expect(await screen.findByText('90 / 100')).toBeInTheDocument();
    expect(screen.getByText('нарушено 1 из 5')).toBeInTheDocument();
  });

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

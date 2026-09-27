import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
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

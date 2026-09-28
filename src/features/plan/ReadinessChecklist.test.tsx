import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { ReadinessChecklist } from './ReadinessChecklist';

beforeEach(async () => {
  useProgress.setState(createInitialProgress(Date.now()));
  await db.simTrades.clear();
  await db.journal.clear();
});

describe('ReadinessChecklist', () => {
  it('shows failed checks with details and «how to fix» links', async () => {
    useProgress.setState({
      exams: { m00: { best: 1, attempts: 1, passedAt: 1 } },
      strategy: { name: 'Моя TPS', rules: ['Правило'], updatedAt: 1 },
    });
    render(
      <MemoryRouter>
        <ReadinessChecklist />
      </MemoryRouter>,
    );
    expect(await screen.findByText('1/6')).toBeInTheDocument();
    expect(screen.getByText('Сдано 1 из 12.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('выполнено')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Как исправить: Продолжить бэктест' })).toHaveAttribute(
      'href',
      '/simulator?backtest=tps',
    );
    expect(screen.getByText(/Пока рано/)).toBeInTheDocument();
  });
});

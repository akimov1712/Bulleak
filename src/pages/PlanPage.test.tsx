import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TPS } from '@/content/strategies';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { PlanPage } from './PlanPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlanPage />
    </MemoryRouter>,
  );

beforeEach(() => useProgress.setState(createInitialProgress(Date.now())));

describe('PlanPage', () => {
  it('starts from the course template and saves the plan (plan-written)', async () => {
    renderPage();
    expect(screen.getByText(/Это шаблон курса/)).toBeInTheDocument();
    const goals = screen.getByLabelText('1. Цели и сроки');
    expect((goals as HTMLTextAreaElement).value).toContain('30 сделок на тестнете');
    fireEvent.change(goals, { target: { value: 'Соблюдать план' } });
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить план' }));
    const state = useProgress.getState();
    expect(state.tradingPlan?.sections.goals).toBe('Соблюдать план');
    expect(state.counters.planWritten).toBe(true);
    expect(screen.getByRole('button', { name: 'Сохранить план' })).toBeDisabled();
  });

  it('edits the strategy rules starting from TPS', async () => {
    renderPage();
    expect(screen.getAllByLabelText(/^Правило \d+$/)).toHaveLength(TPS.rules.length);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить правило 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Добавить правило' }));
    const inputs = screen.getAllByLabelText(/^Правило \d+$/);
    fireEvent.change(inputs.at(-1) as HTMLElement, { target: { value: 'Только BTC' } });
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить стратегию' }));
    const rules = useProgress.getState().strategy?.rules ?? [];
    expect(rules).toHaveLength(TPS.rules.length);
    expect(rules.at(-1)).toBe('Только BTC');
    expect(rules[0]).toBe(TPS.rules[1]);
  });
});

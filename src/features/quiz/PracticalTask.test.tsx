import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PracticalScenario } from '@/content/final-exam';
import { PracticalTask } from './PracticalTask';

vi.mock('@/features/charts/LazyCandleChart', () => ({
  LazyCandleChart: () => <div data-testid="chart" />,
}));
vi.mock('@/features/charts/useDataset', () => ({
  useDataset: () => ({
    candles: Array.from({ length: 200 }, (_, i) => ({ t: i, o: 100, h: 101, l: 99, c: 100, v: 1 })),
  }),
}));

const scenario: PracticalScenario = {
  id: 'p',
  title: 'Тестовая задача',
  dataset: 'BTCUSDT-60',
  startIndex: 150,
  task: 'Описание задачи',
  expected: 'long',
  debrief: 'Разбор',
};

describe('PracticalTask', () => {
  it('collects the decision, levels and risk with the market entry', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PracticalTask scenario={scenario} index={0} total={3} onSubmit={onSubmit} />);
    const submit = await screen.findByRole('button', { name: 'Ответить и дальше' });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Лонг' }));
    await user.type(screen.getByRole('textbox', { name: 'Стоп-лосс' }), '96');
    await user.type(screen.getByRole('textbox', { name: 'Тейк-профит' }), '108');
    expect(screen.getByText('R:R по твоим уровням: 1 : 2')).toBeInTheDocument();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      decision: 'long',
      entry: 100,
      sl: 96,
      tp: 108,
      riskPct: 1,
    });
  });

  it('a skip needs no levels', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PracticalTask scenario={scenario} index={2} total={3} onSubmit={onSubmit} />);
    await user.click(await screen.findByRole('radio', { name: 'Пропустить' }));
    await user.click(screen.getByRole('button', { name: 'Ответить и завершить' }));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ decision: 'skip' });
  });
});

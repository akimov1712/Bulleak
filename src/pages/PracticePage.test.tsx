import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultNormalizer, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { Candle } from '@/types/trading';
import { routes } from '@/app/routes';
import { generateDrill } from '@/lib/practice/drills';
import { mulberry32 } from '@/lib/random';
import { sanitizePractice, usePractice } from '@/store/practiceStore';

// The chart itself is covered elsewhere; here only what the learner chooses and sees.
vi.mock('@/features/charts/LazyCandleChart', () => ({
  LazyCandleChart: () => <div data-testid="chart" />,
}));
const candles: Candle[] = Array.from({ length: 400 }, (_, i) => ({
  t: i * 14_400_000,
  o: 100,
  h: 101,
  l: 99,
  c: 100,
  v: 1,
}));
vi.mock('@/features/charts/useDataset', () => ({
  useDataset: () => ({ candles }),
}));

const renderAt = (url: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />);

beforeEach(() => {
  localStorage.clear();
  usePractice.getState().reset();
});

describe('PracticePage', () => {
  it('checks a drill answer, shows the solution and counts the streak', async () => {
    renderAt('/practice?seed=42');
    const expected = generateDrill('size', mulberry32(42));
    expect(
      await screen.findByText(expected.prompt, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Ответ'), String(Math.round(expected.answer)));
    await userEvent.click(screen.getByRole('button', { name: 'Проверить' }));
    expect(screen.getByText('Верно')).toBeInTheDocument();
    expect(usePractice.getState().drills.size).toEqual({ done: 1, correct: 1, streak: 1, best: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Следующая задача' }));
    await userEvent.type(screen.getByLabelText('Ответ'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Проверить' }));
    expect(screen.getByText(/^Правильно:/)).toBeInTheDocument();
    expect(usePractice.getState().drills.size).toMatchObject({ done: 2, streak: 0, best: 1 });
  });

  it('records a forecast with its confidence and shows calibration', async () => {
    renderAt('/practice?seed=42&tab=forecast');
    await userEvent.click(await screen.findByRole('radio', { name: 'Останется в диапазоне' }));
    await userEvent.click(screen.getByRole('radio', { name: '80 %' }));
    await userEvent.click(screen.getByRole('button', { name: 'Показать, что было' }));
    // Flat prices: the close stays inside the band.
    expect(screen.getByText(/^Угадал/)).toBeInTheDocument();
    expect(usePractice.getState().forecasts).toMatchObject([
      { pick: 'range', outcome: 'range', confidence: 0.8 },
    ]);
    expect(screen.getByRole('heading', { name: 'Калибровка' })).toBeInTheDocument();
  });

  it('walks a situation and judges the choices by the plan', async () => {
    renderAt('/practice?tab=situations');
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Начать' }))[0] as HTMLElement,
    );
    await userEvent.click(screen.getByRole('button', { name: /Беру с риском 2 %/ }));
    expect(screen.getByText('Нарушение')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Закрываю терминал/ }));
    expect(screen.getByText('По плану')).toBeInTheDocument();
    expect(screen.getByText(/Решений по плану: 50 %/)).toBeInTheDocument();
  });
});

describe('sanitizePractice', () => {
  it('keeps valid stats and attempts, drops broken ones', () => {
    const s = sanitizePractice({
      drills: { size: { done: 3, correct: 2, streak: 1, best: 2 }, rr: { done: -1 } },
      forecasts: [
        { pick: 'up', outcome: 'down', confidence: 0.6, dataset: 'x', time: 1, at: 1 },
        { pick: 'sideways', outcome: 'down', confidence: 0.6 },
        { pick: 'up', outcome: 'up', confidence: 0.99 },
      ],
    });
    expect(s.drills.size).toEqual({ done: 3, correct: 2, streak: 1, best: 2 });
    expect(s.drills.rr).toEqual({ done: 0, correct: 0, streak: 0, best: 0 });
    expect(s.forecasts).toHaveLength(1);
    expect(sanitizePractice(null).forecasts).toEqual([]);
  });
});

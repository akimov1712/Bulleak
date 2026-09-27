import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CandleChartProps } from './CandleChart';
import { FibExplorer } from './FibExplorer';

const chart = vi.hoisted(() => ({ last: null as CandleChartProps | null }));

vi.mock('./LazyCandleChart', () => ({
  LazyCandleChart: (props: CandleChartProps) => {
    chart.last = props;
    return null;
  },
}));

// Candle 1: low 100, candle 2: high 200.
vi.mock('./useDataset', () => ({
  datasetPromise: () =>
    Promise.resolve({
      candles: [
        { t: 0, o: 1, h: 1, l: 1, c: 1, v: 1 },
        { t: 1, o: 110, h: 115, l: 100, c: 112, v: 1 },
        { t: 2, o: 190, h: 200, l: 185, c: 195, v: 1 },
      ],
    }),
}));

async function click(index: number, price: number) {
  await act(async () => {
    chart.last?.onPick?.({ index, time: 0, price });
    await Promise.resolve();
  });
}

describe('FibExplorer', () => {
  it('builds the grid from two snapped clicks and resets', async () => {
    render(<FibExplorer dataset="BTCUSDT-D" from={{ index: 0 }} to={{ index: 2 }} />);
    expect(screen.getByText(/Кликни на начало импульса/)).toBeInTheDocument();

    await click(1, 101); // snaps to the low 100
    expect(screen.getByText(/Теперь кликни на конец/)).toBeInTheDocument();
    await click(2, 198); // snaps to the high 200

    const levels = screen.getByRole('list', { name: 'Уровни' });
    expect(levels).toHaveTextContent('0.618 — 138,2');
    expect(levels).toHaveTextContent('0.5 — 150');
    expect(chart.last?.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'zone', label: 'золотой карман' }),
        expect.objectContaining({ type: 'hline', label: '0.382', dashed: true }),
      ]),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(screen.queryByRole('list', { name: 'Уровни' })).not.toBeInTheDocument();
  });
});

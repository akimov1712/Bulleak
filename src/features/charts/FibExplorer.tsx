import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatNumber } from '@/lib/format';
import type { DatasetName } from '@/lib/trading/candles';
import { fibRetracement, goldenPocket, snapToExtreme } from '@/lib/trading/fibonacci';
import type { Annotation, TimeInput } from './annotations';
import { LazyCandleChart } from './LazyCandleChart';
import { datasetPromise } from './useDataset';

export interface FibExplorerProps {
  dataset: DatasetName;
  from: TimeInput;
  to: TimeInput;
  caption?: string;
}

const ratioLabel = (r: number) =>
  r === 0 || r === 1 ? String(r) : r.toFixed(3).replace(/0+$/, '');

/**
 * Lesson block (m06-l02): click the start and the end of an impulse — the retracement grid and
 * the golden pocket are drawn on the chart. Clicks snap to the nearer extreme of the candle.
 */
export function FibExplorer({ dataset, from, to, caption }: FibExplorerProps) {
  const [points, setPoints] = useState<number[]>([]);

  const pick = ({ index, price }: { index: number; price: number }) => {
    void datasetPromise(dataset).then((ds) => {
      const candle = ds.candles[index];
      const snapped = candle ? snapToExtreme(candle, price) : price;
      setPoints((prev) => (prev.length >= 2 ? [snapped] : [...prev, snapped]));
    });
  };

  const [start, end] = points;
  const levels = start !== undefined && end !== undefined ? fibRetracement(start, end) : [];
  const pocket = start !== undefined && end !== undefined ? goldenPocket(start, end) : null;
  const decimals = (start ?? 0) >= 1000 ? 0 : 2;

  const annotations: Annotation[] = [
    ...points.map((price, i): Annotation => ({
      type: 'hline',
      price,
      label: i === 0 ? 'начало' : 'конец',
      tone: 'muted',
    })),
    ...(pocket
      ? [
          {
            type: 'zone',
            top: pocket.top,
            bottom: pocket.bottom,
            label: 'золотой карман',
            tone: 'warn',
          } satisfies Annotation,
        ]
      : []),
    ...levels
      .filter((l) => l.ratio !== 0 && l.ratio !== 1)
      .map((l): Annotation => ({
        type: 'hline',
        price: l.price,
        label: ratioLabel(l.ratio),
        tone: l.ratio === 0.5 || l.ratio === 0.618 ? 'warn' : 'info',
        dashed: true,
      })),
  ];

  const hint =
    points.length === 0
      ? 'Кликни на начало импульса — свинг-лоу для роста.'
      : points.length === 1
        ? 'Теперь кликни на конец импульса — свинг-хай.'
        : 'Сетка построена. Кликни снова, чтобы начать заново.';

  return (
    <figure className="my-6 flex flex-col gap-3" aria-label="Построй сетку Фибоначчи">
      <p className="font-bold text-text" aria-live="polite">
        {hint}
      </p>
      <LazyCandleChart
        dataset={dataset}
        from={from}
        to={to}
        annotations={annotations}
        onPick={pick}
        className="[&_canvas]:cursor-crosshair"
      />
      {levels.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4" aria-label="Уровни">
          {levels.map((l) => (
            <li
              key={l.ratio}
              className={l.ratio === 0.5 || l.ratio === 0.618 ? 'font-extrabold text-warn' : ''}
            >
              {ratioLabel(l.ratio)} — {formatNumber(l.price, decimals)}
            </li>
          ))}
        </ul>
      )}
      {points.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
          onClick={() => setPoints([])}
          className="self-start"
        >
          Сбросить
        </Button>
      )}
      {caption && (
        <figcaption className="text-center text-sm text-text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}

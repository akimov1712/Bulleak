import { useMemo, useState, type ReactNode } from 'react';
import { mulberry32 } from '@/lib/random';
import { datasetInterval, type DatasetName } from '@/lib/trading/candles';
import { pickStart } from '@/lib/trading/simSession';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDataset } from '../charts/useDataset';
import { SimChart, type LevelId, type SimIndicators, type SimLevel } from './SimChart';
import { SimToolbar } from './SimToolbar';

export interface SimSessionProps {
  dataset: DatasetName;
  seed: number;
  indicators: SimIndicators;
  onToggleIndicator: (key: keyof SimIndicators) => void;
  /** Right / bottom panel for the current decision. */
  panel?: (ctx: SimPanelContext) => ReactNode;
}

export interface SimPanelContext {
  cursor: number;
  price: number;
}

/** One blind-trading session on a dataset from a seeded random start. */
export function SimSession(props: SimSessionProps) {
  const { candles } = useDataset(props.dataset);
  const start = useMemo(
    () => pickStart(candles.length, mulberry32(props.seed)),
    [candles, props.seed],
  );
  const wide = useMediaQuery('(min-width: 1024px)');
  const [lines, setLines] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);

  if (start === null) {
    return <p role="alert">В этом наборе данных слишком мало свечей для тренажёра.</p>;
  }
  const cursor = start;
  const price = candles[cursor]?.c ?? 0;

  const levels: SimLevel[] = lines.map((p, i) => ({
    id: `line-${i}` as LevelId,
    price: p,
    tone: 'muted',
    label: '',
    dashed: true,
  }));

  return (
    <div className="flex flex-col gap-3">
      <SimToolbar
        indicators={props.indicators}
        onToggleIndicator={props.onToggleIndicator}
        drawing={drawing}
        onDrawing={setDrawing}
        lineCount={lines.length}
        onClearLines={() => setLines([])}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SimChart
          candles={candles}
          anchor={start}
          cursor={cursor}
          intraday={datasetInterval(props.dataset) !== 'D'}
          indicators={props.indicators}
          levels={levels}
          onPriceClick={
            drawing
              ? (p) => {
                  setLines((prev) => [...prev, p]);
                  setDrawing(false);
                }
              : undefined
          }
          height={wide ? 480 : 340}
        />
        {props.panel?.({ cursor, price })}
      </div>
    </div>
  );
}

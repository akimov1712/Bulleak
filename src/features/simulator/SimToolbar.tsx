import { Eraser, PenLine } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SimIndicators } from './SimChart';

const INDICATOR_LABEL: Record<keyof SimIndicators, string> = {
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  ema200: 'EMA 200',
  rsi: 'RSI',
  volume: 'Объём',
};

const chip = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors disabled:opacity-50',
    active ? 'border-info bg-info/15 text-info' : 'border-border bg-surface hover:border-info',
  );

export interface SimToolbarProps {
  indicators: SimIndicators;
  onToggleIndicator: (key: keyof SimIndicators) => void;
  drawing: boolean;
  onDrawing: (on: boolean) => void;
  lineCount: number;
  onClearLines: () => void;
}

/** Indicator switches and the horizontal-level drawing tool. */
export function SimToolbar(props: SimToolbarProps) {
  const { indicators } = props;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div role="group" aria-label="Индикаторы" className="flex flex-wrap gap-1.5">
        {(Object.keys(INDICATOR_LABEL) as (keyof SimIndicators)[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={indicators[key]}
            onClick={() => props.onToggleIndicator(key)}
            className={chip(indicators[key])}
          >
            {INDICATOR_LABEL[key]}
          </button>
        ))}
      </div>
      <span className="mx-1 h-6 w-0.5 bg-border" aria-hidden="true" />
      <button
        type="button"
        aria-pressed={props.drawing}
        onClick={() => props.onDrawing(!props.drawing)}
        className={chip(props.drawing)}
      >
        <PenLine className="size-4" aria-hidden="true" />
        {props.drawing ? 'Кликни на график' : 'Уровень'}
      </button>
      <button
        type="button"
        disabled={props.lineCount === 0}
        onClick={props.onClearLines}
        className={chip(false)}
      >
        <Eraser className="size-4" aria-hidden="true" />
        Стереть линии
      </button>
    </div>
  );
}

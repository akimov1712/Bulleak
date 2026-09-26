import { useId, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AnswerByType, ChartClickQuestion } from '@/types/quiz';
import type { ChartPick } from '@/features/charts/CandleChart';
import { LazyCandleChart } from '@/features/charts/LazyCandleChart';
import type { Annotation } from '@/features/charts/annotations';
import { NumberInput } from '@/components/ui/NumberInput';
import { IconButton } from '@/components/ui/IconButton';
import { isDatasetName } from '@/lib/trading/candles';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { QuestionProps } from './types';

type Answer = AnswerByType['chart-click'];

const priceOf = (a: Answer | undefined) => (a && 'price' in a ? a.price : null);
const candleOf = (a: Answer | undefined) => (a && 'candle' in a ? a.candle : null);

/**
 * Click the chart to place a marker (a price level or a candle, depending on the
 * target); clicking again moves it. Keyboard / screen-reader alternative: type the
 * price, or step between candles with the arrow buttons.
 */
export function ChartClickQuestionView({
  question: q,
  value,
  onChange,
  state,
}: QuestionProps<ChartClickQuestion, Answer | undefined>) {
  const inputId = useId();
  const answering = state === 'answering';
  const byPrice = q.target.kind === 'price';
  const price = priceOf(value);
  const candle = candleOf(value);

  const annotations = useMemo<Annotation[]>(() => {
    const list: Annotation[] = [];
    const tone = state === 'answering' ? 'info' : state === 'correct' ? 'bull' : 'bear';
    if (state !== 'answering') {
      if (q.target.kind === 'price') {
        list.push({
          type: 'zone',
          top: q.target.max,
          bottom: q.target.min,
          label: 'Правильная зона',
          tone: 'bull',
        });
      } else {
        for (const index of q.target.indices) {
          list.push({
            type: 'marker',
            time: { index },
            position: 'below',
            text: '✓',
            tone: 'bull',
          });
        }
      }
    }
    if (price !== null) list.push({ type: 'hline', price, label: 'Твой ответ', tone });
    if (candle !== null) {
      list.push({
        type: 'marker',
        time: { index: candle },
        position: 'above',
        shape: 'arrowDown',
        text: 'Твой выбор',
        tone,
      });
    }
    return list;
  }, [q.target, state, price, candle]);

  if (!isDatasetName(q.dataset)) {
    return <p role="alert">Неизвестный набор данных: {q.dataset}</p>;
  }

  const pick = (p: ChartPick) => {
    if (!answering) return;
    onChange(byPrice ? { price: roundPrice(p.price) } : { candle: p.index });
  };
  const stepCandle = (delta: number) => {
    const current = candle ?? (delta > 0 ? q.from - 1 : q.to + 1);
    onChange({ candle: Math.min(q.to, Math.max(q.from, current + delta)) });
  };

  return (
    <div className="flex flex-col gap-3">
      <LazyCandleChart
        dataset={q.dataset}
        from={{ index: q.from }}
        to={{ index: q.to }}
        annotations={annotations}
        height={300}
        onPick={answering ? pick : undefined}
        className={cn(answering && '[&_canvas]:cursor-crosshair')}
      />
      {byPrice ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="text-sm font-bold text-text-muted">
            Цена
          </label>
          <NumberInput
            id={inputId}
            value={price}
            // Empty text clears the answer, so a stale price is never submitted.
            onValueChange={(v) => onChange(v === null ? undefined : { price: v })}
            disabled={!answering}
            className="max-w-[12rem]"
            placeholder="кликни или введи"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <IconButton
            variant="surface"
            label="Предыдущая свеча"
            icon={<ChevronLeft className="size-5" />}
            onClick={() => stepCandle(-1)}
            disabled={!answering}
          />
          <span
            className="min-w-40 text-center text-sm font-bold text-text-muted"
            aria-live="polite"
          >
            {candle === null
              ? 'Свеча не выбрана'
              : `Свеча ${candle - q.from + 1} из ${q.to - q.from + 1}`}
          </span>
          <IconButton
            variant="surface"
            label="Следующая свеча"
            icon={<ChevronRight className="size-5" />}
            onClick={() => stepCandle(1)}
            disabled={!answering}
          />
        </div>
      )}
      {answering && (
        <p className="text-xs text-text-muted">
          {byPrice
            ? 'Кликни по графику на нужной цене — появится линия. Кликни ещё раз, чтобы переставить.'
            : 'Кликни по нужной свече или выбери её стрелками.'}
          {price !== null && ` Сейчас: ${formatNumber(price, 2)}.`}
        </p>
      )}
    </div>
  );
}

/** Clicks land on arbitrary sub-pixel prices; keep 4 significant digits after rounding. */
function roundPrice(price: number): number {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(price) || 1)) - 3);
  return Math.round(price / magnitude) * magnitude;
}

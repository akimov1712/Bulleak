import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react';
import type { MatchQuestion, NumericQuestion, OrderQuestion } from '@/types/quiz';
import { cn } from '@/lib/cn';
import { NumberInput } from '@/components/ui/NumberInput';
import { IconButton } from '@/components/ui/IconButton';
import { inputClass } from '@/components/ui/styles';
import type { QuestionProps } from './types';

const feedbackBorder = {
  answering: '',
  correct: '[&_input]:border-bull [&_input]:bg-bull-soft',
  wrong: '[&_input]:border-bear [&_input]:bg-bear-soft',
} as const;

export function NumericQuestionView({
  question,
  value,
  onChange,
  state,
}: QuestionProps<NumericQuestion, number>) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-2', feedbackBorder[state])}>
      <label htmlFor={id} className="text-sm font-bold text-text-muted">
        Твой ответ{question.unit ? ` (${question.unit})` : ''}
      </label>
      <NumberInput
        id={id}
        value={value ?? null}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
        unit={question.unit}
        disabled={state !== 'answering'}
        className="max-w-xs text-lg"
        placeholder="0"
      />
      <p className="text-xs text-text-muted">Дробную часть можно писать через запятую или точку.</p>
    </div>
  );
}

type MatchPrepared = MatchQuestion & { rights?: string[] };

export function MatchQuestionView({
  question,
  value = {},
  onChange,
  state,
}: QuestionProps<MatchPrepared, Record<string, string>>) {
  const baseId = useId();
  const rights = question.rights ?? question.pairs.map((p) => p.right);
  const answering = state === 'answering';
  return (
    <ul className="flex flex-col gap-3">
      {question.pairs.map((pair, i) => {
        const chosen = value[pair.left];
        const ok = chosen === pair.right;
        const selectId = `${baseId}-${i}`;
        return (
          <li
            key={pair.left}
            className={cn(
              'grid gap-2 rounded-2xl border-2 p-3 sm:grid-cols-[1fr_1.2fr] sm:items-center',
              answering
                ? 'border-border'
                : ok
                  ? 'border-bull bg-bull-soft'
                  : 'border-bear bg-bear-soft',
            )}
          >
            <label htmlFor={selectId} className="flex items-center gap-2 font-extrabold">
              {!answering &&
                (ok ? (
                  <Check className="size-5 text-bull" strokeWidth={3} aria-label="верно" />
                ) : (
                  <X className="size-5 text-bear" strokeWidth={3} aria-label="неверно" />
                ))}
              {pair.left}
            </label>
            <div>
              <select
                id={selectId}
                value={chosen ?? ''}
                disabled={!answering}
                onChange={(e) => onChange({ ...value, [pair.left]: e.target.value })}
                className={cn(inputClass, 'cursor-pointer')}
              >
                <option value="" disabled>
                  Выбери пару…
                </option>
                {rights.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {!answering && !ok && (
                <p className="mt-1 text-sm font-bold text-bull">Правильно: {pair.right}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type OrderPrepared = OrderQuestion & { shuffled?: string[] };

function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function OrderQuestionView({
  question,
  value,
  onChange,
  state,
}: QuestionProps<OrderPrepared, string[]>) {
  const items = value ?? question.shuffled ?? question.items;
  const answering = state === 'answering';
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  return (
    <ol className="flex flex-col gap-2" aria-label="Порядок элементов">
      {items.map((item, i) => {
        const correctIndex = question.items.indexOf(item);
        const ok = correctIndex === i;
        return (
          <li
            key={item}
            draggable={answering}
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => {
              if (answering && dragFrom !== null) e.preventDefault();
            }}
            onDrop={() => {
              if (dragFrom !== null && dragFrom !== i) onChange(move(items, dragFrom, i));
              setDragFrom(null);
            }}
            onDragEnd={() => setDragFrom(null)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-2.5 font-semibold',
              answering && 'cursor-grab active:cursor-grabbing',
              dragFrom === i && 'opacity-50',
              answering
                ? 'border-border'
                : ok
                  ? 'border-bull bg-bull-soft'
                  : 'border-bear bg-bear-soft',
            )}
          >
            {answering && (
              <GripVertical className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
            )}
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-sm font-extrabold">
              {i + 1}
            </span>
            <span className="flex-1">{item}</span>
            {!answering && !ok && (
              <span className="text-sm font-bold text-bull">→ место {correctIndex + 1}</span>
            )}
            {answering && (
              <span className="flex shrink-0 gap-1">
                <IconButton
                  label={`Поднять «${item}»`}
                  icon={<ArrowUp className="size-4" />}
                  size="sm"
                  variant="surface"
                  disabled={i === 0}
                  onClick={() => onChange(move(items, i, i - 1))}
                />
                <IconButton
                  label={`Опустить «${item}»`}
                  icon={<ArrowDown className="size-4" />}
                  size="sm"
                  variant="surface"
                  disabled={i === items.length - 1}
                  onClick={() => onChange(move(items, i, i + 1))}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

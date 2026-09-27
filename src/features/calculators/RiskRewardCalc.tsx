import { Target } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { formatNumber, formatPct } from '@/lib/format';
import { breakevenWinrate, riskReward } from '@/lib/trading/rr';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  side: 'long' | 'short';
  entry: number | null;
  stop: number | null;
  take: number | null;
}

const DEFAULTS: Inputs = { side: 'long', entry: 60_000, stop: 59_000, take: 63_000 };
const isInputs = isShape<Inputs>({
  side: ['long', 'short'],
  entry: 'number',
  stop: 'number',
  take: 'number',
});

/** Risk / reward of a planned trade and the win rate it needs to break even. */
export function RiskRewardCalc() {
  const { inputs, set, reset } = useCalculator('rr', DEFAULTS, isInputs);
  const { side, entry, stop, take } = inputs;
  const result =
    entry !== null && stop !== null && take !== null ? riskReward(side, entry, stop, take) : null;
  const breakeven = result ? breakevenWinrate(result.rr) : null;

  return (
    <CalculatorCard
      icon={Target}
      title="Риск / прибыль"
      onReset={reset}
      emptyHint={
        side === 'long'
          ? 'Для лонга стоп ниже входа, тейк выше.'
          : 'Для шорта стоп выше входа, тейк ниже.'
      }
      result={
        result &&
        entry !== null && (
          <>
            <ResultValue
              label="Соотношение риск : прибыль"
              value={`1 : ${formatNumber(result.rr, 2)}`}
              sub={`Чтобы выйти в ноль, нужно выигрывать ${formatPct(breakeven, 1)} сделок`}
            />
            <ResultRows
              rows={[
                ['До стопа', `${formatNumber((result.risk / entry) * 100, 2)}%`],
                ['До тейка', `${formatNumber((result.reward / entry) * 100, 2)}%`],
              ]}
            />
            <p
              className={cn(
                'mt-3 rounded-2xl border-2 p-3 text-sm',
                result.rr < 1 ? 'border-warn bg-warn-soft' : 'border-border bg-surface-2',
              )}
            >
              {result.rr < 1
                ? 'Прибыль меньше риска: такой сделке нужен винрейт выше 50%. Обычно так не входят.'
                : result.rr < 2
                  ? 'Приемлемо, но стратегия курса требует не меньше 1 : 2.'
                  : 'Хорошее соотношение: даже с винрейтом ниже 50% стратегия может быть в плюсе.'}
            </p>
          </>
        )
      }
      howTo={
        <>
          <p>
            <b>R:R = |тейк − вход| ÷ |вход − стоп|.</b> Риск одной сделки — это 1R; при 1 : 3
            прибыльная сделка приносит 3R.
          </p>
          <p>
            <b>Безубыточный винрейт = 1 ÷ (1 + R:R).</b> При 1 : 3 достаточно выигрывать 25% сделок,
            чтобы не терять (без учёта комиссий).
          </p>
        </>
      }
    >
      <Segmented
        label="Направление"
        value={side}
        options={[
          { value: 'long', label: 'Лонг' },
          { value: 'short', label: 'Шорт' },
        ]}
        onChange={(v) => set({ side: v })}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Вход" value={entry} onChange={(v) => set({ entry: v })} min={0} />
        <NumberField label="Стоп-лосс" value={stop} onChange={(v) => set({ stop: v })} min={0} />
        <NumberField label="Тейк-профит" value={take} onChange={(v) => set({ take: v })} min={0} />
      </div>
    </CalculatorCard>
  );
}

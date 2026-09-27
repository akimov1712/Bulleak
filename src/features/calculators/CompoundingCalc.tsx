import { AlertTriangle, TrendingUp } from 'lucide-react';
import { compound, realism, type RealismLevel } from '@/lib/trading/compounding';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CalculatorCard, NumberField, ResultValue } from './CalculatorCard';
import { EquityCurves } from './EquityCurves';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  deposit: number | null;
  monthlyPct: number | null;
  months: number | null;
}

const DEFAULTS: Inputs = { deposit: 1000, monthlyPct: 10, months: 36 };
const PRESETS = [2, 10, 30];
const isInputs = isShape<Inputs>({ deposit: 'number', monthlyPct: 'number', months: 'number' });

const VERDICT: Record<RealismLevel, { title: string; text: string; tone: string }> = {
  realistic: {
    title: 'Реалистично для опытного трейдера',
    text: 'Даже такой результат требует проверенной стратегии и дисциплины, и месяцы в минусе всё равно будут.',
    tone: 'border-bull bg-bull-soft text-text',
  },
  ambitious: {
    title: 'Очень амбициозно',
    text: 'Стабильно держать такой процент годами удаётся единицам. Для плана на первый год — слишком оптимистично.',
    tone: 'border-warn bg-warn-soft text-text',
  },
  unrealistic: {
    title: 'Нереалистично',
    text: 'Такой процент каждый месяц не держит никто. Погоня за ним приводит к большому плечу, огромному риску и обнулению счёта.',
    tone: 'border-bear bg-bear-soft text-text',
  },
};

/** Compound-interest calculator with a realism warning. */
export function CompoundingCalc() {
  const { inputs, set, reset } = useCalculator('compounding', DEFAULTS, isInputs);
  const result =
    inputs.deposit !== null && inputs.monthlyPct !== null && inputs.months !== null
      ? compound(inputs.deposit, inputs.monthlyPct, inputs.months)
      : null;
  const level = inputs.monthlyPct === null ? null : realism(inputs.monthlyPct);

  return (
    <CalculatorCard
      icon={TrendingUp}
      title="Сложный процент"
      onReset={reset}
      emptyHint="Введи депозит больше 0, доход в месяц больше −100% и целое число месяцев (1–600)."
      result={
        result && (
          <div className="flex flex-col gap-3">
            <ResultValue
              label={`Через ${inputs.months} мес. на счёте`}
              value={formatUsd(result.final, result.final >= 1e5 ? 0 : 2)}
              sub={`рост ${formatNumber(result.totalPct, 0)}% · это ${formatNumber(result.yearlyPct, 0)}% годовых`}
            />
            <EquityCurves curves={[result.balances]} label="Рост депозита по месяцам" height={96} />
            {level && (
              <div
                className={cn('flex gap-3 rounded-2xl border-2 p-3 text-sm', VERDICT[level].tone)}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-extrabold">{VERDICT[level].title}</p>
                  <p>{VERDICT[level].text}</p>
                </div>
              </div>
            )}
          </div>
        )
      }
      howTo={
        <p>
          <b>Итог = депозит × (1 + доход в месяц)ᴹ.</b> Проценты начисляются на уже выросший счёт —
          поэтому 2% в месяц дают не 24%, а около 27% за год.
        </p>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Депозит"
          value={inputs.deposit}
          onChange={(deposit) => set({ deposit })}
          unit="$"
          min={1}
        />
        <NumberField
          label="Доход в месяц"
          value={inputs.monthlyPct}
          onChange={(monthlyPct) => set({ monthlyPct })}
          unit="%"
        />
        <NumberField
          label="Месяцев"
          value={inputs.months}
          onChange={(months) => set({ months })}
          min={1}
          max={600}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-text-muted">Попробуй:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set({ monthlyPct: p })}
            aria-pressed={inputs.monthlyPct === p}
            className={cn(
              'rounded-full border-2 px-3 py-1 font-bold transition-colors',
              inputs.monthlyPct === p
                ? 'border-primary-shade bg-primary text-on-primary'
                : 'border-border bg-surface hover:border-primary-shade',
            )}
          >
            {p}% в месяц
          </button>
        ))}
      </div>
    </CalculatorCard>
  );
}

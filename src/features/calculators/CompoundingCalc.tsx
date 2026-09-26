import { useId } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { compound, realism, type RealismLevel } from '@/lib/trading/compounding';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useStoredState } from '@/hooks/useStoredState';

interface Inputs {
  deposit: number | null;
  monthlyPct: number | null;
  months: number | null;
}

const DEFAULTS: Inputs = { deposit: 1000, monthlyPct: 10, months: 36 };
const PRESETS = [2, 10, 30];

const isInputs = (v: unknown): v is Inputs =>
  typeof v === 'object' &&
  v !== null &&
  ['deposit', 'monthlyPct', 'months'].every((k) => {
    const x = (v as Record<string, unknown>)[k];
    return x === null || typeof x === 'number';
  });

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
export function CompoundingCalc({ storageKey = 'tc-calc:compounding' }: { storageKey?: string }) {
  const id = useId();
  const [inputs, setInputs] = useStoredState<Inputs>(storageKey, DEFAULTS, isInputs);
  const result =
    inputs.deposit !== null && inputs.monthlyPct !== null && inputs.months !== null
      ? compound(inputs.deposit, inputs.monthlyPct, inputs.months)
      : null;
  const level = inputs.monthlyPct === null ? null : realism(inputs.monthlyPct);
  const set = (patch: Partial<Inputs>) => setInputs({ ...inputs, ...patch });

  return (
    <Card className="flex flex-col gap-4" aria-labelledby={`${id}-title`} role="group">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-5 text-primary-shade" aria-hidden="true" />
        <h3 id={`${id}-title`} className="text-lg font-extrabold">
          Сложный процент
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-deposit`} className="text-sm font-bold text-text-muted">
            Депозит
          </label>
          <NumberInput
            id={`${id}-deposit`}
            value={inputs.deposit}
            onValueChange={(deposit) => set({ deposit })}
            unit="$"
            min={1}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-rate`} className="text-sm font-bold text-text-muted">
            Доход в месяц
          </label>
          <NumberInput
            id={`${id}-rate`}
            value={inputs.monthlyPct}
            onValueChange={(monthlyPct) => set({ monthlyPct })}
            unit="%"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-months`} className="text-sm font-bold text-text-muted">
            Месяцев
          </label>
          <NumberInput
            id={`${id}-months`}
            value={inputs.months}
            onValueChange={(months) => set({ months })}
            min={1}
            max={600}
          />
        </div>
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

      {result ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div>
            <p className="text-sm font-bold text-text-muted">Через {inputs.months} мес. на счёте</p>
            <p className="text-3xl font-extrabold break-all tabular-nums">
              {formatUsd(result.final, result.final >= 1e5 ? 0 : 2)}
            </p>
            <p className="text-sm text-text-muted">
              рост {formatNumber(result.totalPct, 0)}% · это {formatNumber(result.yearlyPct, 0)}%
              годовых
            </p>
          </div>
          <Sparkline values={result.balances} />
        </div>
      ) : (
        <p className="text-text-muted" aria-live="polite">
          — Введи депозит больше 0, доход в месяц больше −100% и целое число месяцев (1–600).
        </p>
      )}

      {level && result && (
        <div className={cn('flex gap-3 rounded-2xl border-2 p-3 text-sm', VERDICT[level].tone)}>
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-extrabold">{VERDICT[level].title}</p>
            <p>{VERDICT[level].text}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setInputs(DEFAULTS)}
        className="self-start text-sm font-bold text-info underline"
      >
        Сбросить
      </button>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 90;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / span) * (h - 6) - 3}`,
    )
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-24 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        className={(values.at(-1) ?? 0) >= (values[0] ?? 0) ? 'stroke-bull' : 'stroke-bear'}
      />
    </svg>
  );
}

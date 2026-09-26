import { useId } from 'react';
import { Receipt } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { BYBIT_BASE_FEES, roundTripFees, type FeeRole } from '@/lib/trading/fees';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useStoredState } from '@/hooks/useStoredState';

type Market = keyof typeof BYBIT_BASE_FEES;

interface Inputs {
  market: Market;
  notional: number | null;
  risk: number | null;
  entry: FeeRole;
  exit: FeeRole;
}

const DEFAULTS: Inputs = {
  market: 'perpetual',
  notional: 5000,
  risk: 50,
  entry: 'taker',
  exit: 'taker',
};

const isInputs = (v: unknown): v is Inputs => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  const num = (x: unknown) => x === null || typeof x === 'number';
  const role = (x: unknown) => x === 'maker' || x === 'taker';
  return (
    (r.market === 'spot' || r.market === 'perpetual') &&
    num(r.notional) &&
    num(r.risk) &&
    role(r.entry) &&
    role(r.exit)
  );
};

const MARKET_LABEL: Record<Market, string> = { spot: 'Спот', perpetual: 'Бессрочные' };
const ROLE_LABEL: Record<FeeRole, string> = { maker: 'Мейкер (лимит)', taker: 'Тейкер (рынок)' };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold text-text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors',
              value === o.value
                ? 'border-primary-shade bg-primary text-on-primary'
                : 'border-border bg-surface hover:border-primary-shade',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Fee calculator: entry + exit fees on the notional and their share of the planned risk. */
export function FeesCalc({ storageKey = 'tc-calc:fees' }: { storageKey?: string }) {
  const id = useId();
  const [inputs, setInputs] = useStoredState<Inputs>(storageKey, DEFAULTS, isInputs);
  const set = (patch: Partial<Inputs>) => setInputs({ ...inputs, ...patch });
  const schedule = BYBIT_BASE_FEES[inputs.market];
  const result =
    inputs.notional === null
      ? null
      : roundTripFees(
          inputs.notional,
          schedule,
          inputs.entry,
          inputs.exit,
          inputs.risk ?? undefined,
        );
  const roles = (['maker', 'taker'] as const).map((r) => ({
    value: r,
    label: `${ROLE_LABEL[r]} ${formatNumber(schedule[r], 3)}%`,
  }));

  return (
    <Card className="flex flex-col gap-4" role="group" aria-labelledby={`${id}-title`}>
      <div className="flex items-center gap-2">
        <Receipt className="size-5 text-primary-shade" aria-hidden="true" />
        <h3 id={`${id}-title`} className="text-lg font-extrabold">
          Комиссии сделки
        </h3>
      </div>

      <Segmented
        label="Рынок"
        value={inputs.market}
        options={(Object.keys(MARKET_LABEL) as Market[]).map((m) => ({
          value: m,
          label: MARKET_LABEL[m],
        }))}
        onChange={(market) => set({ market })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-notional`} className="text-sm font-bold text-text-muted">
            Размер позиции (номинал)
          </label>
          <NumberInput
            id={`${id}-notional`}
            value={inputs.notional}
            onValueChange={(notional) => set({ notional })}
            unit="$"
            min={0}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-risk`} className="text-sm font-bold text-text-muted">
            Риск сделки до стопа (необязательно)
          </label>
          <NumberInput
            id={`${id}-risk`}
            value={inputs.risk}
            onValueChange={(risk) => set({ risk })}
            unit="$"
            min={0}
          />
        </div>
      </div>

      <Segmented
        label="Вход"
        value={inputs.entry}
        options={roles}
        onChange={(entry) => set({ entry })}
      />
      <Segmented
        label="Выход"
        value={inputs.exit}
        options={roles}
        onChange={(exit) => set({ exit })}
      />

      {result ? (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="text-sm font-bold text-text-muted">Комиссия за вход и выход</p>
          <p className="text-3xl font-extrabold tabular-nums">{formatUsd(result.total)}</p>
          <p className="text-sm text-text-muted">
            вход {formatUsd(result.entry)} · выход {formatUsd(result.exit)}
          </p>
          {result.shareOfRiskPct !== null && (
            <p
              className={cn(
                'mt-2 rounded-2xl border-2 p-3 text-sm',
                result.shareOfRiskPct > 20
                  ? 'border-warn bg-warn-soft'
                  : 'border-border bg-surface-2',
              )}
            >
              Комиссии съедают <b>{formatNumber(result.shareOfRiskPct, 1)}%</b> от запланированного
              риска.
              {result.shareOfRiskPct > 20 &&
                ' Это много: стоп слишком близко или позиция слишком большая для такого риска.'}
            </p>
          )}
        </div>
      ) : (
        <p className="text-text-muted" aria-live="polite">
          — Введи размер позиции больше 0.
        </p>
      )}

      <p className="text-xs text-text-muted">
        Базовые ставки Bybit на сентябрь 2026 года (без VIP-скидок). Ставки твоего аккаунта — на
        странице комиссий Bybit.
      </p>
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

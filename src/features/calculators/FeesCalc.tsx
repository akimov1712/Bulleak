import { Receipt } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { BYBIT_BASE_FEES, fundingFee, roundTripFees, type FeeRole } from '@/lib/trading/fees';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

type Market = keyof typeof BYBIT_BASE_FEES;

interface Inputs {
  market: Market;
  notional: number | null;
  risk: number | null;
  entry: FeeRole;
  exit: FeeRole;
  /** Funding rate per 8 h, % (perpetual only). */
  fundingPct: number | null;
  fundingPeriods: number | null;
}

const DEFAULTS: Inputs = {
  market: 'perpetual',
  notional: 5000,
  risk: 50,
  entry: 'taker',
  exit: 'taker',
  fundingPct: 0.01,
  fundingPeriods: 0,
};

const ROLES = ['maker', 'taker'] as const;
const isInputs = isShape<Inputs>({
  market: ['spot', 'perpetual'],
  notional: 'number',
  risk: 'number',
  entry: ROLES,
  exit: ROLES,
  fundingPct: 'number',
  fundingPeriods: 'number',
});

const MARKET_LABEL: Record<Market, string> = { spot: 'Спот', perpetual: 'Бессрочные' };
const ROLE_LABEL: Record<FeeRole, string> = { maker: 'Мейкер (лимит)', taker: 'Тейкер (рынок)' };

/** Fee calculator: entry + exit fees (+ funding) and their share of the planned risk. */
export function FeesCalc() {
  const { inputs, set, reset } = useCalculator('fees', DEFAULTS, isInputs);
  const perpetual = inputs.market === 'perpetual';
  const schedule = BYBIT_BASE_FEES[inputs.market];
  const fees =
    inputs.notional === null
      ? null
      : roundTripFees(inputs.notional, schedule, inputs.entry, inputs.exit);
  const funding =
    perpetual && inputs.notional !== null && inputs.fundingPct !== null && inputs.fundingPeriods
      ? fundingFee(inputs.notional, inputs.fundingPct, inputs.fundingPeriods)
      : 0;
  const total = fees && funding !== null ? fees.total + funding : null;
  const riskShare =
    total !== null && inputs.risk !== null && inputs.risk > 0 ? (total / inputs.risk) * 100 : null;
  const roles = ROLES.map((r) => ({
    value: r,
    label: `${ROLE_LABEL[r]} ${formatNumber(schedule[r], 3)}%`,
  }));

  return (
    <CalculatorCard
      icon={Receipt}
      title="Комиссии сделки"
      onReset={reset}
      emptyHint="Введи размер позиции больше 0 и целое число периодов funding."
      result={
        fees &&
        total !== null && (
          <>
            <ResultValue
              label={funding ? 'Комиссии и funding за сделку' : 'Комиссия за вход и выход'}
              value={formatUsd(total)}
              sub={`вход ${formatUsd(fees.entry)} · выход ${formatUsd(fees.exit)}`}
            />
            {funding !== null && funding !== 0 && (
              <ResultRows
                rows={[
                  [
                    `Funding за ${formatNumber(inputs.fundingPeriods, 0)} периодов`,
                    funding < 0 ? `получишь ${formatUsd(-funding)}` : formatUsd(funding),
                  ],
                ]}
              />
            )}
            {riskShare !== null && (
              <p
                className={cn(
                  'mt-3 rounded-2xl border-2 p-3 text-sm',
                  riskShare > 20 ? 'border-warn bg-warn-soft' : 'border-border bg-surface-2',
                )}
              >
                Комиссии съедают <b>{formatNumber(riskShare, 1)}%</b> от запланированного риска.
                {riskShare > 20 &&
                  ' Это много: стоп слишком близко или позиция слишком большая для такого риска.'}
              </p>
            )}
          </>
        )
      }
      howTo={
        <>
          <p>
            <b>Комиссия = стоимость позиции × ставка</b> — отдельно за вход и за выход. Считается от
            всей позиции, а не от маржи: плечо комиссию не уменьшает.
          </p>
          <p>
            <b>Funding = стоимость × ставка × число периодов</b> (у BTCUSDT период — 8 часов). При
            положительной ставке платят лонги, при отрицательной — шорты.
          </p>
        </>
      }
      note="Базовые ставки Bybit на сентябрь 2026 года (без VIP-скидок). Ставки твоего аккаунта — на странице комиссий Bybit."
    >
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
        <NumberField
          label="Размер позиции (номинал)"
          value={inputs.notional}
          onChange={(notional) => set({ notional })}
          unit="$"
          min={0}
        />
        <NumberField
          label="Риск сделки до стопа (необязательно)"
          value={inputs.risk}
          onChange={(risk) => set({ risk })}
          unit="$"
          min={0}
        />
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
      {perpetual && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Ставка funding (за 8 ч)"
            value={inputs.fundingPct}
            onChange={(fundingPct) => set({ fundingPct })}
            unit="%"
          />
          <NumberField
            label="Периодов funding в сделке"
            value={inputs.fundingPeriods}
            onChange={(fundingPeriods) => set({ fundingPeriods })}
            min={0}
          />
        </div>
      )}
    </CalculatorCard>
  );
}

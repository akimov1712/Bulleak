import { useId, type ReactNode } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { decimalsForStep, formatNumber, formatUsd } from '@/lib/format';
import type { Side } from '@/lib/trading/pnl';
import {
  LEVERAGE_OPTIONS,
  RISK_OPTIONS,
  type PlanError,
  type PlanWarning,
  type TradePlan,
} from '@/lib/trading/simPlan';
import { SIM_SKIP } from '@/lib/trading/simSession';

export interface OrderDraft {
  side: Side | null;
  sl: number | null;
  tp: number | null;
  riskPct: number;
  leverage: number;
}

export interface OrderPanelProps {
  draft: OrderDraft;
  onDraft: (patch: Partial<OrderDraft>) => void;
  onSide: (side: Side) => void;
  plan: TradePlan | null;
  entry: number;
  coin: string;
  tick: number;
  qtyStep: number;
  onOpen: () => void;
  onSkip: () => void;
}

const errorText = (error: PlanError, side: Side | null): string => {
  const below = side === 'short' ? 'выше' : 'ниже';
  const above = side === 'short' ? 'ниже' : 'выше';
  switch (error) {
    case 'levels':
      return 'Укажи стоп и тейк.';
    case 'sl-side':
      return `Стоп должен быть ${below} цены входа.`;
    case 'tp-side':
      return `Тейк должен быть ${above} цены входа.`;
    case 'qty':
      return 'Объём меньше минимального шага биржи: стоп слишком далеко для такого риска.';
    case 'margin':
      return 'Не хватает баланса на маржу: подними плечо или отодвинь стоп.';
    case 'price':
      return 'Проверь цены: они должны быть больше нуля.';
  }
};

const WARNING_TEXT: Record<PlanWarning, string> = {
  'liq-before-stop': 'Ликвидация наступит раньше стопа — уменьши плечо.',
  'rr-below-1': 'Прибыль меньше риска (R:R < 1): такой сделке нужен очень высокий винрейт.',
};

/** Order ticket of the simulator: side, levels, risk and a live calculation. */
export function OrderPanel(props: OrderPanelProps) {
  const id = useId();
  const { draft, plan, tick } = props;
  const priceDecimals = decimalsForStep(tick);
  const fmtPrice = (v: number | null) =>
    formatNumber(v, priceDecimals, { minDecimals: priceDecimals });
  const qtyDecimals = decimalsForStep(props.qtyStep);

  return (
    <Card className="flex flex-col gap-4" aria-label="Панель сделки">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Направление">
        {(['long', 'short'] as const).map((side) => {
          const active = draft.side === side;
          const Icon = side === 'long' ? ArrowUpRight : ArrowDownRight;
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => props.onSide(side)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 font-extrabold transition-colors',
                side === 'long'
                  ? active
                    ? 'border-bull bg-bull text-white'
                    : 'border-bull/40 text-bull hover:border-bull'
                  : active
                    ? 'border-bear bg-bear text-white'
                    : 'border-bear/40 text-bear hover:border-bear',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {side === 'long' ? 'Long' : 'Short'}
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-text-muted">Вход по рынку</span>
        <span className="text-xl font-extrabold tabular-nums">{fmtPrice(props.entry)}</span>
      </div>

      {draft.side && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1" htmlFor={`${id}-sl`}>
              <span className="text-sm font-bold text-bear">Stop Loss</span>
              <NumberInput
                id={`${id}-sl`}
                value={draft.sl}
                onValueChange={(sl) => props.onDraft({ sl })}
                min={0}
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={`${id}-tp`}>
              <span className="text-sm font-bold text-bull">Take Profit</span>
              <NumberInput
                id={`${id}-tp`}
                value={draft.tp}
                onValueChange={(tp) => props.onDraft({ tp })}
                min={0}
              />
            </label>
          </div>
          <p className="-mt-2 text-xs text-text-muted">
            Линии стопа и тейка можно перетаскивать прямо на графике.
          </p>
        </>
      )}

      <Segmented
        label="Риск на сделку"
        value={String(draft.riskPct)}
        options={RISK_OPTIONS.map((r) => ({ value: String(r), label: `${formatNumber(r, 1)}%` }))}
        onChange={(v) => props.onDraft({ riskPct: Number(v) })}
      />
      <Segmented
        label="Плечо"
        value={String(draft.leverage)}
        options={LEVERAGE_OPTIONS.map((l) => ({ value: String(l), label: `${l}×` }))}
        onChange={(v) => props.onDraft({ leverage: Number(v) })}
      />

      {draft.side && plan && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm" aria-live="polite">
          <Row label="Объём">
            {formatNumber(plan.qty, qtyDecimals)} {props.coin} · {formatUsd(plan.notional, 0)}
          </Row>
          <Row label="Маржа">{formatUsd(plan.margin)}</Row>
          <Row label="Риск" tone="bear">
            {formatUsd(plan.riskUsd)}
          </Row>
          <Row label="Прибыль" tone="bull">
            {formatUsd(plan.rewardUsd)}
          </Row>
          <Row label="R:R">{plan.rr === null ? '—' : `1 : ${formatNumber(plan.rr, 2)}`}</Row>
          <Row label="Комиссии ≈">{formatUsd(plan.fees)}</Row>
          {draft.leverage > 1 && <Row label="Ликвидация ≈">{fmtPrice(plan.liquidation)}</Row>}
        </dl>
      )}

      {draft.side && plan?.error && (
        <p role="alert" className="rounded-xl bg-bear/10 p-2.5 text-sm font-bold text-bear">
          {errorText(plan.error, draft.side)}
        </p>
      )}
      {draft.side &&
        plan?.warnings.map((w) => (
          <p key={w} className="flex gap-2 rounded-xl bg-warn-soft p-2.5 text-sm font-bold">
            <AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />
            {WARNING_TEXT[w]}
          </p>
        ))}

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          fullWidth
          disabled={!draft.side || !plan || plan.error !== null}
          onClick={props.onOpen}
        >
          Открыть сделку
        </Button>
        <Button
          variant="secondary"
          fullWidth
          leftIcon={<FastForward className="size-5" aria-hidden="true" />}
          onClick={props.onSkip}
        >
          Пропустить ({SIM_SKIP} свечей)
        </Button>
      </div>
    </Card>
  );
}

function Row({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: 'bull' | 'bear';
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd
        className={cn(
          'text-right font-bold tabular-nums',
          tone === 'bull' && 'text-bull',
          tone === 'bear' && 'text-bear',
        )}
      >
        {children}
      </dd>
    </>
  );
}

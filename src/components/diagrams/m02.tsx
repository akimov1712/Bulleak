import { useState } from 'react';
import { isTriggered, moveTo, startWalk, type RestingOrder } from '@/lib/trading/orderTriggers';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Arrow, Box, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

/** Funding account ↔ Unified Trading account. */
export function BybitAccounts() {
  return (
    <DiagramSvg
      width={360}
      height={280}
      title="Два основных счёта Bybit: Funding (Финансирование) — пополнение, вывод, P2P; Unified Trading (Единый торговый) — спот и деривативы. Между ними — внутренний перевод"
    >
      {({ arrow }) => (
        <>
          <Txt x={60} y={20} textAnchor="middle" size={13} tone="muted">
            внешний мир
          </Txt>
          <Arrow x1={40} y1={30} x2={40} y2={70} arrow={arrow} tone="bull" />
          <Arrow x1={80} y1={70} x2={80} y2={30} arrow={arrow} tone="bear" />
          <Txt x={92} y={55} size={13} tone="muted">
            пополнение и вывод
          </Txt>
          <Box x={4} y={76} w={166} h={140} tone="info" soft />
          <Txt x={16} y={100} bold tone="info">
            Funding
          </Txt>
          <Txt x={16} y={118} size={13} tone="muted">
            (Финансирование)
          </Txt>
          <foreignObject x={16} y={126} width={148} height={86}>
            <div className="text-[13px] leading-snug font-semibold text-text">
              пополнение и вывод, P2P, покупка крипты за карту
            </div>
          </foreignObject>
          <Box x={190} y={76} w={166} h={140} tone="bull" soft />
          <Txt x={202} y={100} bold tone="bull">
            Unified Trading
          </Txt>
          <Txt x={202} y={118} size={13} tone="muted">
            (Единый торговый)
          </Txt>
          <foreignObject x={202} y={126} width={148} height={86}>
            <div className="text-[13px] leading-snug font-semibold text-text">
              торговля: спот, фьючерсы, маржа
            </div>
          </foreignObject>
          <Arrow x1={170} y1={140} x2={190} y2={140} arrow={arrow} tone="epic" both />
          <Txt x={180} y={242} textAnchor="middle" size={14} bold tone="epic">
            Перевод (Transfer) между счетами
          </Txt>
          <Txt x={180} y={262} textAnchor="middle" size={13} tone="muted">
            внутри аккаунта, без комиссии сети
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

/** Deposit/withdrawal networks must match on both sides. */
export function NetworkMatch() {
  const side = (x: number, title: string, network: string, tone: DiagramTone) => (
    <g>
      <Box x={x} y={0} w={130} h={64} tone={tone} soft />
      <Txt x={x + 65} y={24} textAnchor="middle" size={13} tone="muted">
        {title}
      </Txt>
      <Txt x={x + 65} y={48} textAnchor="middle" bold tone={tone}>
        {network}
      </Txt>
    </g>
  );
  return (
    <DiagramSvg
      width={360}
      height={290}
      title="Перевод крипты: сеть отправителя и получателя должна совпадать. USDT в сети TRON на адрес в сети TRON — дойдёт; в разных сетях — средства могут потеряться"
    >
      {({ arrow }) => (
        <>
          <g transform="translate(0 30)">
            {side(4, 'вывод с биржи', 'USDT · TRC20', 'bull')}
            {side(226, 'кошелёк / биржа', 'USDT · TRC20', 'bull')}
            <Arrow x1={138} y1={32} x2={222} y2={32} arrow={arrow} tone="bull" />
            <Txt x={180} y={24} textAnchor="middle" size={20} bold tone="bull">
              ✓
            </Txt>
          </g>
          <Txt x={180} y={18} textAnchor="middle" size={13} bold tone="bull">
            Сети совпадают — перевод дойдёт
          </Txt>
          <g transform="translate(0 150)">
            {side(4, 'вывод с биржи', 'USDT · ERC20', 'bear')}
            {side(226, 'кошелёк / биржа', 'USDT · TRC20', 'bear')}
            <Arrow x1={138} y1={32} x2={222} y2={32} arrow={arrow} tone="bear" dashed />
            <Txt x={180} y={24} textAnchor="middle" size={20} bold tone="bear">
              ✗
            </Txt>
          </g>
          <Txt x={180} y={138} textAnchor="middle" size={13} bold tone="bear">
            Разные сети — монеты могут потеряться
          </Txt>
          <foreignObject x={8} y={226} width={344} height={60}>
            <div className="text-center text-[13px] leading-snug font-semibold text-text-muted">
              Сначала выбери сеть на стороне получателя, потом ту же — при выводе. Если у адреса
              есть memo / tag, укажи и его.
            </div>
          </foreignObject>
        </>
      )}
    </DiagramSvg>
  );
}

const MIN = 62_000;
const MAX = 67_800;
const START = 65_000;

const ORDERS: (RestingOrder & { label: string; note: string; tone: DiagramTone })[] = [
  {
    id: 'tp',
    kind: 'limit-sell',
    price: 67_200,
    label: 'Лимит на продажу',
    note: 'продать дороже (тейк-профит)',
    tone: 'bull',
  },
  {
    id: 'breakout',
    kind: 'stop-buy',
    price: 66_200,
    label: 'Условная покупка',
    note: 'купить на пробое вверх',
    tone: 'info',
  },
  {
    id: 'dip',
    kind: 'limit-buy',
    price: 63_700,
    label: 'Лимит на покупку',
    note: 'купить дешевле текущей',
    tone: 'epic',
  },
  {
    id: 'sl',
    kind: 'stop-sell',
    price: 62_600,
    label: 'Стоп-лосс',
    note: 'продать, если цена падает',
    tone: 'bear',
  },
];

/**
 * Interactive price scale: move the price and see which resting orders fire.
 * An order fires once the price touches its level, even if it moves back later.
 */
export function OrderTypes() {
  const [walk, setWalk] = useState(() => startWalk(START));
  const top = 16;
  const bottom = 300;
  const y = (price: number) => top + ((MAX - price) / (MAX - MIN)) * (bottom - top);
  const fired = ORDERS.filter((o) => isTriggered(o, walk.low, walk.high));
  return (
    <DiagramSvg
      width={360}
      height={316}
      title="Шкала цены с ордерами: лимит на покупку ниже цены, лимит на продажу выше, условная покупка на пробое вверх, стоп-лосс ниже. Двигай цену и смотри, какие ордера сработают"
      footer={
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-3 font-bold text-text-muted">
            Цена
            <input
              type="range"
              min={MIN + 200}
              max={MAX - 200}
              step={50}
              value={walk.current}
              onChange={(e) => setWalk((w) => moveTo(w, Number(e.target.value)))}
              className="h-11 flex-1 accent-[var(--xp-shade)]"
            />
            <span className="w-20 text-right text-text tabular-nums">
              {formatNumber(walk.current, 0)}
            </span>
          </label>
          <div className="flex items-start justify-between gap-3">
            <p className="text-text-muted" aria-live="polite">
              {fired.length === 0
                ? 'Пока ничего не сработало. Сдвинь цену к уровням.'
                : `Сработали: ${fired.map((o) => o.label.toLowerCase()).join(', ')}.`}
            </p>
            <button
              type="button"
              onClick={() => setWalk(startWalk(START))}
              className="shrink-0 rounded-full border-2 border-border px-3 py-1 font-bold text-text hover:border-text-muted"
            >
              Сброс
            </button>
          </div>
        </div>
      }
    >
      <rect
        x={8}
        y={y(walk.high)}
        width={10}
        height={Math.max(2, y(walk.low) - y(walk.high))}
        rx={5}
        className="fill-xp"
        opacity={0.5}
      />
      <line x1={13} x2={13} y1={top} y2={bottom} strokeWidth={2} className="stroke-border" />
      {ORDERS.map((o) => {
        const on = fired.includes(o);
        const oy = y(o.price);
        return (
          <g key={o.id} opacity={on ? 1 : 0.85}>
            <line
              x1={20}
              x2={352}
              y1={oy}
              y2={oy}
              strokeWidth={on ? 3 : 2}
              strokeDasharray={on ? undefined : '6 4'}
              className={cn(
                o.tone === 'bull' && 'stroke-bull',
                o.tone === 'bear' && 'stroke-bear',
                o.tone === 'info' && 'stroke-info',
                o.tone === 'epic' && 'stroke-epic',
              )}
            />
            <Txt x={24} y={oy - 8} bold size={14} tone={o.tone}>
              {on ? '✓ ' : ''}
              {o.label} · {formatNumber(o.price, 0)}
            </Txt>
            <Txt x={24} y={oy + 18} size={13} tone="muted">
              {o.note}
            </Txt>
          </g>
        );
      })}
      <g>
        <line
          x1={20}
          x2={352}
          y1={y(walk.current)}
          y2={y(walk.current)}
          strokeWidth={2}
          className="stroke-text"
        />
        <rect
          x={262}
          y={y(walk.current) - 12}
          width={90}
          height={24}
          rx={8}
          className="fill-text"
        />
        <Txt x={307} y={y(walk.current) + 5} textAnchor="middle" size={13} bold className="fill-bg">
          {formatNumber(walk.current, 0)}
        </Txt>
      </g>
    </DiagramSvg>
  );
}

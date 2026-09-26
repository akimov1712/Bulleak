import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { HotspotBadge, Mockup, type Hotspot } from './Mockup';

const HOTSPOTS: Hotspot[] = [
  {
    n: 1,
    title: 'Пара и статистика за 24 часа',
    text: 'Выбор пары (например, BTCUSDT) и переключение Спот / Деривативы. Рядом — последняя цена, изменение, максимум, минимум и оборот за 24 часа.',
  },
  {
    n: 2,
    title: 'График',
    text: 'Свечи, выбор таймфрейма (1H, 4H, 1D…), индикаторы и инструменты рисования — как в TradingView. Здесь мы будем проводить почти весь анализ.',
  },
  {
    n: 3,
    title: 'Стакан',
    text: 'Заявки на продажу сверху, на покупку снизу, между ними — последняя цена. Показывает глубину рынка прямо сейчас.',
  },
  {
    n: 4,
    title: 'Лента сделок',
    text: 'Последние сделки всех участников по этой паре: время, цена, объём. Зелёные — покупки по рынку, красные — продажи.',
  },
  {
    n: 5,
    title: 'Форма ордера',
    text: 'Покупка / продажа, тип ордера (лимитный, рыночный, условный), цена, количество, тейк-профит и стоп-лосс. Подробно — в уроке 5.',
  },
  {
    n: 6,
    title: 'Позиции, ордера и история',
    text: 'Вкладки внизу: открытые позиции с P&L, активные ордера (их можно изменить или отменить), история ордеров и сделок.',
  },
];

function Zone({
  n,
  title,
  active,
  toggle,
  className,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  toggle: (n: number) => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-xl border-2 p-2',
        active ? 'border-xp-shade bg-xp/10' : 'border-border bg-surface-2/60',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <HotspotBadge n={n} active={active} onClick={() => toggle(n)} label={title} />
        <span className="truncate text-xs font-extrabold">{title}</span>
      </div>
      {children}
    </div>
  );
}

const CANDLES = [
  [30, 18, 34, 14],
  [18, 24, 28, 12],
  [24, 12, 27, 9],
  [12, 16, 20, 8],
  [16, 8, 18, 5],
  [8, 14, 16, 4],
  [14, 6, 16, 3],
];

function MiniChart() {
  return (
    <svg viewBox="0 0 120 40" className="h-20 w-full" aria-hidden="true">
      {CANDLES.map(([o, c, l, h], i) => {
        const up = (c ?? 0) < (o ?? 0);
        const x = 10 + i * 16;
        return (
          <g key={i} className={up ? 'fill-bull stroke-bull' : 'fill-bear stroke-bear'}>
            <line x1={x} x2={x} y1={h} y2={l} strokeWidth={1.2} />
            <rect
              x={x - 4}
              y={Math.min(o ?? 0, c ?? 0)}
              width={8}
              height={Math.max(1.5, Math.abs((o ?? 0) - (c ?? 0)))}
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

const lines = (n: number, tone: 'bull' | 'bear' | 'muted') => (
  <div className="flex flex-col gap-1" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <span
        key={i}
        className={cn(
          'h-1.5 rounded-full',
          tone === 'bull' && 'bg-bull/40',
          tone === 'bear' && 'bg-bear/40',
          tone === 'muted' && 'bg-text-muted/25',
        )}
        style={{ width: `${55 + ((i * 17) % 40)}%` }}
      />
    ))}
  </div>
);

/** Trading terminal with six numbered zones (m02-l03). Layout simplified. */
export function BybitTerminal() {
  return (
    <Mockup screen="Торговый терминал" hotspots={HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => (
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
          <Zone
            n={1}
            title="BTCUSDT · Спот"
            active={active === 1}
            toggle={toggle}
            className="sm:col-span-3"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="font-mono font-extrabold text-bull">84 095,6</span>
              <span className="text-text-muted">
                24ч: <b className="text-bull">+1,2%</b>
              </span>
              <span className="text-text-muted">Макс 84 900</span>
              <span className="text-text-muted">Мин 82 700</span>
            </div>
          </Zone>
          <Zone
            n={2}
            title="График"
            active={active === 2}
            toggle={toggle}
            className="sm:col-start-1 sm:row-span-2 sm:row-start-2"
          >
            <div className="flex gap-1 text-[10px] font-bold text-text-muted" aria-hidden="true">
              {['1H', '4H', '1D', 'Индикаторы'].map((t) => (
                <span
                  key={t}
                  className={cn('rounded px-1.5 py-0.5', t === '4H' && 'bg-info/20 text-info')}
                >
                  {t}
                </span>
              ))}
            </div>
            <MiniChart />
          </Zone>
          <Zone
            n={3}
            title="Стакан"
            active={active === 3}
            toggle={toggle}
            className="sm:col-start-2 sm:row-start-2"
          >
            {lines(3, 'bear')}
            <span className="font-mono text-xs font-extrabold">84 095,6</span>
            {lines(3, 'bull')}
          </Zone>
          <Zone
            n={4}
            title="Лента сделок"
            active={active === 4}
            toggle={toggle}
            className="sm:col-start-2 sm:row-start-3"
          >
            {lines(4, 'muted')}
          </Zone>
          <Zone
            n={5}
            title="Форма ордера"
            active={active === 5}
            toggle={toggle}
            className="sm:col-start-3 sm:row-span-2 sm:row-start-2"
          >
            <div className="grid grid-cols-2 gap-1 text-[10px] font-extrabold" aria-hidden="true">
              <span className="rounded bg-bull py-1 text-center text-surface">Купить</span>
              <span className="rounded bg-surface-2 py-1 text-center text-text-muted">Продать</span>
            </div>
            {lines(4, 'muted')}
          </Zone>
          <Zone
            n={6}
            title="Позиции · Ордера · История"
            active={active === 6}
            toggle={toggle}
            className="sm:col-span-3 sm:row-start-4"
          >
            {lines(2, 'muted')}
          </Zone>
        </div>
      )}
    </Mockup>
  );
}

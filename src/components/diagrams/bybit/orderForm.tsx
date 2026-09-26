import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { HotspotBadge, Mockup, type Hotspot } from './Mockup';

const HOTSPOTS: Hotspot[] = [
  {
    n: 1,
    title: 'Тип ордера',
    text: 'Лимитный — по твоей цене или лучше; рыночный — сразу по лучшим ценам; условный — после касания триггерной цены.',
  },
  {
    n: 2,
    title: 'Цена',
    text: 'Для лимитного ордера — цена, не хуже которой он исполнится. У рыночного этого поля нет, у условного добавляется триггерная цена.',
  },
  {
    n: 3,
    title: 'Количество',
    text: 'Сколько покупаешь: в монетах (BTC) или в USDT. Перед отправкой перечитай — лишний ноль стоит дорого.',
  },
  {
    n: 4,
    title: 'Тейк-профит и стоп-лосс',
    text: 'Можно задать прямо при открытии: биржа сама закроет позицию на твоих уровнях.',
  },
  {
    n: 5,
    title: 'Исполнение',
    text: 'Post-Only — только мейкер; срок действия GTC / IOC / FOK. На деривативах здесь же Reduce-Only.',
  },
  {
    n: 6,
    title: 'Купить / Продать',
    text: 'Последний шаг. Перед нажатием сверь направление, тип, цену, количество и стоп.',
  },
];

/** Order entry form (m02-l05). Values are illustrative. */
export function BybitOrderForm() {
  return (
    <Mockup screen="Форма ордера · BTCUSDT" hotspots={HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => {
        const row = (n: number, label: string, content: ReactNode) => (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-2.5',
              active === n ? 'border-xp-shade bg-xp/10' : 'border-transparent',
            )}
          >
            <HotspotBadge n={n} active={active === n} onClick={() => toggle(n)} label={label} />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-bold text-text-muted">{label}</p>
              {content}
            </div>
          </div>
        );
        const input = (value: string, unit: string) => (
          <div className="flex items-center justify-between rounded-lg border-2 border-border bg-surface px-3 py-1.5 font-mono text-sm">
            <span>{value}</span>
            <span className="text-xs text-text-muted">{unit}</span>
          </div>
        );
        return (
          <div className="mx-auto flex max-w-sm flex-col gap-1">
            {row(
              1,
              'Тип ордера',
              <div className="flex gap-1 text-xs font-extrabold">
                {['Лимитный', 'Рыночный', 'Условный'].map((t, i) => (
                  <span
                    key={t}
                    className={cn(
                      'rounded-lg px-2.5 py-1',
                      i === 0 ? 'bg-info/20 text-info' : 'bg-surface-2 text-text-muted',
                    )}
                  >
                    {t}
                  </span>
                ))}
              </div>,
            )}
            {row(2, 'Цена', input('63 000,0', 'USDT'))}
            {row(3, 'Количество', input('0,010', 'BTC'))}
            {row(
              4,
              'TP / SL',
              <div className="grid grid-cols-2 gap-2">
                {input('67 000', 'TP')}
                {input('61 500', 'SL')}
              </div>,
            )}
            {row(
              5,
              'Исполнение',
              <div className="flex flex-wrap gap-2 text-xs font-bold text-text-muted">
                <span className="rounded-lg bg-surface-2 px-2 py-1">☐ Post-Only</span>
                <span className="rounded-lg bg-surface-2 px-2 py-1">GTC ▾</span>
              </div>,
            )}
            {row(
              6,
              'Отправка',
              <div className="grid grid-cols-2 gap-2 text-sm font-extrabold">
                <span className="rounded-lg bg-bull py-2 text-center text-surface">Купить</span>
                <span className="rounded-lg bg-bear py-2 text-center text-surface">Продать</span>
              </div>,
            )}
          </div>
        );
      }}
    </Mockup>
  );
}

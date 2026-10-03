import { cn } from '@/lib/cn';
import { HotspotBadge, Mockup, type Hotspot } from './Mockup';

const HOTSPOTS: Hotspot[] = [
  {
    n: 1,
    title: 'Переключатель «Демо-торговля»',
    text: 'На сайте — меню «Торговать» в шапке → «Демо трейдинг»; в приложении — в настройках профиля. Виртуальные средства, реальные рыночные цены.',
  },
  {
    n: 2,
    title: 'Метка демо-режима',
    text: 'Пока ты в демо, на экране видна отметка Demo Trading. Проверяй её перед каждым ордером, чтобы не перепутать с реальным счётом.',
  },
  {
    n: 3,
    title: 'Виртуальный баланс',
    text: 'Стартовые демо-активы: 50 000 USDT, 50 000 USDC, 1 BTC и 1 ETH. Вывести их нельзя. Когда баланс упадёт ниже 10 000 $, можно запросить пополнение (Request Demo Funds).',
  },
  {
    n: 4,
    title: 'Выход из демо',
    text: 'На странице торговли в демо-режиме — кнопка Start Live Trading справа вверху.',
  },
];

/** Switching to Bybit Demo Trading (m02-l06). */
export function BybitDemo() {
  return (
    <Mockup screen="Меню аккаунта" hotspots={HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => (
        <div className="mx-auto flex max-w-sm flex-col gap-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3',
              active === 1 ? 'border-xp-shade bg-xp/10' : 'border-border',
            )}
          >
            <HotspotBadge
              n={1}
              active={active === 1}
              onClick={() => toggle(1)}
              label="Демо-торговля"
            />
            <span className="flex-1 text-sm font-bold">Демо-торговля</span>
            <span className="relative h-6 w-11 rounded-full bg-primary" aria-hidden="true">
              <span className="absolute top-1 right-1 size-4 rounded-full bg-surface" />
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3',
              active === 2 ? 'border-xp-shade bg-xp/10' : 'border-border',
            )}
          >
            <HotspotBadge
              n={2}
              active={active === 2}
              onClick={() => toggle(2)}
              label="Метка демо"
            />
            <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-extrabold text-warn">
              Demo Trading
            </span>
            <span className="text-xs text-text-muted">ты в демо-режиме</span>
          </div>
          <div
            className={cn(
              'flex flex-col gap-1 rounded-xl border-2 p-3',
              active === 3 ? 'border-xp-shade bg-xp/10' : 'border-border',
            )}
          >
            <div className="flex items-center gap-3">
              <HotspotBadge
                n={3}
                active={active === 3}
                onClick={() => toggle(3)}
                label="Виртуальный баланс"
              />
              <span className="text-sm font-bold">Демо-активы</span>
            </div>
            <div className="grid grid-cols-2 gap-1 pl-9 font-mono text-xs">
              <span>50 000 USDT</span>
              <span>50 000 USDC</span>
              <span>1 BTC</span>
              <span>1 ETH</span>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3',
              active === 4 ? 'border-xp-shade bg-xp/10' : 'border-border',
            )}
          >
            <HotspotBadge
              n={4}
              active={active === 4}
              onClick={() => toggle(4)}
              label="Выход из демо"
            />
            <span className="text-sm font-bold">Start Live Trading — к реальной торговле</span>
          </div>
        </div>
      )}
    </Mockup>
  );
}

import type { ReactNode } from 'react';
import { ArrowLeftRight, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HotspotBadge, Mockup, type Hotspot } from './Mockup';

const ASSETS_HOTSPOTS: Hotspot[] = [
  {
    n: 1,
    title: 'Счёт Funding (Финансирование)',
    text: 'Сюда по умолчанию зачисляются депозиты криптой, отсюда делают вывод и сделки P2P. Для торговли с этого счёта средства нужно перевести.',
  },
  {
    n: 2,
    title: 'Единый торговый аккаунт (UTA)',
    text: 'Счёт для торговли: спот и деривативы. Ордера открываются только за счёт средств на этом счёте.',
  },
  {
    n: 3,
    title: 'Перевод между счетами',
    text: 'Перемещает средства между своими счетами внутри Bybit — без блокчейна, поэтому без комиссии сети.',
  },
  {
    n: 4,
    title: 'Депозит и вывод',
    text: 'Пополнение и вывод криптой. Перед переводом всегда сверяй монету, сеть и адрес.',
  },
];

function AccountCard({
  n,
  name,
  sub,
  balance,
  active,
  toggle,
}: {
  n: number;
  name: string;
  sub: string;
  balance: string;
  active: boolean;
  toggle: (n: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border-2 p-3',
        active ? 'border-xp-shade bg-xp/10' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <HotspotBadge n={n} active={active} onClick={() => toggle(n)} label={name} />
        <span className="text-sm font-extrabold">{name}</span>
      </div>
      <span className="text-xs text-text-muted">{sub}</span>
      <span className="font-mono text-lg font-extrabold">{balance}</span>
    </div>
  );
}

/** Asset overview: Funding ↔ Unified Trading (m02-l02). */
export function BybitAssets() {
  return (
    <Mockup screen="Активы" hotspots={ASSETS_HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <AccountCard
              n={1}
              name="Funding"
              sub="Финансирование: депозиты, вывод, P2P"
              balance="300,00 USDT"
              active={active === 1}
              toggle={toggle}
            />
            <AccountCard
              n={2}
              name="Unified Trading"
              sub="Единый торговый аккаунт: спот и деривативы"
              balance="0,00 USDT"
              active={active === 2}
              toggle={toggle}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HotspotBadge n={3} active={active === 3} onClick={() => toggle(3)} label="Перевод" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-on-primary">
              <ArrowLeftRight className="size-3.5" aria-hidden="true" /> Перевести
            </span>
            <HotspotBadge
              n={4}
              active={active === 4}
              onClick={() => toggle(4)}
              label="Депозит и вывод"
            />
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
              Депозит
            </span>
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
              Вывод
            </span>
          </div>
        </div>
      )}
    </Mockup>
  );
}

const DEPOSIT_HOTSPOTS: Hotspot[] = [
  { n: 1, title: 'Монета', text: 'Что ты переводишь, например USDT.' },
  {
    n: 2,
    title: 'Сеть',
    text: 'Главное поле. Сеть должна совпадать с сетью, которую выберешь при отправке. Разные сети — монеты могут потеряться.',
  },
  {
    n: 3,
    title: 'Адрес депозита',
    text: 'Копируй кнопкой, не вручную. После вставки сверь первые и последние символы — есть вирусы, подменяющие адреса в буфере обмена.',
  },
  {
    n: 4,
    title: 'Memo / Tag',
    text: 'У некоторых сетей (например, XRP, TON) кроме адреса есть memo или tag. Если поле есть — без него депозит не зачислится автоматически.',
  },
  {
    n: 5,
    title: 'Минимум и подтверждения',
    text: 'Суммы меньше минимального депозита могут не зачислиться. Зачисление происходит после нужного числа подтверждений сети.',
  },
];

/** Crypto deposit screen: coin, network, address, memo (m02-l02). Illustrative values. */
export function BybitDeposit() {
  return (
    <Mockup screen="Депозит криптовалюты" hotspots={DEPOSIT_HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => {
        const field = (n: number, label: string, value: ReactNode, extra?: string) => (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-3',
              active === n ? 'border-xp-shade bg-xp/10' : 'border-border',
            )}
          >
            <HotspotBadge n={n} active={active === n} onClick={() => toggle(n)} label={label} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-muted">{label}</p>
              <div className="text-sm font-extrabold [overflow-wrap:anywhere]">{value}</div>
              {extra && <p className="mt-1 text-xs text-text-muted">{extra}</p>}
            </div>
          </div>
        );
        return (
          <div className="flex flex-col gap-2">
            {field(1, 'Монета', 'USDT · Tether')}
            {field(
              2,
              'Сеть',
              <span className="flex flex-wrap gap-1.5">
                {['TRX (TRC20)', 'ETH (ERC20)', 'SOL', 'BSC (BEP20)'].map((net, i) => (
                  <span
                    key={net}
                    className={cn(
                      'rounded-full border-2 px-2 py-0.5 text-xs',
                      i === 0 ? 'border-primary-shade bg-primary/15' : 'border-border font-bold',
                    )}
                  >
                    {net}
                  </span>
                ))}
              </span>,
            )}
            {field(
              3,
              'Адрес депозита',
              <span className="flex items-center gap-2 font-mono text-xs">
                TXk9…example…7Qm2
                <Copy className="size-4 shrink-0 text-info" aria-hidden="true" />
              </span>,
              'Адрес вымышленный — у каждого свой',
            )}
            {field(
              4,
              'Memo / Tag',
              'Не требуется для этой сети',
              'Для XRP, TON и некоторых других — обязателен',
            )}
            {field(5, 'Условия', 'Мин. депозит и число подтверждений сети')}
          </div>
        );
      }}
    </Mockup>
  );
}

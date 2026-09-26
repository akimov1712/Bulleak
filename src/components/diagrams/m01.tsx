import { useState } from 'react';
import { fillMarketOrder, spread } from '@/lib/trading/orderbook';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Arrow, Box, DiagramSvg, Txt } from './kit';
import { strokeOf } from './tones';

const BLOCKS = [
  { n: 101, prev: '00a7…', hash: '7f3c…' },
  { n: 102, prev: '7f3c…', hash: 'b91e…' },
  { n: 103, prev: 'b91e…', hash: '4d08…' },
];

/** Blocks linked by the previous block's hash. */
export function BlockchainChain() {
  const w = 104;
  return (
    <DiagramSvg
      width={360}
      height={230}
      title="Блокчейн: каждый блок хранит хэш предыдущего блока, поэтому изменение старого блока ломает всю цепочку после него"
    >
      {({ arrow }) => (
        <>
          {BLOCKS.map((b, i) => {
            const x = 4 + i * (w + 22);
            return (
              <g key={b.n}>
                <Box x={x} y={20} w={w} h={132} tone="info" soft />
                <Txt x={x + w / 2} y={42} textAnchor="middle" bold tone="info">
                  Блок {b.n}
                </Txt>
                <Txt x={x + 10} y={66} size={13} tone="muted">
                  пред. хэш
                </Txt>
                <Txt x={x + 10} y={82} size={13} bold tone={i > 0 ? 'epic' : 'text'}>
                  {b.prev}
                </Txt>
                <Txt x={x + 10} y={104} size={13} tone="muted">
                  транзакции
                </Txt>
                <Txt x={x + 10} y={126} size={13} tone="muted">
                  хэш блока
                </Txt>
                <Txt x={x + 10} y={142} size={13} bold tone="epic">
                  {b.hash}
                </Txt>
                {i < BLOCKS.length - 1 && (
                  <path
                    d={`M ${x + w} 137 C ${x + w + 16} 137, ${x + w + 6} 77, ${x + w + 21} 77`}
                    fill="none"
                    strokeWidth={2}
                    className="stroke-epic"
                    markerEnd={`url(#${arrow}-epic)`}
                  />
                )}
              </g>
            );
          })}
          <Txt x={180} y={182} textAnchor="middle" size={13}>
            Хэш — «отпечаток» содержимого блока.
          </Txt>
          <Txt x={180} y={202} textAnchor="middle" size={13} tone="bear">
            Изменишь блок 102 → изменится его хэш →
          </Txt>
          <Txt x={180} y={220} textAnchor="middle" size={13} tone="bear">
            блок 103 больше не сходится, подделка видна
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

const TX_STEPS = [
  { title: 'Кошелёк A', text: 'подписывает перевод своим приватным ключом', tone: 'info' },
  { title: 'Сеть', text: 'узлы проверяют подпись и баланс, передают дальше', tone: 'muted' },
  { title: 'Очередь (мемпул)', text: 'перевод ждёт; выше комиссия — быстрее', tone: 'warn' },
  { title: 'Майнер / валидатор', text: 'включает перевод в новый блок', tone: 'epic' },
  {
    title: 'Кошелёк B',
    text: 'видит поступление; каждое новое подтверждение повышает надёжность',
    tone: 'bull',
  },
] as const;

/** How a transaction travels from wallet A to wallet B. */
export function TransactionFlow() {
  const rowH = 66;
  return (
    <DiagramSvg
      width={360}
      height={TX_STEPS.length * rowH + 4}
      title="Путь транзакции: кошелёк A подписывает перевод, сеть проверяет, перевод ждёт в очереди, майнер включает его в блок, кошелёк B получает монеты"
    >
      {({ arrow }) => (
        <>
          {TX_STEPS.map((s, i) => {
            const y = 4 + i * rowH;
            return (
              <g key={s.title}>
                <circle
                  cx={22}
                  cy={y + 24}
                  r={16}
                  strokeWidth={2}
                  className={cn(strokeOf[s.tone], 'fill-surface-2')}
                />
                <Txt x={22} y={y + 29} textAnchor="middle" bold tone={s.tone}>
                  {i + 1}
                </Txt>
                <Txt x={48} y={y + 20} bold tone={s.tone}>
                  {s.title}
                </Txt>
                <foreignObject x={48} y={y + 26} width={308} height={36}>
                  <div className="text-[13px] leading-tight font-semibold text-text-muted">
                    {s.text}
                  </div>
                </foreignObject>
                {i < TX_STEPS.length - 1 && (
                  <Arrow x1={22} y1={y + 42} x2={22} y2={y + rowH + 6} arrow={arrow} />
                )}
              </g>
            );
          })}
        </>
      )}
    </DiagramSvg>
  );
}

/** Base / quote currency of a trading pair. */
export function PairAnatomy() {
  return (
    <DiagramSvg
      width={360}
      height={230}
      title="Анатомия торговой пары BTC/USDT: BTC — базовая валюта, которую покупаешь; USDT — котируемая валюта, которой платишь; цена — сколько USDT стоит 1 BTC"
    >
      {({ arrow }) => (
        <>
          <Txt x={180} y={70} textAnchor="middle" size={44} bold>
            <tspan className="fill-info">BTC</tspan>
            <tspan className="fill-text-muted"> / </tspan>
            <tspan className="fill-bull">USDT</tspan>
          </Txt>
          <Arrow x1={96} y1={90} x2={70} y2={128} arrow={arrow} tone="info" />
          <Arrow x1={262} y1={90} x2={288} y2={128} arrow={arrow} tone="bull" />
          <Box x={4} y={132} w={168} h={92} tone="info" soft />
          <Txt x={16} y={156} bold tone="info">
            Базовая валюта
          </Txt>
          <foreignObject x={16} y={162} width={150} height={60}>
            <div className="text-[13px] leading-tight font-semibold text-text-muted">
              что покупаешь или продаёшь
            </div>
          </foreignObject>
          <Box x={188} y={132} w={168} h={92} tone="bull" soft />
          <Txt x={200} y={156} bold tone="bull">
            Котируемая
          </Txt>
          <foreignObject x={200} y={162} width={150} height={60}>
            <div className="text-[13px] leading-tight font-semibold text-text-muted">
              чем платишь; в ней указана цена
            </div>
          </foreignObject>
          <Txt x={180} y={20} textAnchor="middle" size={13} tone="muted">
            Цена 65 000 = столько USDT стоит 1 BTC
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

// Illustrative BTC/USDT book (not live data).
const ASKS = [
  { price: 65_010, qty: 0.4 },
  { price: 65_020, qty: 0.8 },
  { price: 65_040, qty: 1.2 },
  { price: 65_080, qty: 2 },
];
const BIDS = [
  { price: 65_000, qty: 0.5 },
  { price: 64_990, qty: 0.9 },
  { price: 64_970, qty: 1.5 },
  { price: 64_940, qty: 2.2 },
];
const SIZES = [0.2, 1, 2.5];
const MAX_QTY = 2.2;

/** Interactive order book: a market buy of the chosen size eats ask levels. */
export function OrderBook() {
  const [size, setSize] = useState<number | null>(null);
  const fill = size === null ? null : fillMarketOrder(ASKS, size);
  const filledAt = (price: number) => fill?.fills.find((f) => f.price === price)?.qty ?? 0;
  const s = spread(BIDS[0]?.price ?? 0, ASKS[0]?.price ?? 0);
  const rowH = 26;
  const row = (y: number, price: number, qty: number, side: 'ask' | 'bid') => {
    const taken = side === 'ask' ? filledAt(price) : 0;
    const tone = side === 'ask' ? 'bear' : 'bull';
    return (
      <g key={`${side}${price}`}>
        <rect
          x={360 - 6 - (qty / MAX_QTY) * 150}
          y={y - 17}
          width={(qty / MAX_QTY) * 150}
          height={rowH - 4}
          rx={4}
          className={side === 'ask' ? 'fill-bear-soft' : 'fill-bull-soft'}
        />
        {taken > 0 && (
          <rect
            x={360 - 6 - (qty / MAX_QTY) * 150}
            y={y - 17}
            width={(taken / MAX_QTY) * 150}
            height={rowH - 4}
            rx={4}
            className="fill-xp"
            opacity={0.55}
          />
        )}
        <Txt x={16} y={y} bold tone={tone}>
          {formatNumber(price, 0)}
        </Txt>
        <Txt x={344} y={y} textAnchor="end">
          {formatNumber(qty, 1)}
        </Txt>
        {taken > 0 && (
          <Txt x={122} y={y} size={13} tone="xp" bold>
            куплено {formatNumber(taken, 1)}
          </Txt>
        )}
      </g>
    );
  };
  const asksTop = 44;
  const spreadY = asksTop + ASKS.length * rowH;
  return (
    <DiagramSvg
      width={360}
      height={spreadY + 58 + BIDS.length * rowH}
      title="Биржевой стакан: сверху заявки на продажу (аски), снизу заявки на покупку (биды), между ними спред. Рыночная покупка забирает аски по очереди, начиная с самой дешёвой"
      footer={
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-text-muted">Рыночная покупка:</span>
            {SIZES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSize(size === v ? null : v)}
                aria-pressed={size === v}
                className={cn(
                  'rounded-full border-2 px-3 py-1 font-bold transition-colors',
                  size === v
                    ? 'border-xp-shade bg-xp text-on-xp'
                    : 'border-border bg-surface text-text hover:border-xp-shade',
                )}
              >
                {formatNumber(v, 1)} BTC
              </button>
            ))}
          </div>
          <p className="min-h-10 text-text-muted" aria-live="polite">
            {fill && fill.avgPrice !== null
              ? `Средняя цена ${formatNumber(fill.avgPrice, 2)} USDT — на ${formatNumber(fill.slippagePct, 3)}% хуже лучшего аска (проскальзывание). Задело уровней: ${fill.fills.length}.`
              : 'Выбери объём: увидишь, какие заявки заберёт рыночный ордер.'}
          </p>
        </div>
      }
    >
      <Txt x={16} y={20} size={13} tone="muted">
        цена, USDT
      </Txt>
      <Txt x={344} y={20} size={13} tone="muted" textAnchor="end">
        объём, BTC
      </Txt>
      <Txt x={200} y={20} size={13} tone="bear" textAnchor="middle" bold>
        продают (аски)
      </Txt>
      {[...ASKS].reverse().map((a, i) => row(asksTop + i * rowH + 12, a.price, a.qty, 'ask'))}
      <line
        x1={8}
        x2={352}
        y1={spreadY + 4}
        y2={spreadY + 4}
        strokeDasharray="4 4"
        className="stroke-border"
        strokeWidth={1.5}
      />
      <Txt x={180} y={spreadY + 21} textAnchor="middle" size={13} tone="muted">
        спред {formatNumber(s.abs, 0)} USDT ({formatNumber(s.pct, 3)}%)
      </Txt>
      <line
        x1={8}
        x2={352}
        y1={spreadY + 28}
        y2={spreadY + 28}
        strokeDasharray="4 4"
        className="stroke-border"
        strokeWidth={1.5}
      />
      {BIDS.map((b, i) => row(spreadY + 34 + i * rowH + 12, b.price, b.qty, 'bid'))}
      <Txt
        x={200}
        y={spreadY + 52 + BIDS.length * rowH}
        size={13}
        tone="bull"
        textAnchor="middle"
        bold
      >
        покупают (биды)
      </Txt>
    </DiagramSvg>
  );
}

const WALLETS = [
  {
    title: 'Счёт на бирже',
    keys: 'ключи у биржи',
    note: 'удобно торговать; риск — взлом или банкротство биржи',
    tone: 'warn',
  },
  {
    title: 'Горячий кошелёк',
    keys: 'ключи у тебя, онлайн',
    note: 'приложение или расширение; риск — вирусы и фишинг',
    tone: 'info',
  },
  {
    title: 'Холодный кошелёк',
    keys: 'ключи у тебя, офлайн',
    note: 'аппаратное устройство; для долгого хранения',
    tone: 'bull',
  },
] as const;

/** Custodial exchange account → hot wallet → cold wallet. */
export function WalletTypes() {
  const rowH = 96;
  return (
    <DiagramSvg
      width={360}
      height={WALLETS.length * rowH + 40}
      title="Типы хранения крипты: счёт на бирже (ключи у биржи), горячий кошелёк (ключи у тебя, онлайн) и холодный кошелёк (ключи офлайн). Чем холоднее, тем безопаснее, но менее удобно"
    >
      {({ arrow }) => (
        <>
          {WALLETS.map((w, i) => {
            const y = 4 + i * rowH;
            return (
              <g key={w.title}>
                <Box x={4} y={y} w={316} h={rowH - 8} tone={w.tone} soft />
                <Txt x={16} y={y + 22} bold tone={w.tone}>
                  {w.title}
                </Txt>
                <Txt x={16} y={y + 42} size={13} bold>
                  {w.keys}
                </Txt>
                <foreignObject x={16} y={y + 48} width={296} height={38}>
                  <div className="text-[13px] leading-tight font-semibold text-text-muted">
                    {w.note}
                  </div>
                </foreignObject>
              </g>
            );
          })}
          <Arrow
            x1={334}
            y1={10}
            x2={334}
            y2={WALLETS.length * rowH - 12}
            arrow={arrow}
            tone="bull"
          />
          <Txt
            x={0}
            y={0}
            size={13}
            tone="bull"
            textAnchor="middle"
            transform={`translate(346 ${(WALLETS.length * rowH) / 2}) rotate(-90)`}
          >
            безопаснее
          </Txt>
          <Txt x={180} y={WALLETS.length * rowH + 24} textAnchor="middle" size={13} tone="muted">
            «Не твои ключи — не твои монеты»
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

const PHISHING_SIGNS = [
  'Адрес отправителя: чужой домен, похожий на настоящий',
  'Срочность и угрозы: «заблокируем через 24 часа»',
  'Ссылка ведёт на поддельный сайт — наведи и проверь адрес',
  'Просят пароль, код 2FA или сид-фразу — так не делает никто',
];

/** A fake e-mail with the phishing signs numbered. */
export function PhishingAnatomy() {
  const badge = (n: number, x: number, y: number) => (
    <g>
      <circle cx={x} cy={y} r={11} className="fill-bear" />
      <Txt x={x} y={y + 5} textAnchor="middle" size={13} bold className="fill-on-bear">
        {n}
      </Txt>
    </g>
  );
  return (
    <DiagramSvg
      width={360}
      height={420}
      title="Разбор фишингового письма: поддельный адрес отправителя, давление срочностью, ссылка на чужой сайт и просьба ввести пароль или код"
    >
      <Box x={4} y={4} w={352} h={248} tone="muted" />
      <Txt x={16} y={28} size={13} tone="muted">
        От:
      </Txt>
      <Txt x={44} y={28} size={13} bold>
        security@bybit-verify.example
      </Txt>
      {badge(1, 336, 23)}
      <line x1={12} x2={348} y1={40} y2={40} className="stroke-border" strokeWidth={1.5} />
      <Txt x={16} y={64} bold size={15}>
        Ваш аккаунт будет заблокирован!
      </Txt>
      <foreignObject x={16} y={72} width={300} height={62}>
        <div className="text-[13px] leading-snug font-semibold text-text-muted">
          Мы заметили подозрительный вход. Подтвердите аккаунт в течение 24 часов, иначе средства
          будут заморожены.
        </div>
      </foreignObject>
      {badge(2, 336, 88)}
      <rect x={16} y={140} width={172} height={36} rx={10} className="fill-primary" />
      <Txt x={102} y={163} textAnchor="middle" bold className="fill-on-primary">
        Подтвердить вход
      </Txt>
      <Txt x={16} y={200} size={13} tone="muted">
        ссылка ведёт на bybit-login.example
      </Txt>
      {badge(3, 336, 195)}
      <Txt x={16} y={232} size={13} tone="muted">
        Там просят пароль, 2FA и сид-фразу
      </Txt>
      {badge(4, 336, 227)}
      {PHISHING_SIGNS.map((text, i) => (
        <g key={text}>
          {badge(i + 1, 16, 282 + i * 36)}
          <foreignObject x={34} y={270 + i * 36} width={322} height={34}>
            <div className="text-[13px] leading-tight font-semibold text-text">{text}</div>
          </foreignObject>
        </g>
      ))}
    </DiagramSvg>
  );
}

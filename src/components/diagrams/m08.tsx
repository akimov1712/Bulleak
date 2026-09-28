import {
  BTCUSDT_MMR_PCT,
  liquidationDistancePct,
  liquidationPrice,
} from '@/lib/trading/liquidation';
import { Arrow, Box, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

type Pt = readonly [number, number];

const STROKE: Partial<Record<DiagramTone, string>> = {
  text: 'stroke-text',
  muted: 'stroke-text-muted',
  info: 'stroke-info',
  warn: 'stroke-warn',
  epic: 'stroke-epic',
  bull: 'stroke-bull',
  bear: 'stroke-bear',
};

function Path({
  pts,
  tone = 'text',
  width = 2.5,
  dashed,
}: {
  pts: readonly Pt[];
  tone?: DiagramTone;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <polyline
      points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
      fill="none"
      strokeWidth={width}
      strokeLinejoin="round"
      strokeDasharray={dashed ? '6 4' : undefined}
      className={STROKE[tone] ?? 'stroke-text'}
    />
  );
}

const xs = Array.from({ length: 30 }, (_, i) => 20 + i * 11);
const base = (i: number) => 120 - Math.sin(i / 5) * 18 - i * 0.6;

/** Last, Index and Mark price: a spike on one exchange moves Last but not Mark. */
export function PriceTypes() {
  const last: Pt[] = xs.map((x, i) => [x, base(i) + (i === 17 ? 62 : Math.sin(i * 1.7) * 5)]);
  const index: Pt[] = xs.map((x, i) => [x, base(i) + 3]);
  const mark: Pt[] = xs.map((x, i) => [x, base(i) + 1]);
  return (
    <DiagramSvg
      width={360}
      height={260}
      title="Три цены фьючерса: Last — цена последней сделки на бирже, скачет и может резко проколоть вниз; Index — средняя цена актива по нескольким спотовым биржам; Mark — справедливая цена на основе индекса, по ней Bybit считает нереализованный P&L и ликвидации. Резкий прокол Last не меняет Mark и не ликвидирует позицию"
    >
      {({ arrow }) => (
        <>
          <Path pts={index} tone="info" width={2} dashed />
          <Path pts={mark} tone="warn" width={3} />
          <Path pts={last} tone="text" width={1.8} />
          <circle cx={xs[17]} cy={last[17]?.[1]} r={6} className="fill-bear" />
          <Txt x={(xs[17] ?? 0) + 10} y={(last[17]?.[1] ?? 0) + 5} size={12} bold tone="bear">
            прокол Last
          </Txt>
          <Arrow
            x1={(xs[17] ?? 0) - 40}
            y1={206}
            x2={(xs[17] ?? 0) - 6}
            y2={(last[17]?.[1] ?? 0) + 4}
            arrow={arrow}
            tone="bear"
          />
          <Txt x={20} y={214} size={12} tone="bear" bold>
            Mark не сдвинулась — ликвидации нет
          </Txt>
          <Txt x={20} y={236} size={13} bold>
            Last
          </Txt>
          <Txt x={60} y={236} size={12} tone="muted">
            последняя сделка
          </Txt>
          <Txt x={20} y={254} size={13} bold tone="info">
            Index
          </Txt>
          <Txt x={66} y={254} size={12} tone="muted">
            средняя по биржам
          </Txt>
          <Txt x={196} y={236} size={13} bold tone="warn">
            Mark
          </Txt>
          <Txt x={240} y={236} size={12} tone="muted">
            для P&L
          </Txt>
          <Txt x={196} y={254} size={12} tone="muted">
            и ликвидаций
          </Txt>
          <Txt x={20} y={22} size={14} bold>
            Last, Index и Mark
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

/** Long profits when the price rises, short when it falls; formulas under each panel. */
export function LongShortPnl() {
  const panel = (x0: number, long: boolean) => {
    const pts: Pt[] = long
      ? [
          [x0 + 16, 150],
          [x0 + 50, 128],
          [x0 + 76, 136],
          [x0 + 110, 96],
          [x0 + 150, 60],
        ]
      : [
          [x0 + 16, 60],
          [x0 + 50, 84],
          [x0 + 76, 76],
          [x0 + 110, 116],
          [x0 + 150, 150],
        ];
    const tone = long ? 'bull' : 'bear';
    return (
      <g>
        <Box x={x0} y={4} w={172} h={250} tone={tone} soft />
        <Txt x={x0 + 86} y={28} size={15} bold tone={tone} textAnchor="middle">
          {long ? 'Лонг' : 'Шорт'}
        </Txt>
        <Txt x={x0 + 86} y={46} size={12} tone="muted" textAnchor="middle">
          {long ? 'зарабатывает на росте' : 'зарабатывает на падении'}
        </Txt>
        <line
          x1={x0 + 12}
          x2={x0 + 160}
          y1={long ? 150 : 60}
          y2={long ? 150 : 60}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="stroke-text-muted"
        />
        <Txt x={x0 + 14} y={long ? 168 : 76} size={12} tone="muted">
          вход
        </Txt>
        <Path pts={pts} />
        <Txt
          x={long ? x0 + 16 : x0 + 160}
          y={long ? 84 : 168}
          size={13}
          bold
          tone="bull"
          textAnchor={long ? 'start' : 'end'}
        >
          + прибыль
        </Txt>
        <foreignObject x={x0 + 6} y={186} width={160} height={64}>
          <div className="text-center text-[12px] leading-tight font-semibold text-text">
            {long ? 'P&L = (выход − вход) × кол-во' : 'P&L = (вход − выход) × кол-во'}
          </div>
        </foreignObject>
      </g>
    );
  };
  return (
    <DiagramSvg
      width={360}
      height={258}
      title="Лонг зарабатывает, когда цена растёт: P&L равен выход минус вход, умноженное на количество. Шорт зарабатывает, когда цена падает: P&L равен вход минус выход, умноженное на количество. У шорта без стопа убыток теоретически не ограничен"
    >
      {panel(2, true)}
      {panel(186, false)}
    </DiagramSvg>
  );
}

const LEVERAGES = [2, 5, 10] as const;

/** Leverage changes the margin, not the risk: the same stop gives the same dollar loss. */
export function LeverageMargin() {
  const position = 5000;
  const lossAtStop = position * 0.02;
  const maxW = 250;
  return (
    <DiagramSvg
      width={360}
      height={260}
      title="Позиция 5 000 долларов при плече 2x требует 2 500 маржи, при 5x — 1 000, при 10x — 500. Но со стопом в 2 процента убыток во всех трёх случаях одинаковый — 100 долларов. Риск задают стоп и размер позиции, а плечо лишь определяет, сколько денег заблокировано и насколько близко ликвидация"
    >
      <Txt x={10} y={22} size={14} bold>
        Позиция 5 000 $, стоп −2 %
      </Txt>
      {LEVERAGES.map((lev, i) => {
        const y = 44 + i * 58;
        const margin = position / lev;
        const w = (margin / position) * maxW;
        return (
          <g key={lev}>
            <Txt x={10} y={y + 20} size={14} bold tone="info">
              {`${lev}x`}
            </Txt>
            <rect
              x={50}
              y={y}
              width={maxW}
              height={30}
              rx={6}
              className="fill-info-soft stroke-info"
              strokeWidth={1.5}
            />
            <rect x={50} y={y} width={w} height={30} rx={6} className="fill-warn" opacity={0.85} />
            <Txt x={56} y={y + 20} size={12} bold>
              {`маржа ${margin.toLocaleString('ru-RU')} $`}
            </Txt>
            <Txt x={350} y={y + 20} size={12} bold tone="bear" textAnchor="end">
              {`−${lossAtStop} $`}
            </Txt>
          </g>
        );
      })}
      <foreignObject x={10} y={214} width={340} height={46}>
        <div className="text-center text-[13px] leading-snug font-semibold text-text">
          Убыток по стопу одинаковый. Плечо меняет только маржу и близость ликвидации.
        </div>
      </foreignObject>
    </DiagramSvg>
  );
}

const LADDER = [2, 3, 5, 10, 20, 50, 100] as const;

/** Distance from entry to the liquidation price for a long, by leverage (MMR 0.5 %). */
export function LiquidationLadder() {
  const rows = LADDER.map((lev) => {
    const liq = liquidationPrice({
      side: 'long',
      entry: 100,
      leverage: lev,
      mmrPct: BTCUSDT_MMR_PCT,
    });
    return { lev, dist: liq === null ? 0 : (liquidationDistancePct(100, liq) ?? 0) };
  });
  const maxW = 220;
  const rowH = 30;
  return (
    <DiagramSvg
      width={360}
      height={rows.length * rowH + 76}
      title="Расстояние от входа до ликвидации лонга при разном плече, ставка поддерживающей маржи 0,5 процента: 2x — около 49,5 процента, 5x — 19,5, 10x — 9,5, 20x — 4,5, 50x — 1,5, 100x — 0,5 процента. Чем выше плечо, тем ближе ликвидация и тем меньше места для стопа"
    >
      <Txt x={10} y={22} size={14} bold>
        Путь цены до ликвидации лонга
      </Txt>
      {rows.map((r, i) => {
        const y = 36 + i * rowH;
        const w = Math.max(3, (r.dist / 50) * maxW);
        const tone = r.dist >= 15 ? 'fill-bull' : r.dist >= 5 ? 'fill-warn' : 'fill-bear';
        return (
          <g key={r.lev}>
            <Txt x={10} y={y + 17} size={13} bold>
              {`${r.lev}x`}
            </Txt>
            <rect x={56} y={y + 3} width={w} height={20} rx={4} className={tone} opacity={0.85} />
            <Txt x={Math.min(56 + w + 6, 300)} y={y + 18} size={12} bold>
              {`${r.dist.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`}
            </Txt>
          </g>
        );
      })}
      <Txt x={10} y={rows.length * rowH + 60} size={12} tone="muted">
        Лонг, изолированная маржа, MMR 0,5 %, без комиссий. Точная цена — в Bybit.
      </Txt>
    </DiagramSvg>
  );
}

/** Funding: who pays whom depending on the sign, three times a day. */
export function FundingFlow() {
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Ставка финансирования: если она положительная, держатели лонгов платят держателям шортов; если отрицательная — шорты платят лонгам. На Bybit обычно каждые 8 часов, в 00:00, 08:00 и 16:00 UTC; платёж равен стоимости позиции, умноженной на ставку, и списывается только с тех, у кого позиция открыта в момент расчёта"
    >
      {({ arrow }) => (
        <>
          <Box x={10} y={40} w={130} h={70} tone="bull" soft />
          <Box x={220} y={40} w={130} h={70} tone="bear" soft />
          <Txt x={75} y={82} size={16} bold tone="bull" textAnchor="middle">
            Лонги
          </Txt>
          <Txt x={285} y={82} size={16} bold tone="bear" textAnchor="middle">
            Шорты
          </Txt>
          <Arrow x1={144} y1={62} x2={216} y2={62} arrow={arrow} tone="warn" width={3} />
          <Txt x={180} y={54} size={12} bold tone="warn" textAnchor="middle">
            funding &gt; 0
          </Txt>
          <Arrow x1={216} y1={92} x2={144} y2={92} arrow={arrow} tone="info" width={3} />
          <Txt x={180} y={110} size={12} bold tone="info" textAnchor="middle">
            funding &lt; 0
          </Txt>
          <Txt x={180} y={24} size={14} bold textAnchor="middle">
            Кто кому платит
          </Txt>
          <foreignObject x={10} y={126} width={340} height={120}>
            <div className="flex flex-col gap-1 text-[13px] leading-snug font-semibold text-text">
              <span>Платёж = стоимость позиции × ставка</span>
              <span className="text-text-muted">
                Обычно каждые 8 часов: 00:00, 08:00, 16:00 UTC
              </span>
              <span className="text-text-muted">
                Платят только те, у кого позиция открыта в момент расчёта
              </span>
            </div>
          </foreignObject>
        </>
      )}
    </DiagramSvg>
  );
}

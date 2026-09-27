import { Arrow, Box, Candle, DiagramSvg, Txt } from './kit';
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
  width = 3,
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

function HLine({
  x1,
  x2,
  y,
  tone = 'muted',
  dashed = true,
}: {
  x1: number;
  x2: number;
  y: number;
  tone?: DiagramTone;
  dashed?: boolean;
}) {
  return (
    <line
      x1={x1}
      x2={x2}
      y1={y}
      y2={y}
      strokeWidth={2}
      strokeDasharray={dashed ? '6 4' : undefined}
      className={STROKE[tone] ?? 'stroke-text-muted'}
    />
  );
}

const FUNNEL = [
  { tf: '1D', role: 'Контекст', what: 'тренд и ключевые зоны', tone: 'info' as const },
  { tf: '4H', role: 'Сетап', what: 'структура у зоны 1D', tone: 'epic' as const },
  { tf: '1H', role: 'Триггер', what: 'вход и короткий стоп', tone: 'bull' as const },
];

/** Top-down analysis: 1D context → 4H setup → 1H trigger. */
export function TopDownFunnel() {
  const rowH = 92;
  return (
    <DiagramSvg
      width={360}
      height={rowH * 3 + 40}
      title="Анализ сверху вниз: на дневном графике определяют тренд и ключевые зоны, на 4-часовом ищут сетап — структуру у зоны дневного, на часовом — триггер входа и короткий стоп. Соседние таймфреймы отличаются в 4–6 раз, при конфликте главнее старший"
    >
      {({ arrow }) => (
        <>
          {FUNNEL.map((f, i) => {
            const inset = i * 34;
            const y = i * rowH;
            const x1 = 10 + inset;
            const x2 = 350 - inset;
            const nextInset = (i + 1) * 34 - 10;
            const pts = `${x1},${y + 4} ${x2},${y + 4} ${350 - nextInset},${y + rowH - 14} ${10 + nextInset},${y + rowH - 14}`;
            const fill: Record<string, string> = {
              info: 'fill-info-soft stroke-info',
              epic: 'fill-epic-soft stroke-epic',
              bull: 'fill-bull-soft stroke-bull',
            };
            return (
              <g key={f.tf}>
                <polygon points={pts} strokeWidth={2} className={fill[f.tone]} />
                <Txt x={180} y={y + 32} size={16} bold tone={f.tone} textAnchor="middle">
                  {`${f.tf} · ${f.role}`}
                </Txt>
                <Txt x={180} y={y + 54} size={13} textAnchor="middle">
                  {f.what}
                </Txt>
                {i < 2 && (
                  <Arrow
                    x1={180}
                    y1={y + rowH - 12}
                    x2={180}
                    y2={y + rowH + 2}
                    arrow={arrow}
                    tone="muted"
                  />
                )}
                {i > 0 && (
                  <Txt x={342} y={y + 6} size={12} bold tone="muted" textAnchor="end">
                    {i === 1 ? '×6' : '×4'}
                  </Txt>
                )}
              </g>
            );
          })}
          <foreignObject x={10} y={rowH * 3 - 6} width={340} height={46}>
            <div className="text-center text-[13px] leading-snug font-semibold text-text-muted">
              Сначала контекст, потом детали. При конфликте прав старший таймфрейм.
            </div>
          </foreignObject>
        </>
      )}
    </DiagramSvg>
  );
}

/** Where stops cluster: above equal highs, below equal lows, at round numbers — and a sweep. */
export function LiquidityPools() {
  const path: Pt[] = [
    [10, 150],
    [44, 70],
    [74, 150],
    [104, 72],
    [138, 148],
    [170, 110],
    [196, 150],
    [212, 196],
    [224, 150],
    [270, 100],
    [300, 118],
    [340, 60],
  ];
  const dots = (y: number, x0: number, tone: 'bull' | 'bear') =>
    Array.from({ length: 9 }, (_, k) => (
      <circle
        key={k}
        cx={x0 + k * 16 + (k % 2) * 4}
        cy={y + (k % 3) * 5}
        r={3.5}
        className={tone === 'bull' ? 'fill-bull' : 'fill-bear'}
        opacity={0.75}
      />
    ));
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Пулы ликвидности: над равными максимумами скапливаются стопы продавцов и ордера на покупку на пробое, под равными минимумами — стопы покупателей. Прокол минимумов тенью с возвратом в диапазон — снятие ликвидности"
    >
      {({ arrow }) => (
        <>
          <HLine x1={20} x2={200} y={70} tone="bear" />
          <HLine x1={20} x2={210} y={150} tone="bull" />
          {dots(44, 36, 'bear')}
          {dots(162, 36, 'bull')}
          <Txt x={30} y={30} size={13} bold tone="bear">
            над равными максимумами — стопы шортов
          </Txt>
          <Txt x={30} y={196} size={13} bold tone="bull">
            под равными минимумами
          </Txt>
          <Txt x={30} y={212} size={13} bold tone="bull">
            — стопы лонгов
          </Txt>
          <Path pts={path} />
          <circle cx={212} cy={196} r={7} className="fill-warn" />
          <Txt x={244} y={214} size={13} bold tone="warn">
            прокол
          </Txt>
          <Txt x={244} y={230} size={13} bold tone="warn">
            и возврат
          </Txt>
          <Arrow x1={238} y1={206} x2={220} y2={200} arrow={arrow} tone="warn" />
          <Txt x={350} y={46} size={12} tone="muted" textAnchor="end">
            цена ушла
          </Txt>
          <Txt x={350} y={60} size={12} tone="muted" textAnchor="end">
            к ликвидности сверху
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

interface C {
  o: number;
  c: number;
  h: number;
  l: number;
}

const BREAKOUT: C[] = [
  { o: 150, c: 132, h: 128, l: 156 },
  { o: 132, c: 142, h: 126, l: 146 },
  { o: 142, c: 112, h: 108, l: 146 },
  { o: 112, c: 80, h: 74, l: 116 },
  { o: 80, c: 96, h: 76, l: 104 },
  { o: 96, c: 90, h: 86, l: 102 },
  { o: 90, c: 64, h: 58, l: 94 },
  { o: 64, c: 50, h: 44, l: 70 },
];

const FAKEOUT: C[] = [
  { o: 150, c: 132, h: 128, l: 156 },
  { o: 132, c: 142, h: 126, l: 146 },
  { o: 142, c: 112, h: 108, l: 146 },
  { o: 112, c: 106, h: 70, l: 116 },
  { o: 106, c: 130, h: 102, l: 134 },
  { o: 130, c: 150, h: 126, l: 154 },
  { o: 150, c: 170, h: 146, l: 176 },
  { o: 170, c: 186, h: 166, l: 192 },
];

/** Confirmed breakout with a retest vs a failed breakout that closes back in the range. */
export function BreakoutVsFakeout() {
  const level = 102;
  const panel = (x0: number, candles: C[], ok: boolean) => (
    <g>
      <Box x={x0} y={4} w={172} h={236} tone={ok ? 'bull' : 'bear'} soft />
      <Txt x={x0 + 86} y={26} size={14} bold tone={ok ? 'bull' : 'bear'} textAnchor="middle">
        {ok ? 'Пробой' : 'Ложный пробой'}
      </Txt>
      <HLine x1={x0 + 6} x2={x0 + 166} y={level} tone="info" />
      <Txt x={x0 + 8} y={level - 6} size={12} tone="info" bold>
        уровень
      </Txt>
      {candles.map((c, i) => (
        <Candle key={i} x={x0 + 20 + i * 19} open={c.o} close={c.c} high={c.h} low={c.l} w={11} />
      ))}
      <foreignObject x={x0 + 6} y={196} width={160} height={42}>
        <div className="text-center text-[12px] leading-tight font-semibold text-text">
          {ok
            ? 'закрытие над уровнем, ретест сверху, продолжение'
            : 'тень выше уровня, закрытие обратно — ловушка'}
        </div>
      </foreignObject>
    </g>
  );
  return (
    <DiagramSvg
      width={360}
      height={244}
      title="Слева настоящий пробой: свеча закрывается над уровнем, цена возвращается сверху на ретест и продолжает рост. Справа ложный пробой: тень выходит за уровень, но свеча закрывается обратно в диапазоне, и цена уходит в противоположную сторону"
    >
      {panel(2, BREAKOUT, true)}
      {panel(186, FAKEOUT, false)}
      <circle cx={2 + 20 + 5 * 19} cy={88} r={5} className="fill-bull" />
      <Txt x={2 + 20 + 5 * 19 + 8} y={126} size={12} bold tone="bull">
        ретест
      </Txt>
    </DiagramSvg>
  );
}

interface Div {
  name: string;
  meaning: string;
  price: [number, number];
  osc: [number, number];
  top: boolean;
  tone: 'bull' | 'bear';
}

/** Values are heights (bigger = higher on the drawing) of the two extremes. */
const DIVS: Div[] = [
  {
    name: 'Медвежья регулярная',
    meaning: 'цена HH, RSI LH — импульс слабеет',
    price: [30, 44],
    osc: [44, 28],
    top: true,
    tone: 'bear',
  },
  {
    name: 'Бычья регулярная',
    meaning: 'цена LL, RSI HL — продавцы слабеют',
    price: [30, 16],
    osc: [16, 32],
    top: false,
    tone: 'bull',
  },
  {
    name: 'Скрытая бычья',
    meaning: 'цена HL, RSI LL — продолжение роста',
    price: [16, 30],
    osc: [32, 16],
    top: false,
    tone: 'bull',
  },
  {
    name: 'Скрытая медвежья',
    meaning: 'цена LH, RSI HH — продолжение падения',
    price: [44, 30],
    osc: [28, 44],
    top: true,
    tone: 'bear',
  },
];

/** Regular and hidden divergences between price and RSI. */
export function DivergenceTypes() {
  const cellW = 176;
  const cellH = 214;
  return (
    <DiagramSvg
      width={360}
      height={cellH * 2}
      title="Четыре вида дивергенций. Медвежья регулярная: цена делает более высокий максимум, RSI — более низкий. Бычья регулярная: цена — более низкий минимум, RSI — более высокий. Скрытая бычья: цена — более высокий минимум, RSI — более низкий, сигнал продолжения роста. Скрытая медвежья — зеркально"
    >
      {DIVS.map((dv, i) => {
        const x = 2 + (i % 2) * (cellW + 4);
        const y = Math.floor(i / 2) * cellH;
        // two extremes: at x+50 and x+130; y inside cell (price panel 30..80, osc panel 100..140)
        const pY = (v: number) => y + 82 - v;
        const oY = (v: number) => y + 150 - v;
        const px1 = x + 46;
        const px2 = x + 130;
        const p1 = pY(dv.price[0]);
        const p2 = pY(dv.price[1]);
        const o1 = oY(dv.osc[0]);
        const o2 = oY(dv.osc[1]);
        const pricePath: Pt[] = dv.top
          ? [
              [x + 10, p1 + 20],
              [px1, p1],
              [x + 88, p1 + 18],
              [px2, p2],
              [x + 166, p2 + 16],
            ]
          : [
              [x + 10, p1 - 20],
              [px1, p1],
              [x + 88, p1 - 18],
              [px2, p2],
              [x + 166, p2 - 16],
            ];
        const oscPath: Pt[] = dv.top
          ? [
              [x + 10, o1 + 16],
              [px1, o1],
              [x + 88, o1 + 18],
              [px2, o2],
              [x + 166, o2 + 14],
            ]
          : [
              [x + 10, o1 - 16],
              [px1, o1],
              [x + 88, o1 - 18],
              [px2, o2],
              [x + 166, o2 - 14],
            ];
        return (
          <g key={dv.name}>
            <Box x={x} y={y + 2} w={cellW} h={cellH - 6} tone={dv.tone} soft />
            <Txt x={x + 8} y={y + 18} size={12} tone="muted" bold>
              цена
            </Txt>
            <Path pts={pricePath} width={2.5} />
            <Path
              pts={[
                [px1, p1],
                [px2, p2],
              ]}
              tone={dv.tone}
              width={2}
              dashed
            />
            <line
              x1={x + 8}
              x2={x + cellW - 8}
              y1={y + 92}
              y2={y + 92}
              strokeWidth={1}
              className="stroke-text-muted"
              opacity={0.4}
            />
            <Txt x={x + 8} y={y + 108} size={12} tone="muted" bold>
              RSI
            </Txt>
            <Path pts={oscPath} tone="epic" width={2.5} />
            <Path
              pts={[
                [px1, o1],
                [px2, o2],
              ]}
              tone={dv.tone}
              width={2}
              dashed
            />
            <foreignObject x={x + 4} y={y + 164} width={cellW - 8} height={cellH - 168}>
              <div className="text-center text-[12px] leading-tight">
                <div
                  className={
                    dv.tone === 'bull' ? 'font-extrabold text-bull' : 'font-extrabold text-bear'
                  }
                >
                  {dv.name}
                </div>
                <div className="font-semibold text-text-muted">{dv.meaning}</div>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

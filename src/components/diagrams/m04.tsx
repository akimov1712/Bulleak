import type { ReactNode } from 'react';
import { Arrow, Candle, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

type Pt = readonly [number, number];

const points = (pts: readonly Pt[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

function Path({ pts, dx = 0, dy = 0 }: { pts: readonly Pt[]; dx?: number; dy?: number }) {
  return (
    <polyline
      points={points(pts.map(([x, y]) => [x + dx, y + dy] as const))}
      fill="none"
      strokeWidth={3}
      strokeLinejoin="round"
      className="stroke-text"
    />
  );
}

function Line({
  x1,
  y1,
  x2,
  y2,
  tone = 'muted',
  dashed = true,
  width = 2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: DiagramTone;
  dashed?: boolean;
  width?: number;
}) {
  const stroke: Record<string, string> = {
    muted: 'stroke-text-muted',
    info: 'stroke-info',
    bull: 'stroke-bull',
    bear: 'stroke-bear',
    warn: 'stroke-warn',
    text: 'stroke-text',
  };
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={width}
      strokeDasharray={dashed ? '6 4' : undefined}
      className={stroke[tone] ?? 'stroke-text-muted'}
    />
  );
}

/** Caption block under a drawing cell: bold name + muted meaning. */
function Caption({
  x,
  y,
  w,
  name,
  meaning,
  h = 64,
}: {
  x: number;
  y: number;
  w: number;
  name: string;
  meaning: string;
  h?: number;
}) {
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div className="flex flex-col gap-0.5 text-center text-[13px] leading-tight">
        <span className="font-extrabold text-text">{name}</span>
        <span className="font-semibold text-text-muted">{meaning}</span>
      </div>
    </foreignObject>
  );
}

interface C4 {
  o: number;
  c: number;
  h: number;
  l: number;
  tone?: 'bull' | 'bear' | 'muted';
}

interface PatternCell {
  name: string;
  meaning: string;
  candles: C4[];
  /** Extra marks drawn in cell coordinates (level lines etc.). */
  marks?: ReactNode;
}

const CELL_W = 118;

function CandleGrid({
  cells,
  cellH,
  title,
  candleW,
}: {
  cells: PatternCell[];
  cellH: number;
  title: string;
  candleW: number;
}) {
  const rows = Math.ceil(cells.length / 3);
  return (
    <DiagramSvg width={360} height={cellH * rows} title={title}>
      {cells.map((cell, i) => {
        const x = 2 + (i % 3) * (CELL_W + 1);
        const y = Math.floor(i / 3) * cellH;
        const gap = candleW + 12;
        const first = x + CELL_W / 2 - ((cell.candles.length - 1) * gap) / 2;
        return (
          <g key={cell.name}>
            <g transform={`translate(${x} ${y})`}>{cell.marks}</g>
            {cell.candles.map((c, j) => (
              <Candle
                key={j}
                x={first + j * gap}
                open={y + c.o}
                close={y + c.c}
                high={y + c.h}
                low={y + c.l}
                w={candleW}
                tone={c.tone}
              />
            ))}
            <Caption x={x + 2} y={y + 124} w={CELL_W - 4} name={cell.name} meaning={cell.meaning} />
          </g>
        );
      })}
    </DiagramSvg>
  );
}

const SINGLE: PatternCell[] = [
  {
    name: 'Молот',
    meaning: 'тень ≥ 2 тел, закрытие вверху',
    candles: [{ o: 50, c: 36, h: 32, l: 116 }],
  },
  {
    name: 'Падающая звезда',
    meaning: 'тень ≥ 2 тел, закрытие внизу',
    candles: [{ o: 98, c: 112, h: 24, l: 116 }],
  },
  {
    name: 'Доджи',
    meaning: 'открытие ≈ закрытие: пауза',
    candles: [{ o: 70, c: 70, h: 30, l: 110, tone: 'muted' }],
  },
  {
    name: 'Бычья марубозу',
    meaning: 'тело без теней: напор покупателей',
    candles: [{ o: 112, c: 28, h: 28, l: 112 }],
  },
  {
    name: 'Медвежья марубозу',
    meaning: 'тело без теней: напор продавцов',
    candles: [{ o: 28, c: 112, h: 28, l: 112 }],
  },
];

/** Pin bars, doji and marubozu with their shape rules, plus the context rule. */
export function SingleCandlePatterns() {
  const cellH = 212;
  const x = 2 + 2 * (CELL_W + 1);
  return (
    <DiagramSvg
      width={360}
      height={cellH * 2}
      title="Одиночные свечные паттерны: молот и падающая звезда — пин-бары с тенью не меньше двух тел и закрытием в дальней трети, доджи — открытие почти равно закрытию, марубозу — тело без теней. Паттерн что-то значит только у уровня и по тренду"
    >
      {SINGLE.map((cell, i) => {
        const cx = 2 + (i % 3) * (CELL_W + 1);
        const y = Math.floor(i / 3) * cellH;
        const c = cell.candles[0];
        return (
          c && (
            <g key={cell.name}>
              <Candle
                x={cx + CELL_W / 2}
                open={y + c.o}
                close={y + c.c}
                high={y + c.h}
                low={y + c.l}
                w={26}
                tone={c.tone}
              />
              <Caption
                x={cx + 2}
                y={y + 124}
                w={CELL_W - 4}
                h={86}
                name={cell.name}
                meaning={cell.meaning}
              />
            </g>
          )
        );
      })}
      <rect
        x={x + 4}
        y={cellH + 14}
        width={CELL_W - 8}
        height={cellH - 28}
        rx={12}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="fill-info-soft stroke-info"
      />
      <foreignObject x={x + 8} y={cellH + 22} width={CELL_W - 16} height={cellH - 44}>
        <div className="flex h-full flex-col justify-center gap-1 text-center text-[13px] leading-tight">
          <span className="font-extrabold text-info">Главное — контекст</span>
          <span className="font-semibold text-text">Паттерн + уровень + тренд = сетап.</span>
          <span className="font-semibold text-text-muted">Посреди «ниоткуда» — шум.</span>
        </div>
      </foreignObject>
    </DiagramSvg>
  );
}

const COMBOS: PatternCell[] = [
  {
    name: 'Бычье поглощение',
    meaning: 'разворот вверх',
    candles: [
      { o: 58, c: 82, h: 52, l: 88 },
      { o: 92, c: 40, h: 34, l: 98 },
    ],
  },
  {
    name: 'Медвежье поглощение',
    meaning: 'разворот вниз',
    candles: [
      { o: 82, c: 58, h: 52, l: 88 },
      { o: 40, c: 92, h: 34, l: 98 },
    ],
  },
  {
    name: 'Inside bar',
    meaning: 'сжатие: ждём пробой',
    candles: [
      { o: 100, c: 38, h: 28, l: 108 },
      { o: 74, c: 60, h: 52, l: 84, tone: 'muted' },
    ],
    marks: (
      <>
        <Line x1={10} x2={108} y1={28} y2={28} tone="info" width={1.5} />
        <Line x1={10} x2={108} y1={108} y2={108} tone="info" width={1.5} />
      </>
    ),
  },
  {
    name: 'Утренняя звезда',
    meaning: 'разворот вверх',
    candles: [
      { o: 24, c: 84, h: 20, l: 88 },
      { o: 98, c: 94, h: 90, l: 108, tone: 'muted' },
      { o: 88, c: 40, h: 36, l: 92 },
    ],
  },
  {
    name: 'Вечерняя звезда',
    meaning: 'разворот вниз',
    candles: [
      { o: 104, c: 44, h: 40, l: 108 },
      { o: 30, c: 34, h: 20, l: 38, tone: 'muted' },
      { o: 40, c: 88, h: 36, l: 92 },
    ],
  },
  {
    name: 'Твизер-дно',
    meaning: 'два равных минимума',
    candles: [
      { o: 34, c: 84, h: 28, l: 108 },
      { o: 84, c: 40, h: 34, l: 108 },
    ],
    marks: <Line x1={24} x2={94} y1={108} y2={108} tone="bull" width={1.5} />,
  },
];

/** Engulfing, inside bar, morning/evening star and tweezer bottom. */
export function TwoThreeCandlePatterns() {
  return (
    <CandleGrid
      cells={COMBOS}
      cellH={180}
      candleW={16}
      title="Свечные комбинации: бычье и медвежье поглощение (тело второй свечи перекрывает тело первой), inside bar (свеча внутри диапазона предыдущей — сжатие), утренняя и вечерняя звезда из трёх свечей, твизер — два равных экстремума подряд"
    />
  );
}

function Measure({
  x,
  y1,
  y2,
  arrow,
  label,
}: {
  x: number;
  y1: number;
  y2: number;
  arrow: string;
  label: string;
}) {
  return (
    <g>
      <Arrow x1={x} y1={y1} x2={x} y2={y2} arrow={arrow} tone="info" width={1.5} both />
      <Txt x={x + 6} y={(y1 + y2) / 2 + 5} size={13} bold tone="info">
        {label}
      </Txt>
    </g>
  );
}

const DOUBLE_TOP: Pt[] = [
  [10, 176],
  [70, 56],
  [110, 116],
  [150, 56],
  [196, 116],
  [208, 132],
  [222, 118],
  [300, 176],
];

const HEAD_SHOULDERS: Pt[] = [
  [10, 170],
  [50, 86],
  [82, 116],
  [120, 46],
  [158, 116],
  [196, 86],
  [222, 116],
  [232, 132],
  [246, 120],
  [320, 186],
];

/** Double top and head & shoulders: neckline, confirmation, stop and measured target. */
export function ReversalPatterns() {
  const second = 214;
  return (
    <DiagramSvg
      width={360}
      height={second + 214}
      title="Фигуры разворота. Двойная вершина: два максимума на одном уровне, подтверждение — закрытие под линией шеи, стоп над вершинами, цель — высота фигуры вниз от шеи. Голова и плечи: средний максимум выше крайних, те же шея, стоп за правым плечом и цель по высоте"
    >
      {({ arrow }) => (
        <>
          {/* Double top */}
          <Txt x={10} y={18} size={14} bold>
            Двойная вершина
          </Txt>
          <Line x1={50} x2={176} y1={44} y2={44} tone="bear" />
          <Txt x={180} y={48} size={13} bold tone="bear">
            стоп — над вершинами
          </Txt>
          <Line x1={30} x2={280} y1={116} y2={116} tone="info" dashed={false} />
          <Txt x={352} y={112} size={13} bold tone="info" textAnchor="end">
            линия шеи
          </Txt>
          <Line x1={180} x2={352} y1={176} y2={176} tone="bull" />
          <Txt x={352} y={196} size={13} bold tone="bull" textAnchor="end">
            цель = h вниз от шеи
          </Txt>
          <Path pts={DOUBLE_TOP} />
          <circle cx={208} cy={132} r={6} className="fill-bear" />
          <Txt x={130} y={160} size={13} bold tone="bear" textAnchor="middle">
            закрытие под шеей
          </Txt>
          <Measure x={262} y1={58} y2={114} arrow={arrow} label="h" />
          <Measure x={326} y1={118} y2={174} arrow={arrow} label="h" />

          {/* Head and shoulders */}
          <g transform={`translate(0 ${second})`}>
            <Txt x={10} y={18} size={14} bold>
              Голова и плечи
            </Txt>
            <Txt x={50} y={76} size={13} textAnchor="middle" tone="muted">
              плечо
            </Txt>
            <Txt x={120} y={38} size={13} textAnchor="middle" bold>
              голова
            </Txt>
            <Txt x={196} y={60} size={13} textAnchor="middle" tone="muted">
              плечо
            </Txt>
            <Line x1={178} x2={236} y1={70} y2={70} tone="bear" />
            <Txt x={240} y={74} size={13} bold tone="bear">
              стоп
            </Txt>
            <Line x1={30} x2={290} y1={116} y2={116} tone="info" dashed={false} />
            <Txt x={352} y={112} size={13} bold tone="info" textAnchor="end">
              линия шеи
            </Txt>
            <Line x1={200} x2={352} y1={186} y2={186} tone="bull" />
            <Txt x={352} y={206} size={13} bold tone="bull" textAnchor="end">
              цель = h вниз от шеи
            </Txt>
            <Path pts={HEAD_SHOULDERS} />
            <circle cx={232} cy={132} r={6} className="fill-bear" />
            <Measure x={120} y1={50} y2={114} arrow={arrow} label="h" />
            <Txt x={352} y={18} size={13} bold tone="bear" textAnchor="end">
              шея цела — фигуры нет
            </Txt>
          </g>
        </>
      )}
    </DiagramSvg>
  );
}

interface Continuation {
  name: string;
  meaning: string;
  path: Pt[];
  lines: [Pt, Pt][];
  breakout: [Pt, Pt];
}

const CONTINUATION: Continuation[] = [
  {
    name: 'Флаг',
    meaning: 'наклонный канал против импульса',
    path: [
      [12, 136],
      [44, 40],
      [62, 64],
      [74, 50],
      [90, 72],
      [102, 58],
      [116, 80],
    ],
    lines: [
      [
        [44, 38],
        [122, 62],
      ],
      [
        [56, 66],
        [124, 86],
      ],
    ],
    breakout: [
      [116, 80],
      [160, 26],
    ],
  },
  {
    name: 'Вымпел',
    meaning: 'маленький сходящийся треугольник',
    path: [
      [12, 136],
      [44, 40],
      [58, 82],
      [74, 50],
      [88, 74],
      [102, 58],
      [114, 68],
    ],
    lines: [
      [
        [44, 38],
        [124, 62],
      ],
      [
        [52, 88],
        [124, 66],
      ],
    ],
    breakout: [
      [114, 68],
      [160, 26],
    ],
  },
  {
    name: 'Восходящий треугольник',
    meaning: 'ровный верх, растущие минимумы',
    path: [
      [12, 136],
      [40, 52],
      [60, 116],
      [82, 52],
      [100, 94],
      [118, 52],
      [128, 72],
    ],
    lines: [
      [
        [34, 52],
        [136, 52],
      ],
      [
        [50, 124],
        [136, 68],
      ],
    ],
    breakout: [
      [128, 72],
      [162, 20],
    ],
  },
  {
    name: 'Падающий клин',
    meaning: 'сужается вниз, пробой вверх',
    path: [
      [12, 136],
      [40, 40],
      [56, 84],
      [74, 58],
      [92, 98],
      [106, 78],
      [120, 104],
    ],
    lines: [
      [
        [38, 38],
        [130, 86],
      ],
      [
        [50, 80],
        [130, 110],
      ],
    ],
    breakout: [
      [120, 104],
      [162, 40],
    ],
  },
];

/** Flag, pennant, ascending triangle and falling wedge as pauses in an up-trend. */
export function ContinuationPatterns() {
  const cellW = 178;
  const cellH = 196;
  return (
    <DiagramSvg
      width={360}
      height={cellH * 2}
      title="Фигуры продолжения в восходящем тренде: флаг, вымпел, восходящий треугольник и падающий клин — паузы после импульса. Внутри фигуры объём снижается, пробой по направлению тренда идёт на росте объёма, цель — примерно высота флагштока"
    >
      {({ arrow }) =>
        CONTINUATION.map((p, i) => {
          const x = 2 + (i % 2) * (cellW + 2);
          const y = Math.floor(i / 2) * cellH;
          return (
            <g key={p.name}>
              <g transform={`translate(${x} ${y})`}>
                {p.lines.map(([[x1, y1], [x2, y2]], j) => (
                  <Line key={j} x1={x1} y1={y1} x2={x2} y2={y2} tone="info" width={1.5} />
                ))}
                <Path pts={p.path} />
                <Arrow
                  x1={p.breakout[0][0]}
                  y1={p.breakout[0][1]}
                  x2={p.breakout[1][0]}
                  y2={p.breakout[1][1]}
                  arrow={arrow}
                  tone="bull"
                  width={3}
                />
              </g>
              <Caption
                x={x + 4}
                y={y + 142}
                w={cellW - 8}
                h={50}
                name={p.name}
                meaning={p.meaning}
              />
            </g>
          );
        })
      }
    </DiagramSvg>
  );
}

const CHANNEL: Pt[] = [
  [10, 170],
  [60, 110],
  [90, 150],
  [140, 90],
  [170, 130],
  [220, 70],
  [250, 110],
  [300, 50],
  [340, 84],
];

const STEEP: Pt[] = [
  [10, 180],
  [40, 128],
  [60, 150],
  [96, 96],
  [124, 134],
  [166, 76],
  [196, 116],
  [244, 56],
  [272, 96],
  [322, 36],
];

/** A correct trendline with channel vs a too-steep line whose break is not a reversal. */
export function TrendlineRules() {
  const second = 216;
  const lows = [0, 2, 4, 6].map((i) => CHANNEL[i]).filter((p): p is Pt => p !== undefined);
  return (
    <DiagramSvg
      width={360}
      height={second + 206}
      title="Трендовая линия в восходящем тренде строится по минимумам: две точки дают линию, третье касание её подтверждает; параллельная линия через максимумы образует канал. Слишком крутая линия быстро ломается, но пробой линии — ещё не разворот, пока сохраняются более высокие минимумы"
    >
      {/* Correct line and channel */}
      <Txt x={10} y={18} size={14} bold tone="bull">
        Так: по минимумам + канал
      </Txt>
      <Line x1={0} y1={172.5} x2={360} y2={82.5} tone="bull" dashed={false} />
      <Line x1={20} y1={120} x2={360} y2={35} tone="info" />
      <Txt x={352} y={30} size={13} bold tone="info" textAnchor="end">
        канал
      </Txt>
      <Path pts={CHANNEL} />
      {lows.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5} className={i < 2 ? 'fill-bull' : 'fill-info'} />
          <Txt x={x + 4} y={y + 22} size={13} bold tone={i < 2 ? 'bull' : 'info'}>
            {String(i + 1)}
          </Txt>
        </g>
      ))}
      <Txt x={352} y={188} size={13} bold textAnchor="end">
        2 точки — линия, 3-я — подтверждение
      </Txt>

      {/* Too steep line */}
      <g transform={`translate(0 ${second})`}>
        <Txt x={10} y={18} size={14} bold tone="bear">
          Слишком круто
        </Txt>
        <Line x1={0} y1={186} x2={180} y2={78} tone="bear" dashed={false} />
        <Path pts={STEEP} />
        {[4, 6, 8].map((i) => {
          const p = STEEP[i];
          return p && <circle key={i} cx={p[0]} cy={p[1]} r={5} className="fill-bull" />;
        })}
        {/* where the price closes under the line */}
        <circle cx={112.6} cy={118.5} r={6} className="fill-bear" />
        <Txt x={130} y={172} size={13} bold tone="bear">
          линия сломана…
        </Txt>
        <Txt x={352} y={132} size={13} bold tone="bull" textAnchor="end">
          …но минимумы растут:
        </Txt>
        <Txt x={352} y={150} size={13} bold tone="bull" textAnchor="end">
          тренд жив
        </Txt>
      </g>
    </DiagramSvg>
  );
}

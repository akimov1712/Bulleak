import { Arrow, Box, Candle, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

function Leader({
  x1,
  x2,
  y,
  tone = 'muted',
}: {
  x1: number;
  x2: number;
  y: number;
  tone?: DiagramTone;
}) {
  return (
    <line
      x1={x1}
      x2={x2}
      y1={y}
      y2={y}
      strokeWidth={1.5}
      strokeDasharray="3 3"
      className={tone === 'muted' ? 'stroke-text-muted' : 'stroke-text'}
    />
  );
}

/** Bullish and bearish candle with OHLC, body and wicks labelled. */
export function CandleAnatomy() {
  const high = 40;
  const low = 220;
  const a = 70;
  const b = 170;
  return (
    <DiagramSvg
      width={360}
      height={260}
      title="Анатомия свечи: у бычьей (зелёной) закрытие выше открытия, у медвежьей (красной) — ниже. Тело между открытием и закрытием, тени до максимума и минимума"
    >
      <Candle x={96} open={b} close={a} high={high} low={low} w={44} />
      <Candle x={264} open={a} close={b} high={high} low={low} w={44} />
      {/* bullish labels (left) */}
      <Leader x1={40} x2={70} y={high} />
      <Txt x={36} y={high + 5} textAnchor="end" size={13}>
        High
      </Txt>
      <Leader x1={40} x2={72} y={a} />
      <Txt x={36} y={a + 5} textAnchor="end" size={13} bold tone="bull">
        Close
      </Txt>
      <Leader x1={40} x2={72} y={b} />
      <Txt x={36} y={b + 5} textAnchor="end" size={13} bold tone="bull">
        Open
      </Txt>
      <Leader x1={40} x2={70} y={low} />
      <Txt x={36} y={low + 5} textAnchor="end" size={13}>
        Low
      </Txt>
      {/* bearish labels (right) */}
      <Leader x1={290} x2={322} y={a} />
      <Txt x={326} y={a + 5} size={13} bold tone="bear">
        Open
      </Txt>
      <Leader x1={290} x2={322} y={b} />
      <Txt x={326} y={b + 5} size={13} bold tone="bear">
        Close
      </Txt>
      {/* middle captions */}
      <Txt x={180} y={high + 12} textAnchor="middle" size={13} tone="muted">
        верхняя тень
      </Txt>
      <Txt x={180} y={(a + b) / 2 + 5} textAnchor="middle" size={14} bold>
        тело
      </Txt>
      <Txt x={180} y={low - 4} textAnchor="middle" size={13} tone="muted">
        нижняя тень
      </Txt>
      <Txt x={96} y={250} textAnchor="middle" bold tone="bull">
        Бычья
      </Txt>
      <Txt x={264} y={250} textAnchor="middle" bold tone="bear">
        Медвежья
      </Txt>
    </DiagramSvg>
  );
}

const SHAPES = [
  { name: 'Большое зелёное тело', meaning: 'покупатели сильнее', o: 110, c: 30, h: 24, l: 116 },
  { name: 'Большое красное тело', meaning: 'продавцы сильнее', o: 30, c: 110, h: 24, l: 116 },
  {
    name: 'Доджи',
    meaning: 'равновесие, нерешительность',
    o: 70,
    c: 70,
    h: 26,
    l: 114,
    tone: 'muted' as const,
  },
  { name: 'Длинная нижняя тень', meaning: 'падение выкупили', o: 44, c: 36, h: 30, l: 116 },
  { name: 'Длинная верхняя тень', meaning: 'рост отбили продавцы', o: 102, c: 110, h: 24, l: 114 },
  { name: 'Маленькое тело', meaning: 'слабое движение', o: 76, c: 64, h: 50, l: 92 },
];

/** Six common candle shapes and what they say about the fight between sides. */
export function CandleShapes() {
  const cellW = 118;
  const cellH = 196;
  return (
    <DiagramSvg
      width={360}
      height={cellH * 2}
      title="Шесть форм свечей: большое зелёное тело, большое красное тело, доджи, длинная нижняя тень, длинная верхняя тень, маленькое тело — и что каждая говорит о борьбе покупателей и продавцов"
    >
      {SHAPES.map((s, i) => {
        const x = 2 + (i % 3) * (cellW + 1);
        const y = Math.floor(i / 3) * cellH;
        return (
          <g key={s.name}>
            <Candle
              x={x + cellW / 2}
              open={y + s.o}
              close={y + s.c}
              high={y + s.h}
              low={y + s.l}
              w={24}
              tone={s.tone}
            />
            <foreignObject x={x + 2} y={y + 124} width={cellW - 4} height={70}>
              <div className="flex flex-col gap-0.5 text-center text-[13px] leading-tight">
                <span className="font-extrabold text-text">{s.name}</span>
                <span className="font-semibold text-text-muted">{s.meaning}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

const FOUR_H = [
  [100, 103, 99, 102],
  [102, 106, 101, 105],
  [105, 105.5, 100, 101],
  [101, 102, 97, 98],
  [98, 101, 96, 100],
  [100, 104, 99, 103],
] as const;

/** Six 4H candles aggregate into one daily candle. */
export function TfAggregation() {
  const py = (p: number) => 30 + (107 - p) * 15;
  const daily = {
    o: FOUR_H[0][0],
    h: Math.max(...FOUR_H.map((c) => c[1])),
    l: Math.min(...FOUR_H.map((c) => c[2])),
    c: FOUR_H[5][3],
  };
  return (
    <DiagramSvg
      width={360}
      height={272}
      title="Шесть свечей 4H складываются в одну дневную: открытие — первой свечи, закрытие — последней, максимум и минимум — крайние за весь день"
    >
      {({ arrow }) => (
        <>
          <Txt x={100} y={18} textAnchor="middle" size={13} bold>
            6 свечей 4H
          </Txt>
          {FOUR_H.map(([o, h, l, c], i) => (
            <Candle
              key={i}
              x={22 + i * 32}
              open={py(o)}
              close={py(c)}
              high={py(h)}
              low={py(l)}
              w={16}
            />
          ))}
          <rect
            x={6}
            y={py(daily.h) - 6}
            width={188}
            height={py(daily.l) - py(daily.h) + 12}
            rx={10}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="stroke-text-muted"
          />
          <Arrow x1={202} y1={py(101.5)} x2={236} y2={py(101.5)} arrow={arrow} tone="text" />
          <Txt x={290} y={18} textAnchor="middle" size={13} bold>
            1 свеча 1D
          </Txt>
          <Candle
            x={272}
            open={py(daily.o)}
            close={py(daily.c)}
            high={py(daily.h)}
            low={py(daily.l)}
            w={30}
          />
          <Txt x={294} y={py(daily.h) + 5} size={13}>
            H — макс.
          </Txt>
          <Txt x={294} y={py(daily.c) + 5} size={13} tone="bull" bold>
            C — посл.
          </Txt>
          <Txt x={294} y={py(daily.o) + 5} size={13} tone="bull" bold>
            O — перв.
          </Txt>
          <Txt x={294} y={py(daily.l) + 5} size={13}>
            L — мин.
          </Txt>
          <foreignObject x={6} y={py(daily.l) + 20} width={348} height={48}>
            <div className="text-center text-[13px] leading-snug font-semibold text-text-muted">
              Open — первой 4H-свечи, Close — последней, High и Low — крайние за все шесть
            </div>
          </foreignObject>
        </>
      )}
    </DiagramSvg>
  );
}

const ZIG: { x: number; y: number; label?: string; tone?: DiagramTone; below?: boolean }[] = [
  { x: 10, y: 250 },
  { x: 58, y: 170, label: 'H', tone: 'muted' },
  { x: 92, y: 212, label: 'HL', tone: 'bull', below: true },
  { x: 140, y: 120, label: 'HH', tone: 'bull' },
  { x: 174, y: 165, label: 'HL', tone: 'bull', below: true },
  { x: 222, y: 72, label: 'HH', tone: 'bull' },
  { x: 258, y: 196, label: '', below: true },
  { x: 296, y: 128, label: 'LH', tone: 'bear' },
  { x: 344, y: 236, label: 'LL', tone: 'bear', below: true },
];

/** Up-trend (HH/HL) with breaks of structure, then a break below the last HL. */
export function MarketStructure() {
  const pts = ZIG.map((p) => `${p.x},${p.y}`).join(' ');
  const lastHl = ZIG[4];
  const bos = (from: (typeof ZIG)[number] | undefined, toX: number) =>
    from && (
      <g>
        <line
          x1={from.x}
          x2={toX}
          y1={from.y}
          y2={from.y}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          className="stroke-info"
        />
        <Txt x={toX + 2} y={from.y + 4} size={12} bold tone="info">
          BOS
        </Txt>
      </g>
    );
  return (
    <DiagramSvg
      width={360}
      height={290}
      title="Структура рынка: в восходящем тренде каждый максимум (HH) и минимум (HL) выше предыдущих, пробой прошлого максимума — BOS. Закрытие ниже последнего HL — слом структуры, дальше LH и LL"
    >
      {bos(ZIG[1], 118)}
      {bos(ZIG[3], 200)}
      {lastHl && (
        <g>
          <line
            x1={lastHl.x}
            x2={290}
            y1={lastHl.y}
            y2={lastHl.y}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="stroke-bear"
          />
          <Txt x={258} y={216} size={13} bold tone="bear" textAnchor="middle">
            слом структуры
          </Txt>
          <Txt x={258} y={232} size={13} tone="bear" textAnchor="middle">
            ниже последнего HL
          </Txt>
        </g>
      )}
      <polyline
        points={pts}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        className="stroke-text"
      />
      {ZIG.map((p, i) =>
        p.label ? (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              className={
                p.tone === 'bear'
                  ? 'fill-bear'
                  : p.tone === 'bull'
                    ? 'fill-bull'
                    : 'fill-text-muted'
              }
            />
            <Txt x={p.x} y={p.below ? p.y + 20 : p.y - 10} textAnchor="middle" bold tone={p.tone}>
              {p.label}
            </Txt>
          </g>
        ) : null,
      )}
      <Txt x={10} y={24} size={13} bold tone="bull">
        Восходящий тренд
      </Txt>
      <Txt x={350} y={24} size={13} bold tone="bear" textAnchor="end">
        Нисходящий
      </Txt>
    </DiagramSvg>
  );
}

/** Price bouncing between a support and a resistance zone. */
export function SupportResistance() {
  const path = [
    [8, 150],
    [44, 64],
    [80, 190],
    [118, 70],
    [156, 196],
    [196, 60],
    [236, 188],
    [276, 72],
    [316, 150],
    [352, 110],
  ];
  const touchesTop = [1, 3, 5, 7];
  const touchesBottom = [2, 4, 6];
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Поддержка — зона снизу, где покупатели останавливали падение; сопротивление — зона сверху, где продавцы останавливали рост. Уровень — это зона, а не тонкая линия"
    >
      <rect x={0} y={48} width={360} height={30} className="fill-bear-soft" />
      <rect x={0} y={180} width={360} height={30} className="fill-bull-soft" />
      <Txt x={352} y={42} textAnchor="end" size={13} bold tone="bear">
        сопротивление — продавцы
      </Txt>
      <Txt x={352} y={230} textAnchor="end" size={13} bold tone="bull">
        поддержка — покупатели
      </Txt>
      <polyline
        points={path.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        className="stroke-text"
      />
      {touchesTop.map((i) => (
        <circle key={`t${i}`} cx={path[i]?.[0]} cy={path[i]?.[1]} r={5} className="fill-bear" />
      ))}
      {touchesBottom.map((i) => (
        <circle key={`b${i}`} cx={path[i]?.[0]} cy={path[i]?.[1]} r={5} className="fill-bull" />
      ))}
      <Txt x={8} y={20} size={13} tone="muted">
        Касания в пределах зоны, а не точно в одну цену
      </Txt>
    </DiagramSvg>
  );
}

/** Broken resistance becomes support on the retest. */
export function RoleReversal() {
  const path = [
    [8, 200],
    [52, 120],
    [86, 176],
    [124, 118],
    [150, 160],
    [196, 58],
    [236, 104],
    [290, 40],
    [352, 24],
  ];
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Флип уровня: цена дважды упирается в сопротивление, пробивает его, возвращается сверху на ретест и отталкивается — бывшее сопротивление стало поддержкой"
    >
      {({ arrow }) => (
        <>
          <rect x={0} y={102} width={360} height={26} className="fill-warn-soft" />
          <Txt x={8} y={96} size={13} bold tone="bear">
            было сопротивлением
          </Txt>
          <Txt x={352} y={148} size={13} bold tone="bull" textAnchor="end">
            стало поддержкой
          </Txt>
          <polyline
            points={path.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            strokeWidth={3}
            strokeLinejoin="round"
            className="stroke-text"
          />
          <circle cx={236} cy={104} r={6} className="fill-bull" />
          <Txt x={170} y={212} textAnchor="middle" size={13} bold tone="bull">
            ретест
          </Txt>
          <Arrow x1={180} y1={196} x2={228} y2={116} arrow={arrow} tone="bull" />
          <Txt x={172} y={40} textAnchor="middle" size={13} bold tone="info">
            пробой
          </Txt>
          <Arrow x1={172} y1={46} x2={172} y2={92} arrow={arrow} tone="info" />
        </>
      )}
    </DiagramSvg>
  );
}

const BREAKOUT = [
  { o: 150, c: 140, v: 22 },
  { o: 140, c: 146, v: 18 },
  { o: 146, c: 132, v: 24 },
  { o: 132, c: 138, v: 20 },
  { o: 138, c: 96, v: 0 },
  { o: 96, c: 84, v: 30 },
];

/** Breakout on high volume vs breakout on low volume. */
export function VolumeConfirmation() {
  const panel = (x0: number, strong: boolean) => {
    const level = 120;
    return (
      <g>
        <Box x={x0} y={4} w={172} h={250} tone={strong ? 'bull' : 'warn'} soft />
        <line
          x1={x0 + 8}
          x2={x0 + 164}
          y1={level}
          y2={level}
          strokeWidth={2}
          strokeDasharray="5 4"
          className="stroke-bear"
        />
        {BREAKOUT.map((c, i) => {
          const x = x0 + 22 + i * 26;
          const breakout = i === 4;
          const vol = breakout ? (strong ? 64 : 16) : c.v;
          const bull = c.c < c.o;
          return (
            <g key={i}>
              <Candle
                x={x}
                open={c.o}
                close={c.c}
                high={Math.min(c.o, c.c) - 6}
                low={Math.max(c.o, c.c) + 6}
                w={14}
              />
              <rect
                x={x - 8}
                y={236 - vol}
                width={16}
                height={vol}
                rx={2}
                className={
                  breakout
                    ? strong
                      ? 'fill-bull'
                      : 'fill-warn'
                    : bull
                      ? 'fill-bull-soft stroke-bull'
                      : 'fill-bear-soft stroke-bear'
                }
                strokeWidth={1}
              />
            </g>
          );
        })}
        <Txt x={x0 + 86} y={28} textAnchor="middle" size={14} bold tone={strong ? 'bull' : 'warn'}>
          {strong ? 'Объём высокий' : 'Объём низкий'}
        </Txt>
        <Txt x={x0 + 86} y={46} textAnchor="middle" size={13} tone="muted">
          {strong ? 'пробою больше веры' : 'пробой сомнителен'}
        </Txt>
        <Txt x={x0 + 10} y={level - 6} size={12} tone="bear">
          уровень
        </Txt>
      </g>
    );
  };
  return (
    <DiagramSvg
      width={360}
      height={260}
      title="Подтверждение объёмом: пробой уровня на высоком объёме надёжнее, пробой на низком объёме чаще оказывается ложным"
    >
      {panel(4, true)}
      {panel(184, false)}
    </DiagramSvg>
  );
}

import type { ReactNode } from 'react';
import { ema, sma } from '@/lib/indicators/indicators';
import { Box, Candle, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

type Pt = readonly [number, number];
type Series = readonly (number | null)[];
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const STROKE: Partial<Record<DiagramTone, string>> = {
  text: 'stroke-text',
  muted: 'stroke-text-muted',
  info: 'stroke-info',
  warn: 'stroke-warn',
  epic: 'stroke-epic',
  bull: 'stroke-bull',
  bear: 'stroke-bear',
};

function Poly({
  pts,
  tone = 'text',
  width = 2,
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
      strokeDasharray={dashed ? '5 4' : undefined}
      className={STROKE[tone] ?? 'stroke-text'}
    />
  );
}

/** Map a series (nulls skipped) to SVG points inside a box; x spreads over the whole length. */
function fit(series: Series, box: Rect, min: number, max: number): Pt[] {
  const n = series.length;
  const out: Pt[] = [];
  series.forEach((v, i) => {
    if (v === null) return;
    out.push([box.x + (i / (n - 1)) * box.w, box.y + box.h - ((v - min) / (max - min)) * box.h]);
  });
  return out;
}

const range = (s: Series) => {
  const v = s.filter((x): x is number => x !== null);
  return [Math.min(...v), Math.max(...v)] as const;
};

/** Deterministic smooth "price": rise, top, fall. */
const PRICE: number[] = Array.from({ length: 60 }, (_, i) => {
  const trend = i < 34 ? i * 1.1 : 34 * 1.1 - (i - 34) * 1.3;
  return 100 + trend + Math.sin(i / 2.2) * 2.5;
});

interface Family {
  title: string;
  examples: string;
  question: string;
  tone: DiagramTone;
  draw: (b: Rect) => ReactNode;
}

const FAMILIES: Family[] = [
  {
    title: 'Трендовые',
    examples: 'SMA, EMA',
    question: 'Куда идёт тренд?',
    tone: 'info',
    draw: (b) => (
      <>
        <Poly pts={fit(PRICE, b, 95, 145)} tone="muted" width={1.5} />
        <Poly pts={fit(sma(PRICE, 10), b, 95, 145)} tone="info" width={2.5} />
      </>
    ),
  },
  {
    title: 'Осцилляторы',
    examples: 'RSI, MACD',
    question: 'Силён ли импульс?',
    tone: 'epic',
    draw: (b) => {
      const osc = PRICE.map((_, i) => 50 + Math.sin(i / 3) * 32);
      return (
        <>
          {[0.3, 0.7].map((f) => (
            <line
              key={f}
              x1={b.x}
              x2={b.x + b.w}
              y1={b.y + b.h * f}
              y2={b.y + b.h * f}
              strokeWidth={1}
              strokeDasharray="3 3"
              className="stroke-text-muted"
            />
          ))}
          <Poly pts={fit(osc, b, 0, 100)} tone="epic" width={2.5} />
        </>
      );
    },
  },
  {
    title: 'Волатильность',
    examples: 'Боллинджер, ATR',
    question: 'Насколько широко ходит цена?',
    tone: 'warn',
    draw: (b) => {
      const mid = sma(PRICE, 8);
      const width = PRICE.map((_, i) => 4 + Math.abs(Math.sin(i / 9)) * 9);
      const up = mid.map((m, i) => (m === null ? null : m + (width[i] ?? 0)));
      const dn = mid.map((m, i) => (m === null ? null : m - (width[i] ?? 0)));
      return (
        <>
          <Poly pts={fit(up, b, 85, 155)} tone="warn" width={1.5} />
          <Poly pts={fit(dn, b, 85, 155)} tone="warn" width={1.5} />
          <Poly pts={fit(PRICE, b, 85, 155)} tone="muted" width={1.5} />
        </>
      );
    },
  },
  {
    title: 'Объёмные',
    examples: 'объём, OBV',
    question: 'Сколько денег в движении?',
    tone: 'bull',
    draw: (b) => (
      <>
        {Array.from({ length: 16 }, (_, k) => {
          const h = 10 + ((k * 37) % 23) + (k === 11 ? 22 : 0);
          return (
            <rect
              key={k}
              x={b.x + k * (b.w / 16)}
              y={b.y + b.h - h}
              width={b.w / 16 - 3}
              height={h}
              rx={1}
              className={k % 4 === 1 ? 'fill-bear' : 'fill-bull'}
              opacity={0.7}
            />
          );
        })}
      </>
    ),
  },
];

/** Four indicator families and the question each one answers; all are computed from OHLCV. */
export function IndicatorFamilies() {
  const cellW = 174;
  const cellH = 168;
  return (
    <DiagramSvg
      width={360}
      height={cellH * 2 + 44}
      title="Четыре семейства индикаторов: трендовые (SMA, EMA) — куда идёт тренд, осцилляторы (RSI, MACD) — силён ли импульс, волатильность (Боллинджер, ATR) — насколько широко ходит цена, объёмные — сколько денег в движении. Все считаются из цен и объёма, поэтому вторичны цене"
    >
      {FAMILIES.map((f, i) => {
        const x = 4 + (i % 2) * (cellW + 4);
        const y = Math.floor(i / 2) * cellH;
        return (
          <g key={f.title}>
            <Box x={x} y={y + 2} w={cellW} h={cellH - 8} tone={f.tone} soft />
            <Txt x={x + 10} y={y + 22} size={14} bold tone={f.tone}>
              {f.title}
            </Txt>
            <Txt x={x + 10} y={y + 39} size={13} tone="muted">
              {f.examples}
            </Txt>
            {f.draw({ x: x + 10, y: y + 50, w: cellW - 20, h: 60 })}
            <foreignObject x={x + 6} y={y + 116} width={cellW - 12} height={42}>
              <div className="text-center text-[13px] leading-tight font-extrabold text-text">
                {f.question}
              </div>
            </foreignObject>
          </g>
        );
      })}
      <foreignObject x={4} y={cellH * 2 - 2} width={352} height={46}>
        <div className="text-center text-[13px] leading-snug font-semibold text-text-muted">
          Все индикаторы считаются из цены и объёма (OHLCV) — они не знают ничего сверх графика
        </div>
      </foreignObject>
    </DiagramSvg>
  );
}

/** Flat, accelerating rise, flattening top, fall — a clear momentum cycle for MACD. */
const MACD_PRICE: number[] = Array.from({ length: 72 }, (_, i) => {
  if (i < 12) return 100 + Math.sin(i) * 0.6;
  if (i < 36) return 100 + ((i - 12) / 24) ** 1.6 * 38;
  if (i < 46) return 138 + (i - 36) * 0.3;
  return 141 - (i - 46) * 1.1;
}).map((v, i) => v + Math.sin(i / 1.7) * 0.8);

/** Price with EMA 12/26 above; MACD line, signal line and histogram below. */
export function MacdAnatomy() {
  const fast = ema(MACD_PRICE, 12);
  const slow = ema(MACD_PRICE, 26);
  const macd: Series = MACD_PRICE.map((_, i) => {
    const f = fast[i] ?? null;
    const s = slow[i] ?? null;
    return f === null || s === null ? null : f - s;
  });
  const start = macd.findIndex((v) => v !== null);
  const signal: Series = [
    ...new Array<null>(start).fill(null),
    ...ema(macd.slice(start) as number[], 9),
  ];
  const hist: Series = macd.map((m, i) => {
    const s = signal[i] ?? null;
    return m === null || s === null ? null : m - s;
  });
  const top: Rect = { x: 10, y: 30, w: 340, h: 116 };
  const bot: Rect = { x: 10, y: 190, w: 340, h: 110 };
  const [lo, hi] = range(MACD_PRICE);
  const [mLo, mHi] = range(macd);
  const lim = Math.max(Math.abs(mLo), Math.abs(mHi)) * 1.15;
  const zeroY = bot.y + bot.h / 2;
  const n = MACD_PRICE.length;
  const px = (i: number) => bot.x + (i / (n - 1)) * bot.w;
  const barW = (bot.w / (n - 1)) * 0.7;
  let peak = 0;
  hist.forEach((v, i) => {
    if (v !== null && v > (hist[peak] ?? -Infinity)) peak = i;
  });
  return (
    <DiagramSvg
      width={360}
      height={330}
      title="Анатомия MACD: линия MACD — разница EMA 12 и EMA 26, сигнальная линия — EMA 9 от MACD, гистограмма — разница MACD и сигнальной. Выше нуля — быстрая EMA выше медленной, импульс бычий; сокращение гистограммы после пика — импульс слабеет, хотя цена ещё растёт"
    >
      <Txt x={10} y={18} size={13} bold>
        Цена и две EMA
      </Txt>
      <Txt x={350} y={18} size={13} bold tone="info" textAnchor="end">
        EMA 12
      </Txt>
      <Txt x={290} y={18} size={13} bold tone="warn" textAnchor="end">
        EMA 26
      </Txt>
      <Poly pts={fit(MACD_PRICE, top, lo - 2, hi + 2)} tone="muted" width={1.5} />
      <Poly pts={fit(fast, top, lo - 2, hi + 2)} tone="info" width={2.5} />
      <Poly pts={fit(slow, top, lo - 2, hi + 2)} tone="warn" width={2.5} />

      <Txt x={10} y={176} size={13} bold>
        MACD (12, 26, 9)
      </Txt>
      <line
        x1={bot.x}
        x2={bot.x + bot.w}
        y1={zeroY}
        y2={zeroY}
        strokeWidth={1}
        className="stroke-text-muted"
      />
      <Txt x={bot.x + 2} y={zeroY + 14} size={12} tone="muted">
        ноль
      </Txt>
      {hist.map((v, i) => {
        if (v === null) return null;
        const h = (v / lim) * (bot.h / 2);
        return (
          <rect
            key={i}
            x={px(i) - barW / 2}
            y={h >= 0 ? zeroY - h : zeroY}
            width={barW}
            height={Math.max(1, Math.abs(h))}
            opacity={h >= 0 && i > peak ? 0.45 : 0.85}
            className={h >= 0 ? 'fill-bull' : 'fill-bear'}
          />
        );
      })}
      <Poly pts={fit(macd, bot, -lim, lim)} tone="info" width={2.5} />
      <Poly pts={fit(signal, bot, -lim, lim)} tone="warn" width={2} dashed />
      <line
        x1={px(peak)}
        x2={px(peak)}
        y1={top.y}
        y2={zeroY}
        strokeWidth={1.5}
        strokeDasharray="3 3"
        className="stroke-epic"
      />
      <Txt x={px(peak) - 6} y={zeroY + 26} size={12} bold tone="epic" textAnchor="end">
        пик гистограммы:
      </Txt>
      <Txt x={px(peak) - 6} y={zeroY + 41} size={12} bold tone="epic" textAnchor="end">
        дальше импульс слабеет
      </Txt>
      <Txt x={10} y={322} size={12} tone="info" bold>
        линия MACD
      </Txt>
      <Txt x={96} y={322} size={12} tone="warn" bold>
        сигнальная
      </Txt>
      <Txt x={176} y={322} size={12} tone="bull" bold>
        гистограмма = разница
      </Txt>
    </DiagramSvg>
  );
}

/** Uptrend with a pullback into a support zone, for the chart templates. */
const TREND: number[] = Array.from({ length: 90 }, (_, i) => {
  const base = 100 + i * 0.55;
  const pullback = i > 70 && i < 82 ? -(i - 70) * 1.1 : i >= 82 ? -12 * 1.1 + (i - 82) * 1.4 : 0;
  return base + pullback + Math.sin(i / 2) * 1.8;
});
const SHOWN = 36;
const FIRST = TREND.length - SHOWN;

function MiniCandles({ box, min, max }: { box: Rect; min: number; max: number }) {
  const py = (v: number) => box.y + box.h - ((v - min) / (max - min)) * box.h;
  const step = box.w / SHOWN;
  return (
    <>
      {TREND.slice(FIRST).map((c, i) => {
        const o = TREND[FIRST + i - 1] ?? c;
        const wick = 0.8 + ((i * 7) % 5) * 0.35;
        return (
          <Candle
            key={i}
            x={box.x + step * (i + 0.5)}
            open={py(o)}
            close={py(c)}
            high={py(Math.max(o, c) + wick)}
            low={py(Math.min(o, c) - wick)}
            w={Math.max(2, step * 0.6)}
          />
        );
      })}
    </>
  );
}

/** A cluttered "Christmas tree" chart vs the course's clean template. */
export function CleanVsCluttered() {
  const shown = (s: Series) => s.slice(FIRST);
  const slow = ema(TREND, 60);
  const [lo, hi] = range([...TREND.slice(FIRST), ...shown(slow)]);
  const min = lo - 3;
  const max = hi + 3;
  // support zone at the pullback low
  const pullbackLow = Math.min(...TREND.slice(FIRST + 20));
  const left: Rect = { x: 10, y: 36, w: 160, h: 120 };
  const right: Rect = { x: 190, y: 36, w: 160, h: 120 };
  const line = (s: Series, box: Rect, tone: DiagramTone, width = 1.5) => (
    <Poly pts={fit(shown(s), box, min, max)} tone={tone} width={width} />
  );
  const pyR = (v: number) => right.y + right.h - ((v - min) / (max - min)) * right.h;
  const zoneTop = pullbackLow + 1.5;
  return (
    <DiagramSvg
      width={360}
      height={300}
      title="Слева перегруженный график: пять скользящих и четыре осциллятора дают противоречивые сигналы и паралич анализа. Справа шаблон курса: свечи, зона поддержки, EMA 50 и EMA 200 и объём — откат к зоне в восходящем тренде виден сразу"
    >
      {/* cluttered */}
      <Box x={2} y={2} w={176} h={296} tone="bear" soft />
      <Txt x={90} y={24} size={14} bold tone="bear" textAnchor="middle">
        «Ёлка»
      </Txt>
      <MiniCandles box={left} min={min} max={max} />
      {line(sma(TREND, 5), left, 'info')}
      {line(sma(TREND, 9), left, 'warn')}
      {line(ema(TREND, 14), left, 'epic')}
      {line(ema(TREND, 21), left, 'bull')}
      {line(sma(TREND, 30), left, 'bear')}
      {['RSI', 'Stoch', 'CCI', 'MACD'].map((name, k) => {
        const y0 = 166 + k * 26;
        return (
          <g key={name}>
            <rect x={8} y={y0} width={164} height={22} rx={4} className="fill-surface" />
            <Poly
              pts={Array.from(
                { length: 26 },
                (_, i) => [12 + i * 4.4, y0 + 11 + Math.sin(i / (1.2 + k * 0.6) + k) * 7] as const,
              )}
              tone={(['epic', 'info', 'warn', 'bull'] as const)[k]}
              width={1.4}
            />
            <Txt x={168} y={y0 + 16} size={12} bold textAnchor="end" tone="muted">
              {name}
            </Txt>
          </g>
        );
      })}
      <Txt x={90} y={288} size={12} bold tone="bear" textAnchor="middle">
        сигналы спорят → паралич
      </Txt>

      {/* clean */}
      <Box x={182} y={2} w={176} h={296} tone="bull" soft />
      <Txt x={270} y={24} size={14} bold tone="bull" textAnchor="middle">
        Шаблон курса
      </Txt>
      <rect
        x={right.x}
        y={pyR(zoneTop)}
        width={right.w}
        height={pyR(pullbackLow - 2.5) - pyR(zoneTop)}
        strokeWidth={1}
        strokeDasharray="4 3"
        className="fill-bull-soft stroke-bull"
      />
      <MiniCandles box={right} min={min} max={max} />
      {line(ema(TREND, 20), right, 'warn', 2)}
      {line(slow, right, 'epic', 2)}
      {TREND.slice(FIRST).map((_, k) => {
        const h = 6 + ((k * 13) % 17) + (k > 22 && k < 30 ? 8 : 0);
        return (
          <rect
            key={k}
            x={right.x + k * (right.w / SHOWN)}
            y={222 - h}
            width={right.w / SHOWN - 1.5}
            height={h}
            rx={1}
            opacity={0.55}
            className="fill-text-muted"
          />
        );
      })}
      <Txt x={196} y={244} size={12} bold tone="warn">
        EMA 50
      </Txt>
      <Txt x={266} y={244} size={12} bold tone="epic">
        EMA 200
      </Txt>
      <Txt x={196} y={262} size={12} bold tone="bull">
        зона
      </Txt>
      <Txt x={266} y={262} size={12} bold tone="muted">
        объём
      </Txt>
      <Txt x={270} y={288} size={12} bold tone="bull" textAnchor="middle">
        решение видно сразу
      </Txt>
    </DiagramSvg>
  );
}

import type { ReactNode } from 'react';
import type { ModuleId } from '@/types/course';
import { cn } from '@/lib/cn';

/**
 * Module cover illustrations: flat white shapes with dark ink on top of the module colour
 * (the parent sets the background). Own SVG art — no photos to download (T-429 decision).
 */

const W = 'fill-white/85';
const W2 = 'fill-white/45';
const INK = 'stroke-on-mod';

function Candle({
  x,
  top,
  bottom,
  body: [b1, b2],
  up,
}: {
  x: number;
  top: number;
  bottom: number;
  body: [number, number];
  up: boolean;
}) {
  return (
    <g>
      <line x1={x} x2={x} y1={top} y2={bottom} strokeWidth={2.5} className={INK} />
      <rect
        x={x - 6}
        y={Math.min(b1, b2)}
        width={12}
        height={Math.abs(b2 - b1)}
        rx={2}
        strokeWidth={2.5}
        className={cn(INK, up ? W : W2)}
      />
    </g>
  );
}

const Ground = () => <ellipse cx={80} cy={110} rx={70} ry={7} className={W2} />;

const scenes: Record<ModuleId, ReactNode> = {
  // Старт: rocket taking off over rising candles
  m00: (
    <>
      <Ground />
      <Candle x={22} top={78} bottom={104} body={[98, 86]} up />
      <Candle x={40} top={66} bottom={96} body={[90, 72]} up />
      <Candle x={58} top={52} bottom={86} body={[80, 58]} up />
      <g transform="rotate(35 108 50)">
        <path
          d="M108 12 C124 30 124 62 116 78 H100 C92 62 92 30 108 12 Z"
          strokeWidth={3}
          className={cn(W, INK)}
        />
        <circle cx={108} cy={42} r={7} strokeWidth={3} className={cn(W2, INK)} />
        <path
          d="M100 66 L88 82 L100 78 Z M116 66 L128 82 L116 78 Z"
          strokeWidth={3}
          className={cn(W2, INK)}
        />
        <path d="M102 80 L108 98 L114 80" strokeWidth={3} className={cn('fill-xp', INK)} />
      </g>
    </>
  ),
  // Основы крипты: coin with ₿ and a chain of blocks
  m01: (
    <>
      <Ground />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={14 + i * 30}
            y={78}
            width={22}
            height={22}
            rx={4}
            strokeWidth={2.5}
            className={cn(W2, INK)}
          />
          {i < 2 && (
            <line
              x1={36 + i * 30}
              x2={44 + i * 30}
              y1={89}
              y2={89}
              strokeWidth={3}
              className={INK}
            />
          )}
        </g>
      ))}
      <circle cx={112} cy={54} r={34} strokeWidth={3} className={cn(W, INK)} />
      <circle cx={112} cy={54} r={26} strokeWidth={2} className={cn('fill-none', INK)} />
      <text
        x={112}
        y={66}
        textAnchor="middle"
        fontSize={34}
        fontWeight={900}
        className="fill-on-mod"
      >
        ₿
      </text>
    </>
  ),
  // Bybit с нуля: terminal window with a buy button
  m02: (
    <>
      <Ground />
      <rect x={20} y={14} width={120} height={86} rx={10} strokeWidth={3} className={cn(W, INK)} />
      <line x1={20} x2={140} y1={30} y2={30} strokeWidth={3} className={INK} />
      {[30, 40, 50].map((x) => (
        <circle key={x} cx={x} cy={22} r={3} className="fill-on-mod" />
      ))}
      <polyline
        points="30,78 46,66 60,70 76,52 90,58"
        fill="none"
        strokeWidth={3}
        className={INK}
      />
      <rect
        x={100}
        y={44}
        width={32}
        height={14}
        rx={5}
        strokeWidth={2.5}
        className={cn('fill-mod-green', INK)}
      />
      <rect
        x={100}
        y={64}
        width={32}
        height={14}
        rx={5}
        strokeWidth={2.5}
        className={cn('fill-mod-red', INK)}
      />
    </>
  ),
  // Чтение графика: candles under a magnifying glass
  m03: (
    <>
      <Ground />
      <Candle x={20} top={40} bottom={90} body={[80, 55]} up={false} />
      <Candle x={40} top={50} bottom={96} body={[60, 86]} up />
      <Candle x={60} top={30} bottom={74} body={[66, 40]} up />
      <circle cx={104} cy={50} r={28} strokeWidth={4} className={cn(W2, INK)} />
      <Candle x={104} top={34} bottom={68} body={[60, 42]} up />
      <line
        x1={124}
        x2={146}
        y1={70}
        y2={94}
        strokeWidth={8}
        strokeLinecap="round"
        className={INK}
      />
    </>
  ),
  // Паттерны и фигуры: head and shoulders
  m04: (
    <>
      <Ground />
      <polyline
        points="10,92 30,60 44,76 70,28 96,76 110,60 130,92 150,100"
        fill="none"
        strokeWidth={4}
        strokeLinejoin="round"
        className={INK}
      />
      <line
        x1={20}
        x2={140}
        y1={78}
        y2={78}
        strokeWidth={2.5}
        strokeDasharray="6 5"
        className={INK}
      />
      <circle cx={30} cy={60} r={6} className={cn(W, INK)} strokeWidth={2.5} />
      <circle cx={70} cy={28} r={8} className={cn(W, INK)} strokeWidth={2.5} />
      <circle cx={110} cy={60} r={6} className={cn(W, INK)} strokeWidth={2.5} />
    </>
  ),
  // Индикаторы: price line with moving average and an oscillator
  m05: (
    <>
      <rect x={14} y={12} width={132} height={60} rx={8} strokeWidth={3} className={cn(W, INK)} />
      <polyline
        points="22,58 40,44 54,50 72,30 90,38 108,22 136,28"
        fill="none"
        strokeWidth={3}
        className={INK}
      />
      <polyline
        points="22,60 44,52 66,44 88,38 110,32 136,30"
        fill="none"
        strokeWidth={3}
        strokeDasharray="5 4"
        className={INK}
      />
      <rect x={14} y={80} width={132} height={30} rx={8} strokeWidth={3} className={cn(W2, INK)} />
      <polyline
        points="22,100 38,86 52,96 70,88 86,104 104,90 120,84 138,96"
        fill="none"
        strokeWidth={3}
        className={INK}
      />
    </>
  ),
  // Продвинутый теханализ: Fibonacci levels
  m06: (
    <>
      <Ground />
      {[20, 40, 56, 72, 96].map((y, i) => (
        <g key={y}>
          <line
            x1={16}
            x2={144}
            y1={y}
            y2={y}
            strokeWidth={2.5}
            strokeDasharray={i === 2 ? undefined : '6 5'}
            className={INK}
          />
        </g>
      ))}
      <rect x={16} y={48} width={128} height={16} className={W2} />
      <polyline
        points="20,96 60,20 92,58 144,14"
        fill="none"
        strokeWidth={4}
        strokeLinejoin="round"
        className={INK}
      />
      <circle cx={92} cy={58} r={6} strokeWidth={3} className={cn('fill-xp', INK)} />
    </>
  ),
  // Фундаментал и контекст: newspaper with a globe
  m07: (
    <>
      <Ground />
      <rect x={14} y={18} width={86} height={82} rx={6} strokeWidth={3} className={cn(W, INK)} />
      <rect x={22} y={26} width={70} height={12} rx={2} className="fill-on-mod" />
      {[48, 58, 68, 78, 88].map((y) => (
        <line
          key={y}
          x1={22}
          x2={y % 20 === 8 ? 72 : 92}
          y1={y}
          y2={y}
          strokeWidth={3}
          className={INK}
        />
      ))}
      <circle cx={118} cy={62} r={28} strokeWidth={3} className={cn(W2, INK)} />
      <ellipse
        cx={118}
        cy={62}
        rx={12}
        ry={28}
        strokeWidth={2.5}
        className={cn('fill-none', INK)}
      />
      <line x1={90} x2={146} y1={62} y2={62} strokeWidth={2.5} className={INK} />
    </>
  ),
  // Фьючерсы и плечо: a lever with long and short arrows
  m08: (
    <>
      <Ground />
      <path d="M80 100 L66 110 H94 Z" strokeWidth={3} className={cn(W, INK)} />
      <line
        x1={16}
        x2={144}
        y1={86}
        y2={70}
        strokeWidth={6}
        strokeLinecap="round"
        className={INK}
      />
      <rect x={112} y={46} width={26} height={20} rx={4} strokeWidth={3} className={cn(W, INK)} />
      <circle cx={36} cy={36} r={20} strokeWidth={3} className={cn(W, INK)} />
      <path
        d="M36 50 V22 M27 31 L36 22 L45 31"
        fill="none"
        strokeWidth={4.5}
        strokeLinecap="round"
        className="stroke-bull"
      />
      <circle cx={80} cy={36} r={20} strokeWidth={3} className={cn(W, INK)} />
      <path
        d="M80 22 V50 M71 41 L80 50 L89 41"
        fill="none"
        strokeWidth={4.5}
        strokeLinecap="round"
        className="stroke-bear"
      />
    </>
  ),
  // Риск-менеджмент: shield with a percent sign
  m09: (
    <>
      <Ground />
      <path
        d="M80 10 L126 26 V58 C126 84 104 100 80 108 C56 100 34 84 34 58 V26 Z"
        strokeWidth={3.5}
        className={cn(W, INK)}
      />
      <text
        x={80}
        y={74}
        textAnchor="middle"
        fontSize={40}
        fontWeight={900}
        className="fill-on-mod"
      >
        1%
      </text>
    </>
  ),
  // Психология: balance of head and heart
  m10: (
    <>
      <Ground />
      <line x1={80} x2={80} y1={24} y2={104} strokeWidth={4} className={INK} />
      <line x1={30} x2={130} y1={34} y2={34} strokeWidth={4} className={INK} />
      <circle cx={80} cy={22} r={6} className="fill-on-mod" />
      <path
        d="M30 34 L16 70 H44 Z M130 34 L116 70 H144 Z"
        fill="none"
        strokeWidth={2.5}
        className={INK}
      />
      <circle cx={30} cy={60} r={14} strokeWidth={3} className={cn(W, INK)} />
      <path d="M22 58 Q26 50 30 58 Q34 50 38 58" fill="none" strokeWidth={2.5} className={INK} />
      <path
        d="M130 72 C112 60 116 46 126 48 C128 48 130 50 130 52 C130 50 132 48 134 48 C144 46 148 60 130 72 Z"
        strokeWidth={3}
        className={cn('fill-mod-red', INK)}
      />
    </>
  ),
  // Своя свинг-стратегия: target with an arrow
  m11: (
    <>
      <Ground />
      {[40, 28, 16].map((r, i) => (
        <circle key={r} cx={70} cy={58} r={r} strokeWidth={3} className={cn(i % 2 ? W2 : W, INK)} />
      ))}
      <circle cx={70} cy={58} r={6} className="fill-on-mod" />
      <line
        x1={70}
        x2={136}
        y1={58}
        y2={20}
        strokeWidth={4}
        strokeLinecap="round"
        className={INK}
      />
      <path d="M128 14 L146 12 L140 30 Z" strokeWidth={2.5} className={cn('fill-xp', INK)} />
    </>
  ),
  // Выход на рынок: flag on a summit
  m12: (
    <>
      <path d="M8 110 L60 40 L82 66 L104 30 L152 110 Z" strokeWidth={3} className={cn(W, INK)} />
      <path d="M92 48 L104 30 L116 50 L108 46 L100 52 Z" className="fill-white" />
      <line x1={104} x2={104} y1={30} y2={4} strokeWidth={3.5} className={INK} />
      <path d="M104 4 L132 10 L104 18 Z" strokeWidth={2.5} className={cn('fill-xp', INK)} />
    </>
  ),
};

export function ModuleCover({ moduleId, className }: { moduleId: ModuleId; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={cn('h-auto shrink-0', className)}>
      {scenes[moduleId]}
    </svg>
  );
}

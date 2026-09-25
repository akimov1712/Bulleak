import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MOODS, type MascotMood } from './moods';

export type { MascotMood };

export interface MascotProps {
  mood?: MascotMood;
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
  /** Accessible description; decorative (aria-hidden) when omitted. */
  title?: string;
}

const C = {
  body: 'var(--mascot-body)',
  shade: 'var(--mascot-body-shade)',
  snout: 'var(--mascot-snout)',
  nostril: 'var(--mascot-nostril)',
  horn: 'var(--mascot-horn)',
  hornShade: 'var(--mascot-horn-shade)',
  ink: 'var(--mascot-ink)',
  eye: 'var(--mascot-eye)',
  cheek: 'var(--mascot-cheek)',
  mouth: 'var(--mascot-mouth)',
  cap: 'var(--mascot-cap)',
  capShade: 'var(--mascot-cap-shade)',
  line: 'var(--mascot-outline)',
};

const stroke = { stroke: C.line, strokeWidth: 4, strokeLinejoin: 'round' as const };

/** Eyes, brows, mouth and extras per mood. Coordinates are in the 200×200 viewBox. */
function Face({ mood }: { mood: MascotMood }): ReactNode {
  const openEye = (cx: number, lookX = 0, lookY = 0, r = 11) => (
    <g>
      <ellipse cx={cx} cy={84} rx={r} ry={r + 2} fill={C.eye} {...stroke} strokeWidth={3} />
      <circle cx={cx + lookX} cy={85 + lookY} r={r * 0.55} fill={C.ink} />
      <circle cx={cx + lookX + 2.5} cy={81 + lookY} r={r * 0.2} fill={C.eye} />
    </g>
  );
  const closedHappy = (cx: number) => (
    <path
      d={`M${cx - 10} 88 Q${cx} 74 ${cx + 10} 88`}
      fill="none"
      stroke={C.ink}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
  const closedFlat = (cx: number) => (
    <path
      d={`M${cx - 10} 86 Q${cx} 92 ${cx + 10} 86`}
      fill="none"
      stroke={C.ink}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
  const mouth = (d: string, fill = 'none') => (
    <path
      d={d}
      fill={fill}
      stroke={C.ink}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  switch (mood) {
    case 'happy':
      return (
        <>
          {openEye(76)}
          {openEye(124)}
          {mouth('M88 138 Q100 148 112 138')}
        </>
      );
    case 'thinking':
      return (
        <>
          {openEye(76, 3, -3)}
          {openEye(124, 3, -3)}
          <path
            d="M112 64 Q124 57 136 63"
            fill="none"
            stroke={C.ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {mouth('M90 141 q5 -4 10 0 q5 4 10 0')}
          <g fill="var(--text-muted)">
            <circle cx={150} cy={20} r={4} />
            <circle cx={161} cy={8} r={5.5} />
            <circle cx={175} cy={-6} r={7} />
          </g>
        </>
      );
    case 'cheering':
      return (
        <>
          {closedHappy(76)}
          {closedHappy(124)}
          {mouth('M84 134 Q100 158 116 134 Z', C.mouth)}
          <g fill="var(--xp)" stroke={C.line} strokeWidth={2}>
            <path d="M28 40 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" />
            <path d="M170 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          </g>
        </>
      );
    case 'sad':
      return (
        <>
          <path d="M64 70 L86 76" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
          <path d="M136 70 L114 76" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
          {openEye(76, 0, 3, 10)}
          {openEye(124, 0, 3, 10)}
          {mouth('M89 146 Q100 136 111 146')}
          <path d="M132 96 q-5 9 0 13 q5 -4 0 -13z" fill="var(--info)" />
        </>
      );
    case 'sleeping':
      return (
        <>
          {closedFlat(76)}
          {closedFlat(124)}
          {mouth('M94 141 Q100 145 106 141')}
          <g fill="var(--text-muted)" fontFamily="var(--font-sans)" fontWeight={900}>
            <text x={150} y={22} fontSize={24}>
              Z
            </text>
            <text x={172} y={4} fontSize={17}>
              z
            </text>
          </g>
        </>
      );
    case 'pointing':
      return (
        <>
          {openEye(76, 4, 0)}
          {openEye(124, 4, 0)}
          {mouth('M88 137 Q102 149 114 136')}
        </>
      );
    case 'shocked':
      return (
        <>
          {openEye(76, 0, 0, 13)}
          {openEye(124, 0, 0, 13)}
          <ellipse cx={100} cy={142} rx={8} ry={10} fill={C.mouth} stroke={C.ink} strokeWidth={4} />
          <path d="M150 64 q-6 10 0 15 q6 -5 0 -15z" fill="var(--info)" />
        </>
      );
  }
}

/** Arms differ per mood (raised, pointing, on chin…). Drawn behind the head. */
function Arms({ mood }: { mood: MascotMood }): ReactNode {
  const arm = (d: string) => (
    <path d={d} fill="none" stroke={C.line} strokeWidth={20} strokeLinecap="round" />
  );
  const armFill = (d: string) => (
    <path d={d} fill="none" stroke={C.body} strokeWidth={13} strokeLinecap="round" />
  );
  const pair = (d: string) => (
    <>
      {arm(d)}
      {armFill(d)}
    </>
  );
  const { arms } = MOODS[mood];
  switch (arms) {
    case 'up':
      return (
        <>
          {pair('M58 160 L30 118')}
          {pair('M142 160 L170 118')}
        </>
      );
    case 'point':
      return (
        <>
          {pair('M58 165 L42 188')}
          {pair('M142 160 L186 142')}
        </>
      );
    case 'chin':
      return (
        <>
          {pair('M58 165 L42 188')}
          {pair('M142 168 L112 160')}
        </>
      );
    case 'down':
      return (
        <>
          {pair('M58 165 L40 190')}
          {pair('M142 165 L160 190')}
        </>
      );
  }
}

export function Mascot({ mood = 'happy', size = 120, className, title }: MascotProps) {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn('shrink-0 overflow-visible', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-mood={mood}
    >
      <g
        className={cn(
          !reduced && mood !== 'sleeping' && 'animate-[mascot-breathe_3.2s_ease-in-out_infinite]',
        )}
        style={{ transformOrigin: '100px 200px' }}
      >
        {/* body */}
        <path d="M44 200 Q46 146 100 142 Q154 146 156 200 Z" fill={C.body} {...stroke} />
        <path d="M78 200 Q80 168 100 166 Q120 168 122 200 Z" fill={C.snout} opacity={0.55} />
        <Arms mood={mood} />

        {/* horns */}
        <path d="M52 62 Q22 52 20 22 Q40 40 64 46 Z" fill={C.horn} {...stroke} />
        <path d="M148 62 Q178 52 180 22 Q160 40 136 46 Z" fill={C.horn} {...stroke} />
        <path
          d="M27 32 Q38 44 56 48"
          fill="none"
          stroke={C.hornShade}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M173 32 Q162 44 144 48"
          fill="none"
          stroke={C.hornShade}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* ears */}
        <ellipse
          cx={38}
          cy={88}
          rx={18}
          ry={10}
          transform="rotate(-25 38 88)"
          fill={C.shade}
          {...stroke}
        />
        <ellipse
          cx={162}
          cy={88}
          rx={18}
          ry={10}
          transform="rotate(25 162 88)"
          fill={C.shade}
          {...stroke}
        />

        {/* head */}
        <ellipse cx={100} cy={96} rx={60} ry={56} fill={C.body} {...stroke} />

        {/* cap with a tiny candlestick logo */}
        <path d="M50 70 Q54 30 100 28 Q146 30 150 70 Q100 56 50 70 Z" fill={C.cap} {...stroke} />
        <path d="M120 64 Q156 58 172 70 Q150 76 128 72 Z" fill={C.capShade} {...stroke} />
        <circle cx={100} cy={29} r={5} fill={C.capShade} {...stroke} strokeWidth={3} />
        <g fill={C.eye}>
          <rect x={85} y={44} width={6} height={10} rx={1.5} />
          <rect x={87.5} y={40} width={1.5} height={18} />
          <rect x={97} y={40} width={6} height={12} rx={1.5} />
          <rect x={99.5} y={36} width={1.5} height={20} />
          <rect x={109} y={36} width={6} height={10} rx={1.5} />
          <rect x={111.5} y={32} width={1.5} height={18} />
        </g>

        {/* snout */}
        <ellipse cx={100} cy={128} rx={36} ry={24} fill={C.snout} {...stroke} />
        <ellipse cx={87} cy={124} rx={5} ry={7} fill={C.nostril} />
        <ellipse cx={113} cy={124} rx={5} ry={7} fill={C.nostril} />

        {/* cheeks */}
        <ellipse cx={56} cy={110} rx={9} ry={6} fill={C.cheek} opacity={0.45} />
        <ellipse cx={144} cy={110} rx={9} ry={6} fill={C.cheek} opacity={0.45} />

        <Face mood={mood} />
      </g>
    </svg>
  );
}

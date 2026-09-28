/**
 * Building blocks for course diagrams. Colours come from theme tokens via Tailwind
 * fill-/stroke- utilities, so every diagram follows light/dark theme automatically.
 * Diagrams use a 360-unit wide viewBox with text ≥ 13 units: on a 375px phone the
 * diagram is ~320px wide, so text stays ≥ 11.5px.
 */
import { useId, type ReactNode, type SVGProps } from 'react';
import { cn } from '@/lib/cn';
import { fillOf, softFillOf, strokeOf, type DiagramTone } from './tones';

interface DiagramSvgProps {
  width: number;
  height: number;
  /** Accessible name; describe what the diagram shows, not how it looks. */
  title: string;
  children: ReactNode | ((ids: { arrow: string }) => ReactNode);
  className?: string;
  /** Controls rendered under the drawing (interactive diagrams). */
  footer?: ReactNode;
}

/** Responsive SVG canvas with arrow-head markers in every tone. */
export function DiagramSvg({ width, height, title, children, className, footer }: DiagramSvgProps) {
  const id = useId().replace(/:/g, '');
  const arrow = `${id}-arrow`;
  return (
    <div className={cn('rounded-2xl border-2 border-border bg-surface p-3', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        className="mx-auto block h-auto w-full max-w-[520px] font-sans"
      >
        <defs>
          {(Object.keys(fillOf) as DiagramTone[]).map((tone) => (
            <marker
              key={tone}
              id={`${arrow}-${tone}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={fillOf[tone]} />
            </marker>
          ))}
        </defs>
        {typeof children === 'function' ? children({ arrow }) : children}
      </svg>
      {footer && <div className="mx-auto mt-3 max-w-[520px]">{footer}</div>}
    </div>
  );
}

type TextProps = Omit<SVGProps<SVGTextElement>, 'fontSize'> & {
  tone?: DiagramTone;
  size?: number;
  bold?: boolean;
};

export function Txt({ tone = 'text', size = 14, bold, className, children, ...rest }: TextProps) {
  return (
    <text
      fontSize={size}
      fontWeight={bold ? 800 : 600}
      className={cn(fillOf[tone], className)}
      {...rest}
    >
      {children}
    </text>
  );
}

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: DiagramTone;
  arrow: string;
  dashed?: boolean;
  width?: number;
  both?: boolean;
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = 'muted',
  arrow,
  dashed,
  width = 2,
  both,
}: ArrowProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={width}
      strokeDasharray={dashed ? '5 4' : undefined}
      className={strokeOf[tone]}
      markerEnd={`url(#${arrow}-${tone})`}
      markerStart={both ? `url(#${arrow}-${tone})` : undefined}
    />
  );
}

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: DiagramTone;
  /** Soft tinted fill instead of the neutral surface. */
  soft?: boolean;
  r?: number;
  dashed?: boolean;
}

export function Box({ x, y, w, h, tone = 'muted', soft, r = 12, dashed }: BoxProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      strokeWidth={2}
      strokeDasharray={dashed ? '6 4' : undefined}
      className={cn(
        strokeOf[tone],
        soft ? (softFillOf[tone] ?? 'fill-surface-2') : 'fill-surface-2',
      )}
    />
  );
}

interface CandleProps {
  x: number;
  /** y coordinates (SVG, smaller = higher price). */
  open: number;
  close: number;
  high: number;
  low: number;
  w?: number;
  tone?: 'bull' | 'bear' | 'muted';
}

/** A single candle; colour from close vs open unless `tone` is given. */
export function Candle({ x, open, close, high, low, w = 16, tone }: CandleProps) {
  const t = tone ?? (close <= open ? 'bull' : 'bear');
  const top = Math.min(open, close);
  const h = Math.max(2, Math.abs(close - open));
  return (
    <g>
      <line x1={x} x2={x} y1={high} y2={low} strokeWidth={2} className={strokeOf[t]} />
      <rect
        x={x - w / 2}
        y={top}
        width={w}
        height={h}
        rx={2}
        className={cn(fillOf[t], strokeOf[t])}
      />
    </g>
  );
}

export type Pt = readonly [number, number];

interface PolylineProps {
  pts: readonly Pt[];
  tone?: DiagramTone;
  width?: number;
  dashed?: boolean;
}

/** An open line through points (price paths, equity curves). */
export function Polyline({ pts, tone = 'text', width = 2.5, dashed }: PolylineProps) {
  return (
    <polyline
      points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
      fill="none"
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dashed ? '6 4' : undefined}
      className={strokeOf[tone]}
    />
  );
}

interface NoteProps {
  x: number;
  y: number;
  w: number;
  h: number;
  children: ReactNode;
  className?: string;
}

/** Wrapped HTML text inside the drawing (for sentences that must reflow). */
export function Note({ x, y, w, h, children, className }: NoteProps) {
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div className={cn('text-[13px] leading-snug font-semibold text-text', className)}>
        {children}
      </div>
    </foreignObject>
  );
}

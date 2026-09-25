import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'bull' | 'bear' | 'xp' | 'info' | 'epic' | 'warn';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-muted',
  bull: 'bg-bull-soft text-bull',
  bear: 'bg-bear-soft text-bear',
  xp: 'bg-xp text-on-xp',
  info: 'bg-info-soft text-info',
  epic: 'bg-epic-soft text-epic',
  warn: 'bg-warn-soft text-warn',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Monospace digits for prices, P&L, R. */
  numeric?: boolean;
  size?: 'sm' | 'md';
}

/** Small status label: "Пройден", "+1,5R", "Редкое". */
export function Badge({ tone = 'neutral', numeric, size = 'sm', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        numeric && 'font-mono tabular-nums',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export interface PillProps extends HTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggleable chip for filters and categories. */
export function Pill({ selected = false, className, ...rest }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold transition-colors',
        selected
          ? 'border-info bg-info-soft text-info'
          : 'border-border bg-surface text-text-muted hover:bg-surface-2 hover:text-text',
        className,
      )}
      {...rest}
    />
  );
}

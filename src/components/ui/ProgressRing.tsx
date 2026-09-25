import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ProgressTone } from './ProgressBar';

const strokes: Record<ProgressTone, string> = {
  primary: 'stroke-primary',
  xp: 'stroke-xp',
  info: 'stroke-info',
  epic: 'stroke-epic',
  bear: 'stroke-bear',
};

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number;
  thickness?: number;
  tone?: ProgressTone;
  label: string;
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  size = 96,
  thickness = 10,
  tone = 'primary',
  label,
  children,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', strokes[tone])}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

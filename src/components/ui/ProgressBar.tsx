import { cn } from '@/lib/cn';

export type ProgressTone = 'primary' | 'xp' | 'info' | 'epic' | 'bear';

const fills: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  xp: 'bg-xp',
  info: 'bg-info',
  epic: 'bg-epic',
  bear: 'bg-bear',
};

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md' | 'lg';
  label: string;
  /** Visible text inside/next to the bar, e.g. "3/5". */
  valueText?: string;
  className?: string;
}

const heights = { sm: 'h-2', md: 'h-3.5', lg: 'h-5' } as const;

export function ProgressBar({
  value,
  tone = 'primary',
  size = 'md',
  label,
  valueText,
  className,
}: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText}
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-surface-2',
        heights[size],
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          // glossy highlight on top of the fill
          'bg-linear-to-b from-white/25 to-transparent bg-blend-overlay',
          fills[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

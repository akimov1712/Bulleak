import { cn } from '@/lib/cn';

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Hide the visible caption (the group keeps its accessible name). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Pill-shaped single choice (radiogroup), e.g. spot / perpetual, 1H / 4H / 1D. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  disabled = false,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {!hideLabel && <span className="text-sm font-bold text-text-muted">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors disabled:opacity-50',
              value === o.value
                ? 'border-primary-shade bg-primary text-on-primary'
                : 'border-border bg-surface hover:border-primary-shade',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

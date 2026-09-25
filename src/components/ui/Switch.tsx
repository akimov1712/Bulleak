import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer font-bold">
          {label}
        </label>
        {description && <span className="text-sm text-text-muted">{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors disabled:opacity-50',
          checked ? 'border-primary-shade bg-primary' : 'border-border bg-surface-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_2px_0_0_rgb(0_0_0/0.15)] transition-transform',
            checked && 'translate-x-6',
          )}
        />
      </button>
    </div>
  );
}

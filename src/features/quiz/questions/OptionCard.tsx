import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type OptionLook = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

const looks: Record<OptionLook, string> = {
  idle: 'border-border bg-surface hover:bg-surface-2 shadow-[0_3px_0_0_var(--border)]',
  selected: 'border-info bg-info-soft shadow-[0_3px_0_0_var(--info)]',
  correct: 'border-bull bg-bull-soft shadow-[0_3px_0_0_var(--bull)]',
  wrong: 'border-bear bg-bear-soft shadow-[0_3px_0_0_var(--bear)]',
  missed: 'border-bull border-dashed bg-surface',
};

export interface OptionCardProps {
  role: 'radio' | 'checkbox';
  checked: boolean;
  look: OptionLook;
  /** 1-based keyboard shortcut shown in the badge. */
  shortcut?: number;
  disabled: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** Big tappable answer card used by single/multi/true-false questions. */
export function OptionCard({
  role,
  checked,
  look,
  shortcut,
  disabled,
  onSelect,
  children,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      className={cn(
        'flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition-[background-color,transform] duration-100',
        !disabled && 'active:translate-y-[2px] active:shadow-none',
        disabled && 'cursor-default',
        looks[look],
      )}
    >
      {shortcut !== undefined && (
        <kbd
          aria-hidden="true"
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg border-2 font-mono text-xs font-bold',
            look === 'idle' ? 'border-border text-text-muted' : 'border-current',
          )}
        >
          {shortcut}
        </kbd>
      )}
      <span className="flex-1">{children}</span>
      {look === 'correct' && (
        <Check className="size-6 shrink-0 text-bull" strokeWidth={3} aria-label="верно" />
      )}
      {look === 'wrong' && (
        <X className="size-6 shrink-0 text-bear" strokeWidth={3} aria-label="неверно" />
      )}
      {look === 'missed' && (
        <Check
          className="size-6 shrink-0 text-bull/60"
          strokeWidth={3}
          aria-label="правильный вариант"
        />
      )}
    </button>
  );
}

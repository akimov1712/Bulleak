import { cn } from '@/lib/cn';

/** Shared class builders so links and other elements can look like buttons/cards. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'xp';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const buttonBase =
  'relative inline-flex select-none items-center justify-center gap-2 font-semibold ' +
  'rounded-(--radius-btn) transition-[background-color,border-color,color,transform] duration-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

// Flat buttons: a slight scale on press instead of the old 3D shadow.
const press = 'active:not-disabled:scale-[0.98]';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: cn('bg-primary text-on-primary hover:bg-primary-shade', press),
  secondary: cn('border border-border bg-surface text-text hover:bg-surface-2', press),
  ghost: 'bg-transparent text-text hover:bg-surface-2 active:bg-border',
  danger: cn('bg-bear text-on-bear hover:brightness-110', press),
  xp: cn('bg-xp text-on-xp hover:brightness-105', press),
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
};

export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyleOptions = {}): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], fullWidth && 'w-full');
}

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const cardPaddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 md:p-8',
};

export function cardClass({
  interactive = false,
  padding = 'md',
}: { interactive?: boolean; padding?: CardPadding } = {}): string {
  return cn(
    'rounded-(--radius-card) border border-border bg-surface text-text',
    '',
    interactive && 'cursor-pointer transition-colors duration-100 hover:border-text-muted/50',
    cardPaddings[padding],
  );
}

/** Toggle chip (filters, indicators, single choice): the selected one is tinted green. */
export function chipClass(active: boolean): string {
  return cn(
    'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-(--radius-btn) border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    active
      ? 'border-bull/50 bg-bull-soft text-bull'
      : 'border-border bg-surface text-text-muted hover:border-text-muted/40 hover:text-text',
  );
}

/** Text-like inputs (Input, NumberInput, Select). */
export const inputClass =
  'min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-base text-text ' +
  'placeholder:text-text-muted/70 transition-colors hover:border-text-muted/40 ' +
  'focus:border-info focus:ring-4 focus:ring-info/30 focus:outline-none aria-invalid:border-bear ' +
  'disabled:opacity-50';

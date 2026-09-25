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
  'relative inline-flex select-none items-center justify-center gap-2 font-extrabold tracking-wide ' +
  'rounded-(--radius-btn) transition-[transform,box-shadow,background-color] duration-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

// "3D" buttons: a solid bottom shadow that collapses on press.
const press = 'active:not-disabled:translate-y-[4px] active:not-disabled:shadow-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary text-on-primary shadow-[0_4px_0_0_var(--primary-shade)] hover:brightness-105',
    press,
  ),
  secondary: cn(
    'border-2 border-border bg-surface text-text shadow-[0_4px_0_0_var(--border)] hover:bg-surface-2',
    press,
  ),
  ghost: 'bg-transparent text-text hover:bg-surface-2 active:bg-border',
  danger: cn(
    'bg-bear text-on-bear shadow-[0_4px_0_0_color-mix(in_oklab,var(--bear),black_30%)] hover:brightness-105',
    press,
  ),
  xp: cn('bg-xp text-on-xp shadow-[0_4px_0_0_var(--xp-shade)] hover:brightness-105', press),
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
    'rounded-(--radius-card) border-2 border-border bg-surface text-text',
    'shadow-[0_4px_0_0_var(--border)]',
    interactive &&
      'cursor-pointer transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none',
    cardPaddings[padding],
  );
}

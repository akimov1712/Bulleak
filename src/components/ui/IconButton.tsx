import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /** Required: icon-only buttons must have an accessible name. */
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface';
}

const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' } as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-text transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'ghost'
          ? 'hover:bg-surface-2 active:bg-border'
          : 'border-2 border-border bg-surface hover:bg-surface-2',
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});

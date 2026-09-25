import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Mascot, type MascotMood } from './Mascot';

export interface MascotSayProps {
  mood?: MascotMood;
  size?: number;
  children: ReactNode;
  /** Bubble to the right (default) or above the mascot on narrow layouts. */
  layout?: 'side' | 'stack';
  className?: string;
}

/** Mascot with a speech bubble — hints, empty states, feedback. */
export function MascotSay({
  mood = 'happy',
  size = 88,
  children,
  layout = 'side',
  className,
}: MascotSayProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        layout === 'side' ? 'items-end' : 'flex-col-reverse items-center',
        className,
      )}
    >
      <Mascot mood={mood} size={size} />
      <div
        className={cn(
          'relative rounded-2xl border-2 border-border bg-surface px-4 py-3 font-semibold text-text shadow-[0_3px_0_0_var(--border)]',
          layout === 'side' ? 'mb-6' : 'text-center',
        )}
      >
        {children}
        <span
          aria-hidden="true"
          className={cn(
            'absolute size-3.5 rotate-45 border-border bg-surface',
            layout === 'side'
              ? '-left-[9px] bottom-4 border-b-2 border-l-2'
              : 'left-1/2 -bottom-[9px] -translate-x-1/2 border-r-2 border-b-2',
          )}
        />
      </div>
    </div>
  );
}

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it still labels the dialog). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /** "center" dialog, or "sheet" that slides from the bottom (mobile-friendly). */
  variant?: 'center' | 'sheet';
  size?: 'sm' | 'md' | 'lg';
  /** Prevent closing by Esc/backdrop (e.g. for confirmations in progress). */
  dismissible?: boolean;
  className?: string;
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/** Accessible modal: portal, focus trap, Esc to close, focus restored on close, scroll lock. */
export function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  children,
  footer,
  variant = 'center',
  size = 'md',
  dismissible = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    // Backdrop click closes the dialog; keyboard users close it with Esc or the close button.
    <div
      role="presentation"
      className={cn(
        'fixed inset-0 z-50 flex bg-black/50 backdrop-blur-[2px]',
        variant === 'sheet' ? 'items-end justify-center' : 'items-center justify-center p-4',
      )}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-[90dvh] w-full flex-col overflow-hidden border-2 border-border bg-surface text-text shadow-2xl outline-none',
          variant === 'sheet'
            ? 'animate-[sheet-in_220ms_ease-out] rounded-t-3xl pb-[env(safe-area-inset-bottom)]'
            : cn('animate-[pop-in_180ms_ease-out] rounded-3xl', widths[size]),
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 id={titleId} className={cn('text-xl font-extrabold', hideTitle && 'sr-only')}>
            {title}
          </h2>
          {dismissible && (
            <IconButton
              label="Закрыть"
              icon={<X className="size-5" />}
              onClick={onClose}
              className="-mr-2 ml-auto"
            />
          )}
        </div>
        <div className="overflow-y-auto px-5 pt-2 pb-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t-2 border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

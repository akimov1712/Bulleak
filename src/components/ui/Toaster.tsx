import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUi, type Toast, type ToastTone } from '@/store/uiStore';

const tones: Record<ToastTone, string> = {
  success: 'border-bull bg-bull-soft',
  error: 'border-bear bg-bear-soft',
  info: 'border-info bg-info-soft',
  xp: 'border-xp-shade bg-surface',
  achievement: 'border-epic bg-epic-soft',
};

function ToastItem({ item }: { item: Toast }) {
  const dismiss = useUi((s) => s.dismissToast);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), item.durationMs);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id, item.durationMs]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-text shadow-lg',
        tones[item.tone],
      )}
    >
      {item.icon && (
        <span className="text-2xl leading-none" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{item.title}</p>
        {item.description && <p className="text-sm text-text-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Скрыть уведомление"
        className="-m-3 grid size-11 shrink-0 place-items-center rounded-full text-text-muted hover:bg-black/5 hover:text-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * Toast stack. Top-center on mobile (clear of the bottom nav), bottom-right on desktop.
 * Mount once in the app shell.
 */
export function Toaster() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:mx-0"
    >
      {toasts.map((t) => (
        // CSS entrance (reduced motion shortens it globally, see index.css).
        <div key={t.id} className="animate-[pop-in_180ms_ease-out]">
          <ToastItem item={t} />
        </div>
      ))}
    </div>
  );
}

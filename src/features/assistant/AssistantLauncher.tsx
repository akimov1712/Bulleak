import { lazy, Suspense } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { useAssistant } from './assistantStore';

const AssistantPanel = lazy(() =>
  import('./AssistantPanel').then((m) => ({ default: m.AssistantPanel })),
);

/** Round button in the corner of every page; the panel loads on first open. */
export function AssistantLauncher() {
  const api = useAuth((s) => s.api);
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  // A guest-only build has no API, so no assistant.
  if (!api) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Помощник по курсу"
        title="Помощник по курсу"
        aria-haspopup="dialog"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform hover:scale-105 active:scale-95 lg:right-6 lg:bottom-6 print:hidden"
      >
        <MessageCircleQuestion className="size-7" aria-hidden="true" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel />
        </Suspense>
      )}
    </>
  );
}

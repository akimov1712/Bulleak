import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * PWA update notice: a new version was downloaded in the background and is applied only when
 * the learner agrees (a reload mid-lesson or mid-trade would lose unsaved input).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-2xl border-2 border-info bg-surface p-3 shadow-lg lg:right-6 lg:bottom-6 lg:left-auto lg:mx-0 print:hidden"
    >
      <RefreshCw className="size-5 shrink-0 text-info" aria-hidden="true" />
      <p className="min-w-0 flex-1 font-bold">Доступна новая версия курса</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setNeedRefresh(false)}>
          Позже
        </Button>
        <Button onClick={() => void updateServiceWorker(true)}>Обновить</Button>
      </div>
    </div>
  );
}

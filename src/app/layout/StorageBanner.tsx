import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle } from 'lucide-react';
import { isStorageHealthy, onStorageHealthChange } from '@/store/safeStorage';
import { subscribeToOtherTabs } from '@/store/progressStore';

/** Warns when progress cannot be written (private mode, full storage) and syncs other tabs. */
export function StorageBanner() {
  useEffect(() => subscribeToOtherTabs(), []);
  const healthy = useSyncExternalStore(onStorageHealthChange, isStorageHealthy, () => true);
  if (healthy) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b-2 border-warn bg-warn-soft px-4 py-2 text-sm font-bold text-warn"
    >
      <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      Прогресс не сохраняется: браузер запрещает запись (приватный режим или нет места). Сделай
      резервную копию в настройках, прежде чем закрыть вкладку.
    </div>
  );
}

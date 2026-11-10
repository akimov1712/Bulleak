import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSyncStatus } from './syncEngine';

const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** One line under the e-mail in the profile menu: is this device in step with the account? */
export function SyncStatus({ className }: { className?: string }) {
  const { state, lastSyncAt } = useSyncStatus();
  const view = {
    idle: { icon: RefreshCw, text: 'Синхронизация скоро начнётся', tone: 'text-text-muted' },
    syncing: { icon: RefreshCw, text: 'Синхронизация…', tone: 'text-text-muted' },
    synced: {
      icon: Check,
      text: `Синхронизировано${lastSyncAt ? ` в ${time.format(lastSyncAt)}` : ''}`,
      tone: 'text-bull',
    },
    offline: {
      icon: CloudOff,
      text: 'Нет связи — изменения сохранятся и уйдут позже',
      tone: 'text-warn',
    },
    error: {
      icon: AlertTriangle,
      text: 'Не удалось синхронизировать, повторим',
      tone: 'text-warn',
    },
  }[state];
  const Icon = view.icon;
  return (
    <p role="status" className={cn('flex items-center gap-1.5 text-xs', view.tone, className)}>
      <Icon
        className={cn('size-3.5 shrink-0', state === 'syncing' && 'motion-safe:animate-spin')}
        aria-hidden="true"
      />
      {view.text}
    </p>
  );
}

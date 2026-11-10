import { useEffect } from 'react';
import { useAuth } from '@/store/authStore';
import { startSyncEngine } from './syncEngine';

/** Syncs while someone is signed in; a guest-only build or a guest never starts it. */
export function useSyncEngine(): void {
  const api = useAuth((s) => s.api);
  const userId = useAuth((s) => s.user?.id ?? null);
  useEffect(() => (api && userId ? startSyncEngine(api, userId) : undefined), [api, userId]);
}

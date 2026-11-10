/**
 * Records between this browser and the server (docs/04-features/accounts-backend.md,
 * section 7): what to send for a local row and what to do with a change from another device.
 */
import type { RecordChange } from '@bulleak/shared';
import type { SyncFields } from '@/types/trading';

type Row = SyncFields & { id?: number };

/**
 * The change to send for a local row. The local numeric `id` stays out: it means nothing on
 * another device. A deleted row is sent as `data: null`.
 */
export function toChange(row: Row & { uid: string }): RecordChange {
  const { id: _id, uid, updatedAt, deleted, ...data } = row;
  return { uid, updatedAt: updatedAt ?? 0, data: deleted ? null : data };
}

export type RemoteAction<T> =
  | { type: 'skip' }
  | { type: 'delete'; id: number }
  | { type: 'update'; id: number; row: T }
  | { type: 'add'; row: T };

/**
 * What a change pulled from the server does locally. The newer change of a record wins;
 * our own changes coming back are older or equal, so they are skipped. Data that does not
 * look like a record of this kind (another app version, damage) is ignored.
 */
export function planRemoteChange<T extends Row>(
  local: T | undefined,
  change: RecordChange,
  isRecord: (value: unknown) => value is T,
): RemoteAction<T> {
  if (local && (local.updatedAt ?? 0) >= change.updatedAt) return { type: 'skip' };
  if (change.data === null) {
    return local?.id !== undefined ? { type: 'delete', id: local.id } : { type: 'skip' };
  }
  const { id: _remoteId, ...data } = change.data;
  const candidate: unknown = { ...data, uid: change.uid, updatedAt: change.updatedAt };
  if (!isRecord(candidate)) return { type: 'skip' };
  const row = { ...candidate };
  delete row.deleted;
  return local?.id !== undefined ? { type: 'update', id: local.id, row } : { type: 'add', row };
}

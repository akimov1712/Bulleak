/**
 * Records that sync between devices (docs/04-features/accounts-backend.md, section 7): every
 * row has a stable `uid`, `updatedAt` and a soft `deleted` mark, and every change leaves an
 * entry in `outbox` until the server has it. Deleted rows stay hidden until they are synced.
 */
import type { Table } from 'dexie';
import type { SyncFields } from '@/types/trading';
import { db } from './db';

export type RecordKind = 'sim' | 'journal';

export interface OutboxEntry {
  kind: RecordKind;
  uid: string;
  /** When the change was made. */
  at: number;
}

/**
 * RFC 4122 v4 id. `crypto.randomUUID` exists only on HTTPS (and localhost), the site may
 * also be opened over plain HTTP, so it is built from getRandomValues there.
 */
export function newUid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Gives a record from an old backup or an older schema its sync fields. */
export function withSyncFields<T extends SyncFields>(record: T, updatedAt: number): T {
  return { ...record, uid: record.uid ?? newUid(), updatedAt: record.updatedAt ?? updatedAt };
}

const live = <T extends SyncFields>(row: T | undefined): T | undefined =>
  row && !row.deleted ? row : undefined;

type Row = SyncFields & { id?: number };

/** The few table operations a synced repository needs, typed by the concrete table. */
export interface TableOps<T extends Row> {
  /** The Dexie table itself, for the transaction scope. */
  table: Table;
  add(row: T): Promise<number | undefined>;
  get(id: number): Promise<T | undefined>;
  patch(id: number, changes: Partial<T>): Promise<number>;
  all(): Promise<T[]>;
  newestFirst(): Promise<T[]>;
}

/** Add / update / soft-delete for a synced table; reads skip deleted rows. */
export function syncedTable<T extends Row>(ops: TableOps<T>, kind: RecordKind) {
  const touch = (uid: string, at: number) => db.outbox.put({ kind, uid, at });
  const inTransaction = <R>(work: () => Promise<R>) =>
    db.transaction('rw', ops.table, db.outbox, work);

  return {
    add(record: T): Promise<number> {
      const now = Date.now();
      const uid = newUid();
      const row: T = { ...record, uid, updatedAt: now };
      delete row.id; // always a new record; the database assigns the id
      delete row.deleted;
      return inTransaction(async () => {
        const id = await ops.add(row);
        if (id === undefined) throw new Error('IndexedDB returned no id');
        await touch(uid, now);
        return id;
      });
    },

    get: async (id: number) => live(await ops.get(id)),

    /** Returns true when a live record was changed. */
    update(id: number, changes: Partial<T>): Promise<boolean> {
      return inTransaction(async () => {
        const row = live(await ops.get(id));
        if (!row?.uid) return false;
        const now = Date.now();
        await ops.patch(id, { ...changes, updatedAt: now });
        await touch(row.uid, now);
        return true;
      });
    },

    remove(id: number): Promise<void> {
      return inTransaction(async () => {
        const row = live(await ops.get(id));
        if (!row?.uid) return;
        const now = Date.now();
        const deletion: Partial<T> = {};
        Object.assign(deletion, { deleted: true, updatedAt: now });
        await ops.patch(id, deletion);
        await touch(row.uid, now);
      });
    },

    /** Soft-deletes every live record (the deletion reaches other devices too). */
    clear(): Promise<void> {
      return inTransaction(async () => {
        const now = Date.now();
        const deletion: Partial<T> = {};
        Object.assign(deletion, { deleted: true, updatedAt: now });
        for (const row of await ops.all()) {
          if (row.deleted || row.id === undefined || !row.uid) continue;
          await ops.patch(row.id, deletion);
          await touch(row.uid, now);
        }
      });
    },

    count: async () => (await ops.all()).filter((r) => !r.deleted).length,

    /** Live rows, newest first. */
    newestFirst: async () => (await ops.newestFirst()).filter((r) => !r.deleted),
  };
}

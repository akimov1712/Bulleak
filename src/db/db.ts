/** IndexedDB (Dexie) for records that keep growing: simulator trades and the trade journal. */
import Dexie, { type EntityTable } from 'dexie';
import type { JournalTrade, SimTrade } from '@/types/trading';

export const DB_NAME = 'tc-db';

export class CourseDb extends Dexie {
  simTrades!: EntityTable<SimTrade, 'id'>;
  journal!: EntityTable<JournalTrade, 'id'>;

  constructor(name = DB_NAME) {
    super(name);
    // Any schema change: add version(2) with an upgrade and a test (storage.md).
    this.version(1).stores({
      simTrades: '++id, at, scenarioId, strategyTag',
      journal: '++id, openedAt, account, setup',
    });
  }
}

export const db = new CourseDb();

/** A storage failure the UI can show as is (private mode, blocked storage, quota…). */
export class DbError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DbError';
  }
}

const QUOTA = new Set(['QuotaExceededError', 'QuotaExceeded']);

/** Russian message for a failed database operation. */
export function dbErrorMessage(action: string, error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const inner =
    error instanceof Error && 'inner' in error && error.inner instanceof Error
      ? error.inner.name
      : '';
  if (QUOTA.has(name) || QUOTA.has(inner)) {
    return `Не удалось ${action}: в браузере закончилось место для данных. Сделай экспорт и удали старые записи.`;
  }
  return `Не удалось ${action}: хранилище браузера недоступно (например, в приватном режиме). Данные этой сессии не сохранятся.`;
}

/** Runs a database operation and turns any failure into a DbError with a readable message. */
export async function guard<T>(action: string, op: () => Promise<T>): Promise<T> {
  // Without IndexedDB (disabled by policy, some private modes) Dexie queries never settle:
  // fail fast so the page can say what is wrong instead of loading forever.
  if (typeof indexedDB === 'undefined') {
    throw new DbError(dbErrorMessage(action, new Error('IndexedDB is not available')));
  }
  try {
    return await op();
  } catch (error) {
    if (error instanceof DbError) throw error;
    throw new DbError(dbErrorMessage(action, error), error);
  }
}

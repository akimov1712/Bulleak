/** Trade journal (`tc-db.journal`). Every function rejects with a DbError on failure. */
import type { JournalAccount, JournalTrade } from '@/types/trading';
import { db, guard } from './db';

export interface JournalFilter {
  account?: JournalAccount;
  setup?: string;
}

export const journalRepo = {
  add: (trade: JournalTrade) =>
    guard('сохранить запись журнала', async () => {
      const record = { ...trade };
      delete record.id; // always a new record; the database assigns the id
      const id = await db.journal.add(record);
      if (id === undefined) throw new Error('IndexedDB returned no id');
      return id;
    }),

  /** Newest first (by opening time). */
  list: (filter: JournalFilter = {}) =>
    guard('загрузить журнал', async () => {
      let rows = await db.journal.orderBy('openedAt').reverse().toArray();
      if (filter.account !== undefined) rows = rows.filter((t) => t.account === filter.account);
      if (filter.setup !== undefined) rows = rows.filter((t) => t.setup === filter.setup);
      return rows;
    }),

  get: (id: number) => guard('загрузить запись журнала', () => db.journal.get(id)),

  /** Returns true when the record existed. */
  update: (id: number, changes: Partial<Omit<JournalTrade, 'id'>>) =>
    guard('обновить запись журнала', async () => (await db.journal.update(id, changes)) > 0),

  remove: (id: number) => guard('удалить запись журнала', () => db.journal.delete(id)),

  clear: () => guard('очистить журнал', () => db.journal.clear()),

  count: () => guard('посчитать записи журнала', () => db.journal.count()),
};

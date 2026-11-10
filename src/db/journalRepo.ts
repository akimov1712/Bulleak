/** Trade journal (`tc-db.journal`). Every function rejects with a DbError on failure. */
import type { JournalAccount, JournalTrade } from '@/types/trading';
import { db, guard } from './db';
import { syncedTable } from './syncedTable';

export interface JournalFilter {
  account?: JournalAccount;
  setup?: string;
}

const table = syncedTable(
  {
    table: db.journal,
    add: (row) => db.journal.add(row),
    get: (id) => db.journal.get(id),
    patch: (id, changes) => db.journal.update(id, changes),
    all: () => db.journal.toArray(),
    newestFirst: () => db.journal.orderBy('openedAt').reverse().toArray(),
  },
  'journal',
);

export const journalRepo = {
  add: (trade: JournalTrade) => guard('сохранить запись журнала', () => table.add(trade)),

  /** Newest first (by opening time). */
  list: (filter: JournalFilter = {}) =>
    guard('загрузить журнал', async () => {
      let rows = await table.newestFirst();
      if (filter.account !== undefined) rows = rows.filter((t) => t.account === filter.account);
      if (filter.setup !== undefined) rows = rows.filter((t) => t.setup === filter.setup);
      return rows;
    }),

  get: (id: number) => guard('загрузить запись журнала', () => table.get(id)),

  /** Returns true when the record existed. */
  update: (
    id: number,
    changes: Partial<Omit<JournalTrade, 'id' | 'uid' | 'updatedAt' | 'deleted'>>,
  ) => guard('обновить запись журнала', () => table.update(id, changes)),

  remove: (id: number) => guard('удалить запись журнала', () => table.remove(id)),

  clear: () => guard('очистить журнал', () => table.clear()),

  count: () => guard('посчитать записи журнала', () => table.count()),
};

/** Simulator trades (`tc-db.simTrades`). Every function rejects with a DbError on failure. */
import type { SimTrade } from '@/types/trading';
import { db, guard } from './db';
import { syncedTable } from './syncedTable';

export interface SimTradeFilter {
  scenarioId?: string;
  strategyTag?: string;
  /** Newest N trades. */
  limit?: number;
}

const table = syncedTable(
  {
    table: db.simTrades,
    add: (row) => db.simTrades.add(row),
    get: (id) => db.simTrades.get(id),
    patch: (id, changes) => db.simTrades.update(id, changes),
    all: () => db.simTrades.toArray(),
    newestFirst: () => db.simTrades.orderBy('at').reverse().toArray(),
  },
  'sim',
);

export const simRepo = {
  add: (trade: SimTrade) => guard('сохранить сделку', () => table.add(trade)),

  /** Newest first. */
  list: (filter: SimTradeFilter = {}) =>
    guard('загрузить историю сделок', async () => {
      let rows = await table.newestFirst();
      if (filter.scenarioId !== undefined) {
        rows = rows.filter((t) => t.scenarioId === filter.scenarioId);
      }
      if (filter.strategyTag !== undefined) {
        rows = rows.filter((t) => t.strategyTag === filter.strategyTag);
      }
      return filter.limit === undefined ? rows : rows.slice(0, filter.limit);
    }),

  get: (id: number) => guard('загрузить сделку', () => table.get(id)),

  /** Returns true when the trade existed. */
  update: (id: number, changes: Partial<Omit<SimTrade, 'id' | 'uid' | 'updatedAt' | 'deleted'>>) =>
    guard('обновить сделку', () => table.update(id, changes)),

  remove: (id: number) => guard('удалить сделку', () => table.remove(id)),

  clear: () => guard('очистить историю сделок', () => table.clear()),

  count: () => guard('посчитать сделки', () => table.count()),
};

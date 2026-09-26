/** Simulator trades (`tc-db.simTrades`). Every function rejects with a DbError on failure. */
import type { SimTrade } from '@/types/trading';
import { db, guard } from './db';

export interface SimTradeFilter {
  scenarioId?: string;
  strategyTag?: string;
  /** Newest N trades. */
  limit?: number;
}

export const simRepo = {
  add: (trade: SimTrade) =>
    guard('сохранить сделку', async () => {
      const record = { ...trade };
      delete record.id; // always a new record; the database assigns the id
      const id = await db.simTrades.add(record);
      if (id === undefined) throw new Error('IndexedDB returned no id');
      return id;
    }),

  /** Newest first. */
  list: (filter: SimTradeFilter = {}) =>
    guard('загрузить историю сделок', async () => {
      let rows = await db.simTrades.orderBy('at').reverse().toArray();
      if (filter.scenarioId !== undefined) {
        rows = rows.filter((t) => t.scenarioId === filter.scenarioId);
      }
      if (filter.strategyTag !== undefined) {
        rows = rows.filter((t) => t.strategyTag === filter.strategyTag);
      }
      return filter.limit === undefined ? rows : rows.slice(0, filter.limit);
    }),

  get: (id: number) => guard('загрузить сделку', () => db.simTrades.get(id)),

  /** Returns true when the trade existed. */
  update: (id: number, changes: Partial<Omit<SimTrade, 'id'>>) =>
    guard('обновить сделку', async () => (await db.simTrades.update(id, changes)) > 0),

  remove: (id: number) => guard('удалить сделку', () => db.simTrades.delete(id)),

  clear: () => guard('очистить историю сделок', () => db.simTrades.clear()),

  count: () => guard('посчитать сделки', () => db.simTrades.count()),

  /** Replaces everything (import from a backup file). */
  replaceAll: (trades: SimTrade[]) =>
    guard('восстановить сделки', () =>
      db.transaction('rw', db.simTrades, async () => {
        await db.simTrades.clear();
        await db.simTrades.bulkAdd(trades);
      }),
    ),
};

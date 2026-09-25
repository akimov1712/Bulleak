import { use } from 'react';
import { createPromiseCache } from '@/lib/promiseCache';
import { parseDataset, type Dataset, type DatasetName } from '@/lib/trading/candles';

const cache = createPromiseCache<DatasetName, Dataset>();

async function load(name: DatasetName): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
  if (!res.ok) throw new Error(`Не удалось загрузить данные ${name} (HTTP ${res.status})`);
  return parseDataset(name, await res.json());
}

export const datasetPromise = (name: DatasetName) => cache.get(name, () => load(name));
export const forgetDataset = (name: DatasetName) => cache.forget(name);

/** Suspends until the dataset is loaded (wrap in Suspense + ErrorBoundary). */
export function useDataset(name: DatasetName): Dataset {
  return use(datasetPromise(name));
}

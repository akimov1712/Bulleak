import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

const HAS_INDEXED_DB = typeof indexedDB !== 'undefined';
const never = () => undefined;

/**
 * `useLiveQuery` that also settles when the browser has no IndexedDB. Dexie's liveQuery never
 * emits in that case (even for a query that doesn't touch the database), so the page would
 * load forever. Without IndexedDB the query runs once directly: repositories fail fast with a
 * readable DbError (db.ts `guard`) and the caller's own error branch is shown.
 */
export function useDbQuery<T>(
  querier: () => Promise<T>,
  deps: readonly unknown[] = [],
): T | undefined {
  const live = useLiveQuery(HAS_INDEXED_DB ? querier : never, HAS_INDEXED_DB ? [...deps] : []);
  const [direct, setDirect] = useState<T>();
  useEffect(() => {
    if (HAS_INDEXED_DB) return;
    let alive = true;
    querier().then(
      (value) => alive && setDirect(value),
      () => undefined,
    );
    return () => {
      alive = false;
    };
    // The caller's deps drive re-runs, exactly as with useLiveQuery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return HAS_INDEXED_DB ? live : direct;
}

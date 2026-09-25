/**
 * Keyed cache of promises for React `use()` + Suspense: the same key always yields the same
 * promise (no refetch on re-render); `forget` drops a rejected load so it can be retried.
 */
export function createPromiseCache<K, V>() {
  const cache = new Map<K, Promise<V>>();
  return {
    get(key: K, load: () => Promise<V>): Promise<V> {
      let promise = cache.get(key);
      if (!promise) {
        promise = load();
        cache.set(key, promise);
      }
      return promise;
    },
    forget(key: K): void {
      cache.delete(key);
    },
  };
}

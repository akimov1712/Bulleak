import type { StateStorage } from 'zustand/middleware';

/**
 * localStorage wrapper that never throws (private mode, quota exceeded, disabled storage).
 * On failure it falls back to an in-memory map for the session and reports the problem
 * so the UI can show a "progress is not being saved" banner.
 */

type Listener = (healthy: boolean) => void;

const memory = new Map<string, string>();
const listeners = new Set<Listener>();
let healthy = true;

function setHealthy(value: boolean) {
  if (healthy === value) return;
  healthy = value;
  listeners.forEach((listener) => listener(value));
}

export function isStorageHealthy(): boolean {
  return healthy;
}

export function onStorageHealthChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function backend(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const store = backend();
      if (!store) throw new Error('localStorage unavailable');
      return store.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      setHealthy(false);
      return memory.get(name) ?? null;
    }
  },
  setItem(name, value) {
    memory.set(name, value);
    try {
      const store = backend();
      if (!store) throw new Error('localStorage unavailable');
      store.setItem(name, value);
      setHealthy(true);
    } catch {
      setHealthy(false);
    }
  },
  removeItem(name) {
    memory.delete(name);
    try {
      backend()?.removeItem(name);
    } catch {
      setHealthy(false);
    }
  },
};

/** Test helper: reset module state between tests. */
export function __resetSafeStorage(): void {
  memory.clear();
  listeners.clear();
  healthy = true;
}

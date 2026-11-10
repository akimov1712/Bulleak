import { storedSessionSchema, type SessionStore, type StoredSession } from './client';

export const SESSION_KEY = 'tc-auth';

/** Session in localStorage; anything unreadable counts as signed out. */
export function localSessionStore(storage: Storage | null = safeLocalStorage()): SessionStore {
  return {
    read() {
      try {
        const raw = storage?.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    write(session: StoredSession | null) {
      try {
        if (session) storage?.setItem(SESSION_KEY, JSON.stringify(session));
        else storage?.removeItem(SESSION_KEY);
      } catch {
        // Storage is full or blocked: the session then lasts only while the tab is open.
      }
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

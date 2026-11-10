import { create } from 'zustand';
import type { PublicUser } from '@bulleak/shared';
import { createApiClient, type ApiClient } from '@/api/client';
import { localSessionStore, SESSION_KEY } from '@/api/sessionStore';

/** API address from the build; without it the site stays guest-only, as before accounts. */
const API_URL = import.meta.env.VITE_API_URL;

interface AuthState {
  /** Null in a guest-only build. */
  api: ApiClient | null;
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
}

const sessions = localSessionStore();

export const useAuth = create<AuthState>()((set) => ({
  api: API_URL
    ? createApiClient({
        baseUrl: API_URL,
        store: sessions,
        onSignedOut: () => set({ user: null }),
      })
    : null,
  user: API_URL ? (sessions.read()?.user ?? null) : null,
  setUser: (user) => set({ user }),
}));

/** Sign-in and sign-out in another tab show up here too. */
export function subscribeAuthToOtherTabs(): () => void {
  if (typeof window === 'undefined' || !API_URL) return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY || event.key === null) {
      useAuth.setState({ user: sessions.read()?.user ?? null });
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

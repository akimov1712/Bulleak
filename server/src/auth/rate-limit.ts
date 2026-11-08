export interface RateLimit {
  limit: number;
  windowMs: number;
}

const MINUTE = 60 * 1000;

/** Limits from the spec (docs/04-features/accounts-backend.md, section 8). */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 15 * MINUTE },
  register: { limit: 5, windowMs: 60 * MINUTE },
  forgot: { limit: 3, windowMs: 60 * MINUTE },
  resendVerification: { limit: 3, windowMs: 60 * MINUTE },
} satisfies Record<string, RateLimit>;

/** Counts attempts per key. Replaceable: one process keeps them in memory, several need a store. */
export interface RateLimiter {
  /** Counts an attempt; `retryAfterSec` is meaningful when it is not allowed. */
  hit(key: string, rule: RateLimit): { allowed: boolean; retryAfterSec: number };
  reset(key: string): void;
}

/** Keys come from user input, so the table must not grow without bound. */
const MAX_KEYS = 100_000;

/** Fixed window per key, in memory; `now` is injectable for tests. */
export function memoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  function makeRoom(time: number) {
    for (const [key, entry] of windows) {
      if (entry.resetAt <= time) windows.delete(key);
    }
    // Still full of live keys: Map keeps insertion order, so drop the oldest.
    for (const key of windows.keys()) {
      if (windows.size < MAX_KEYS) break;
      windows.delete(key);
    }
  }

  return {
    hit(key, { limit, windowMs }) {
      const time = now();
      let entry = windows.get(key);
      if (!entry || entry.resetAt <= time) {
        if (windows.size >= MAX_KEYS) makeRoom(time);
        entry = { count: 0, resetAt: time + windowMs };
        windows.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= limit,
        retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)),
      };
    },
    reset(key) {
      windows.delete(key);
    },
  };
}

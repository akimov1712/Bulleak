import { z } from 'zod';
import {
  apiErrorSchema,
  authResponseSchema,
  publicUserSchema,
  type AuthResponse,
  type ErrorCode,
  type LoginBody,
  type PublicUser,
  type RegisterBody,
} from '@bulleak/shared';

/*
 * Client of the Bulleak API (docs/02-architecture/backend.md). The access token lives only
 * in memory; the refresh token and the user are kept by a SessionStore (localStorage). The
 * server revokes all sessions when a rotated refresh token is presented again, so refreshes
 * are serialised across tabs and always use the latest stored token.
 */

export type ClientErrorCode = ErrorCode | 'network' | 'bad_response';

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status = 0,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const NETWORK_MESSAGE = 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.';
const BAD_RESPONSE_MESSAGE = 'Сервер ответил что-то непонятное. Попробуй позже.';

export const storedSessionSchema = z.object({
  user: publicUserSchema,
  /** Absent when the server keeps the refresh token in an HttpOnly cookie. */
  refreshToken: z.string().optional(),
});
export type StoredSession = z.infer<typeof storedSessionSchema>;

export interface SessionStore {
  read(): StoredSession | null;
  write(session: StoredSession | null): void;
}

/** Runs `task` while no other tab refreshes (Web Locks); falls back to running it directly. */
export type CrossTabLock = (task: () => Promise<void>) => Promise<void>;

export const webLock: CrossTabLock = async (task) => {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request('bulleak-auth-refresh', task);
  } else {
    await task();
  }
};

export interface ApiClientOptions {
  /** e.g. https://bulleak.ru/api/v1 */
  baseUrl: string;
  store: SessionStore;
  fetch?: typeof fetch;
  lock?: CrossTabLock;
  /** The session ended without the user asking (refresh token rejected). */
  onSignedOut?: () => void;
  now?: () => number;
}

/** Refresh a little before the access token expires, so a request does not race the clock. */
const EXPIRY_MARGIN_MS = 30_000;

const nothing = z.unknown();
const looseErrorSchema = z.object({ error: z.object({ message: z.string().min(1) }) });
const meSchema = z.object({ user: publicUserSchema });

interface SendOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient({
  baseUrl,
  store,
  fetch: fetchImpl = (...args) => fetch(...args),
  lock = webLock,
  onSignedOut,
  now = Date.now,
}: ApiClientOptions) {
  const root = baseUrl.replace(/\/+$/, '');
  let access: { token: string; expiresAt: number } | null = null;
  let refreshing: Promise<string> | null = null;

  async function send(path: string, { method = 'POST', body, token }: SendOptions = {}) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        // The refresh token may be an HttpOnly cookie on the API domain.
        credentials: 'include',
      });
    } catch {
      throw new ApiError('network', NETWORK_MESSAGE);
    }
  }

  async function failure(res: Response): Promise<ApiError> {
    const raw: unknown = await res.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(raw);
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error;
      return new ApiError(code, message, res.status, fields);
    }
    // A newer server may send a code this bundle does not know (the PWA can be out of date):
    // keep its message, it is written for people.
    const loose = looseErrorSchema.safeParse(raw);
    if (loose.success) return new ApiError('bad_response', loose.data.error.message, res.status);
    return new ApiError('bad_response', BAD_RESPONSE_MESSAGE, res.status);
  }

  async function parse<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
    if (!res.ok) throw await failure(res);
    // 204 has no body: `null` passes the `nothing` schema.
    const raw: unknown = res.status === 204 ? null : await res.json().catch(() => undefined);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new ApiError('bad_response', BAD_RESPONSE_MESSAGE, res.status);
    return parsed.data;
  }

  /** Keeps the access token in memory and the rest in the store; returns the access token. */
  function startSession(auth: AuthResponse): string {
    access = { token: auth.accessToken, expiresAt: now() + auth.expiresIn * 1000 };
    store.write({
      user: auth.user,
      ...(auth.refreshToken ? { refreshToken: auth.refreshToken } : {}),
    });
    return auth.accessToken;
  }

  function endSession() {
    access = null;
    store.write(null);
  }

  const refreshBody = (session: StoredSession | null) =>
    session?.refreshToken ? { refreshToken: session.refreshToken } : {};

  async function refreshAcrossTabs(): Promise<string> {
    let token = '';
    await lock(async () => {
      // Read inside the lock: another tab may have just rotated the token.
      const session = store.read();
      if (!session) throw new ApiError('unauthorized', 'Нужно войти в аккаунт', 401);
      const res = await send('/auth/refresh', { body: refreshBody(session) });
      if (res.status === 401) {
        const error = await failure(res);
        endSession();
        onSignedOut?.();
        throw error;
      }
      token = startSession(await parse(res, authResponseSchema));
    });
    return token;
  }

  /** One refresh at a time in this tab; parallel requests wait for the same one. */
  function refresh(): Promise<string> {
    refreshing ??= refreshAcrossTabs().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function accessToken(): Promise<string> {
    if (access && access.expiresAt - EXPIRY_MARGIN_MS > now()) return access.token;
    return refresh();
  }

  /** A request on behalf of the signed-in user; on 401 refreshes the token and retries once. */
  async function authed<S extends z.ZodType>(path: string, schema: S, options: SendOptions = {}) {
    let res = await send(path, { ...options, token: await accessToken() });
    if (res.status === 401) {
      access = null;
      res = await send(path, { ...options, token: await refresh() });
    }
    return parse(res, schema);
  }

  return {
    /** The user remembered from the last session (may be stale until `me()`). */
    storedUser: (): PublicUser | null => store.read()?.user ?? null,

    /** Another tab signed out: the access token in this tab's memory must not outlive it. */
    forgetAccessToken() {
      access = null;
    },

    /**
     * Asks the server whether this device's session is still alive (refresh now, not when the
     * access token expires); a revoked session signs out through `onSignedOut`.
     */
    async checkSession() {
      await refresh();
    },

    async register(body: RegisterBody): Promise<PublicUser> {
      const auth = await parse(await send('/auth/register', { body }), authResponseSchema);
      startSession(auth);
      return auth.user;
    },

    async login(body: LoginBody): Promise<PublicUser> {
      const auth = await parse(await send('/auth/login', { body }), authResponseSchema);
      startSession(auth);
      return auth.user;
    },

    async me(): Promise<PublicUser> {
      const { user } = await authed('/me', meSchema, { method: 'GET' });
      const session = store.read();
      if (session) store.write({ ...session, user });
      return user;
    },

    /** Ends this session; local data is cleared even when the server cannot be reached. */
    async logout() {
      const session = store.read();
      endSession();
      await send('/auth/logout', { body: refreshBody(session) }).catch(() => undefined);
    },

    async logoutAll() {
      await authed('/auth/logout-all', nothing);
      endSession();
    },

    async verifyEmail(token: string) {
      await parse(await send('/auth/verify-email', { body: { token } }), nothing);
    },

    async resendVerification() {
      await authed('/auth/resend-verification', nothing);
    },

    async forgot(email: string) {
      await parse(await send('/auth/forgot', { body: { email } }), nothing);
    },

    async resetPassword(token: string, password: string) {
      await parse(await send('/auth/reset', { body: { token, password } }), nothing);
    },
  };
}

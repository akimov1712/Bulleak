import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '@bulleak/shared';
import { ApiError, createApiClient, type SessionStore, type StoredSession } from './client';
import { localSessionStore, SESSION_KEY } from './sessionStore';

const user: PublicUser = {
  id: '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11',
  email: 'trader@mail.test',
  name: 'Ника',
  emailVerified: false,
  createdAt: '2026-11-10T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const session = (access: string, refresh: string, expiresIn = 900) =>
  json(200, { user, accessToken: access, expiresIn, refreshToken: refresh });

const unauthorized = (code = 'unauthorized') =>
  json(401, { error: { code, message: 'Нужно войти в аккаунт' } });

function memoryStore(initial: StoredSession | null = null): SessionStore & {
  value: StoredSession | null;
} {
  const store = {
    value: initial,
    read: () => store.value,
    write: (s: StoredSession | null) => {
      store.value = s;
    },
  };
  return store;
}

type Route = (init: RequestInit) => Response | Promise<Response>;

/** Fake API: answers by path, records every call. */
function fakeApi(routes: Record<string, Route | Route[]>) {
  const calls: { path: string; init: RequestInit }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const path = String(url).replace('https://api.test/v1', '');
    calls.push({ path, init });
    const route = routes[path];
    const handler = Array.isArray(route) ? route.shift() : route;
    if (!handler) throw new Error(`unexpected ${path}`);
    return handler(init);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const bodyOf = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>;
const authOf = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;

let clock = 1_000_000;
beforeEach(() => {
  clock = 1_000_000;
});

function client(api: ReturnType<typeof fakeApi>, store = memoryStore(), onSignedOut = vi.fn()) {
  return {
    store,
    onSignedOut,
    api: createApiClient({
      baseUrl: 'https://api.test/v1/',
      store,
      fetch: api.fetch,
      lock: (task) => task(),
      onSignedOut,
      now: () => clock,
    }),
  };
}

describe('ApiClient', () => {
  it('logs in, stores the session and sends the access token', async () => {
    const api = fakeApi({
      '/auth/login': () => session('a1', 'r1'),
      '/me': () => json(200, { user: { ...user, name: 'Ника П.' } }),
    });
    const { api: c, store } = client(api);
    expect(await c.login({ email: user.email, password: 'secret-pass' })).toEqual(user);
    expect(store.value).toEqual({ user, refreshToken: 'r1' });
    expect(api.calls[0]?.init.credentials).toBe('include');
    expect(bodyOf(api.calls[0]?.init ?? {})).toEqual({
      email: user.email,
      password: 'secret-pass',
    });

    expect((await c.me()).name).toBe('Ника П.');
    expect(api.calls[1]?.init.method).toBe('GET');
    expect(authOf(api.calls[1]?.init ?? {})).toBe('Bearer a1');
    expect(store.value?.user.name).toBe('Ника П.');
  });

  it('refreshes on 401 and repeats the request once', async () => {
    const api = fakeApi({
      '/auth/login': () => session('a1', 'r1'),
      '/me': [() => unauthorized(), () => json(200, { user })],
      '/auth/refresh': () => session('a2', 'r2'),
    });
    const { api: c, store } = client(api);
    await c.login({ email: user.email, password: 'secret-pass' });
    await c.me();
    expect(api.calls.map((x) => x.path)).toEqual(['/auth/login', '/me', '/auth/refresh', '/me']);
    expect(bodyOf(api.calls[2]?.init ?? {})).toEqual({ refreshToken: 'r1' });
    expect(authOf(api.calls[3]?.init ?? {})).toBe('Bearer a2');
    expect(store.value?.refreshToken).toBe('r2');
  });

  it('refreshes before the access token expires', async () => {
    const api = fakeApi({
      '/auth/login': () => session('a1', 'r1', 60),
      '/auth/refresh': () => session('a2', 'r2'),
      '/me': () => json(200, { user }),
    });
    const { api: c } = client(api);
    await c.login({ email: user.email, password: 'secret-pass' });
    clock += 40_000; // 20 s left: inside the safety margin
    await c.me();
    expect(api.calls.map((x) => x.path)).toEqual(['/auth/login', '/auth/refresh', '/me']);
  });

  it('starts from a stored session after a reload', async () => {
    const api = fakeApi({
      '/auth/refresh': () => session('a2', 'r2'),
      '/me': () => json(200, { user }),
    });
    const { api: c } = client(api, memoryStore({ user, refreshToken: 'r1' }));
    expect(c.storedUser()).toEqual(user);
    await c.me();
    expect(bodyOf(api.calls[0]?.init ?? {})).toEqual({ refreshToken: 'r1' });
  });

  it('makes one refresh for parallel requests', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const api = fakeApi({
      '/auth/refresh': async () => {
        await gate;
        return session('a2', 'r2');
      },
      '/me': () => json(200, { user }),
    });
    const { api: c } = client(api, memoryStore({ user, refreshToken: 'r1' }));
    const both = Promise.all([c.me(), c.me()]);
    release();
    await both;
    expect(api.calls.filter((x) => x.path === '/auth/refresh')).toHaveLength(1);
  });

  it('uses the token another tab stored while it waited for the lock', async () => {
    const store = memoryStore({ user, refreshToken: 'r1' });
    const api = fakeApi({
      '/auth/refresh': () => session('a3', 'r3'),
      '/me': () => json(200, { user }),
    });
    const c = createApiClient({
      baseUrl: 'https://api.test/v1',
      store,
      fetch: api.fetch,
      // The other tab rotates r1 → r2 while this one waits.
      lock: async (task) => {
        store.write({ user, refreshToken: 'r2' });
        await task();
      },
    });
    await c.me();
    expect(bodyOf(api.calls[0]?.init ?? {})).toEqual({ refreshToken: 'r2' });
  });

  it('signs out when the refresh token is rejected', async () => {
    const api = fakeApi({
      '/auth/refresh': () => unauthorized('token_invalid'),
    });
    const { api: c, store, onSignedOut } = client(api, memoryStore({ user, refreshToken: 'r1' }));
    await expect(c.me()).rejects.toMatchObject({ code: 'token_invalid', status: 401 });
    expect(store.value).toBeNull();
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it('reports field errors and network failures', async () => {
    const api = fakeApi({
      '/auth/register': [
        () =>
          json(400, {
            error: {
              code: 'weak_password',
              message: 'Этот пароль слишком легко подобрать',
              fields: { password: 'Придумай другой.' },
            },
          }),
        () => {
          throw new TypeError('Failed to fetch');
        },
        () => new Response('<html>502</html>', { status: 502 }),
      ],
    });
    const { api: c } = client(api);
    const body = { email: user.email, password: 'qwerty2024', name: 'Ника' };
    const weak = await c.register(body).catch((e: unknown) => e);
    expect(weak).toBeInstanceOf(ApiError);
    expect(weak).toMatchObject({ code: 'weak_password', fields: { password: 'Придумай другой.' } });
    await expect(c.register(body)).rejects.toMatchObject({ code: 'network' });
    await expect(c.register(body)).rejects.toMatchObject({ code: 'bad_response', status: 502 });
  });

  it('clears the local session on logout even without a connection', async () => {
    const api = fakeApi({
      '/auth/logout': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const { api: c, store } = client(api, memoryStore({ user, refreshToken: 'r1' }));
    await c.logout();
    expect(store.value).toBeNull();
    expect(bodyOf(api.calls[0]?.init ?? {})).toEqual({ refreshToken: 'r1' });
  });

  it('works with the refresh token in a cookie', async () => {
    const api = fakeApi({
      '/auth/login': () => json(200, { user, accessToken: 'a1', expiresIn: 900 }),
      '/auth/refresh': () => json(200, { user, accessToken: 'a2', expiresIn: 900 }),
      '/me': () => json(200, { user }),
    });
    const { api: c, store } = client(api);
    await c.login({ email: user.email, password: 'secret-pass' });
    expect(store.value).toEqual({ user });
    clock += 3_600_000;
    await c.me();
    expect(bodyOf(api.calls[1]?.init ?? {})).toEqual({});
  });

  it('keeps the message of an error code this bundle does not know', async () => {
    const api = fakeApi({
      '/auth/login': () =>
        json(400, { error: { code: 'brand_new_code', message: 'Новое правило' } }),
    });
    await expect(
      client(api).api.login({ email: user.email, password: 'secret-pass' }),
    ).rejects.toMatchObject({ code: 'bad_response', message: 'Новое правило' });
  });

  it('checkSession signs out a revoked session, forgetAccessToken forces a refresh', async () => {
    const api = fakeApi({
      '/auth/login': () => session('a1', 'r1'),
      '/auth/refresh': [() => session('a2', 'r2'), () => unauthorized('token_invalid')],
      '/me': () => json(200, { user }),
    });
    const { api: c, store, onSignedOut } = client(api);
    await c.login({ email: user.email, password: 'secret-pass' });
    c.forgetAccessToken();
    await c.me();
    expect(api.calls.map((x) => x.path)).toEqual(['/auth/login', '/auth/refresh', '/me']);
    await expect(c.checkSession()).rejects.toMatchObject({ code: 'token_invalid' });
    expect(store.value).toBeNull();
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it('accepts empty 204 answers', async () => {
    const api = fakeApi({ '/auth/verify-email': () => new Response(null, { status: 204 }) });
    await expect(client(api).api.verifyEmail('t')).resolves.toBeUndefined();
  });
});

describe('localSessionStore', () => {
  it('round-trips a session and ignores garbage', () => {
    localStorage.clear();
    const store = localSessionStore(localStorage);
    store.write({ user, refreshToken: 'r1' });
    expect(store.read()).toEqual({ user, refreshToken: 'r1' });
    localStorage.setItem(SESSION_KEY, '{oops');
    expect(store.read()).toBeNull();
    store.write(null);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('aiChatStream', () => {
  const sse = (text: string) =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(c) {
          const enc = new TextEncoder();
          // Split mid-event, as the network does.
          c.enqueue(enc.encode(text.slice(0, 25)));
          c.enqueue(enc.encode(text.slice(25)));
          c.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );

  async function signedIn(stream: Route) {
    const api = fakeApi({ '/auth/login': () => session('a1', 'r1'), '/ai/chat/stream': stream });
    const c = client(api);
    await c.api.login({ email: user.email, password: 'T7#mVq2!xLong' });
    return { ...c, calls: api.calls };
  }

  const ask = { messages: [{ role: 'user' as const, content: 'Что такое стоп?' }] };

  it('hands out the pieces and resolves with the quota and sources', async () => {
    const { api, calls } = await signedIn(() =>
      sse(
        'event: delta\ndata: {"text":"Стоп — "}\n\nevent: delta\ndata: {"text":"выход."}\n\n' +
          'event: done\ndata: {"remaining":4,"sources":[{"kind":"term","ref":"sl","title":"Стоп"}]}\n\n',
      ),
    );
    const pieces: string[] = [];
    const done = await api.aiChatStream(ask, { onDelta: (t) => pieces.push(t) });
    expect(pieces.join('')).toBe('Стоп — выход.');
    expect(done).toEqual({ remaining: 4, sources: [{ kind: 'term', ref: 'sl', title: 'Стоп' }] });
    expect(calls[1] && authOf(calls[1].init)).toBe('Bearer a1');
  });

  it('rejects with the server message on an error event, a quota or a cut stream', async () => {
    const broken = await signedIn(() =>
      sse(
        'event: delta\ndata: {"text":"Нач"}\n\nevent: error\ndata: {"code":"ai_unavailable","message":"Помощник сейчас недоступен."}\n\n',
      ),
    );
    await expect(broken.api.aiChatStream(ask, { onDelta: () => {} })).rejects.toMatchObject({
      code: 'ai_unavailable',
      message: 'Помощник сейчас недоступен.',
    });

    const quota = await signedIn(() =>
      json(429, { error: { code: 'ai_quota', message: 'На сегодня вопросы закончились' } }),
    );
    await expect(quota.api.aiChatStream(ask, { onDelta: () => {} })).rejects.toMatchObject({
      code: 'ai_quota',
      status: 429,
    });

    const cut = await signedIn(() => sse('event: delta\ndata: {"text":"Нач"}\n\n'));
    await expect(cut.api.aiChatStream(ask, { onDelta: () => {} })).rejects.toBeInstanceOf(ApiError);
  });
});

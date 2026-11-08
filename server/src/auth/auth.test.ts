import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, authResponseSchema } from '@bulleak/shared';
import { API_PREFIX, createApp } from '../app';
import { loadConfig } from '../config';
import { openTestDatabase, type Database } from '../db';
import { emailTokens, sessions, users } from '../db/schema';
import { memoryLogger } from '../log';
import { memoryMailer } from '../mail';
import { memoryRateLimiter, type RateLimiter } from './rate-limit';
import { hashToken, signAccessToken } from './tokens';

let database: Database;

beforeAll(async () => {
  database = await openTestDatabase();
});

afterAll(() => database.close());

beforeEach(async () => {
  await database.db.delete(emailTokens);
  await database.db.delete(sessions);
  await database.db.delete(users);
});

const SECRET = 'test-secret-test-secret-test-secret-00';

function setup(env: Record<string, string> = {}, limiter?: RateLimiter) {
  const config = loadConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: 'https://bulleak.test',
    JWT_SECRET: SECRET,
    ...env,
  });
  mailer = memoryMailer();
  return createApp({ config, logger: memoryLogger(), db: database.db, mailer, limiter });
}

let mailer: ReturnType<typeof memoryMailer>;

type App = ReturnType<typeof setup>;

const post = (app: App, path: string, body: unknown) =>
  app.request(`${API_PREFIX}${path}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'vitest' },
  });

const me = (app: App, authorization?: string) =>
  app.request(`${API_PREFIX}/me`, {
    headers: authorization ? { Authorization: authorization } : {},
  });

const account = { email: 'Trader@Mail.Test', password: 'T7#mVq2!xLong', name: 'Ника' };

async function errorOf(res: Response) {
  return apiErrorSchema.parse(await res.json()).error;
}

describe('POST /auth/register', () => {
  it('creates an account and a session; secrets are stored only as hashes', async () => {
    const app = setup();
    const res = await post(app, '/auth/register', account);
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = authResponseSchema.parse(await res.json());
    expect(body.user).toMatchObject({
      email: 'trader@mail.test',
      name: 'Ника',
      emailVerified: false,
    });
    expect(body.expiresIn).toBe(900);

    const [user] = await database.db.select().from(users);
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    const [session] = await database.db.select().from(sessions);
    expect(session?.userId).toBe(user?.id);
    expect(session?.userAgent).toBe('vitest');
    expect(session?.refreshHash).toBe(hashToken(body.refreshToken ?? ''));
    expect(session?.refreshHash).not.toBe(body.refreshToken);
  });

  it('refuses a taken e-mail regardless of case', async () => {
    const app = setup();
    await post(app, '/auth/register', account);
    const res = await post(app, '/auth/register', { ...account, email: 'TRADER@mail.test' });
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe('email_taken');
    expect(await database.db.select().from(users)).toHaveLength(1);
  });

  it('lets only one of two simultaneous sign-ups through', async () => {
    const app = setup();
    const results = await Promise.all([
      post(app, '/auth/register', account),
      post(app, '/auth/register', account),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await database.db.select().from(sessions)).toHaveLength(1);
  });

  it('refuses a common password', async () => {
    const res = await post(setup(), '/auth/register', { ...account, password: 'qwerty2024' });
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe('weak_password');
    expect(error.fields?.password).toBeTruthy();
  });

  it('reports invalid fields and invalid JSON', async () => {
    const app = setup();
    const res = await post(app, '/auth/register', { email: 'nope', password: 'short', name: '' });
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe('validation');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(['email', 'name', 'password']);
    expect((await post(app, '/auth/register', '{oops')).status).toBe(400);
  });

  it('delivers the refresh token as an HttpOnly cookie when configured', async () => {
    const res = await post(setup({ REFRESH_TRANSPORT: 'cookie' }), '/auth/register', account);
    const body = authResponseSchema.parse(await res.json());
    expect(body.refreshToken).toBeUndefined();
    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(/^bulleak_refresh=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toContain(`Path=${API_PREFIX}/auth`);
  });
});

describe('POST /auth/login', () => {
  it('signs in with any e-mail case and starts a new session', async () => {
    const app = setup();
    await post(app, '/auth/register', account);
    const res = await post(app, '/auth/login', {
      email: 'TRADER@mail.test',
      password: account.password,
    });
    expect(res.status).toBe(200);
    authResponseSchema.parse(await res.json());
    expect(await database.db.select().from(sessions)).toHaveLength(2);
  });

  it('answers identically for a wrong password and an unknown e-mail', async () => {
    const app = setup();
    await post(app, '/auth/register', account);
    const wrong = await post(app, '/auth/login', { email: account.email, password: 'wrong-pass' });
    const unknown = await post(app, '/auth/login', {
      email: 'ghost@mail.test',
      password: 'wrong-pass',
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    const body = await wrong.json();
    expect(body).toEqual(await unknown.json());
    expect(apiErrorSchema.parse(body).error.code).toBe('invalid_credentials');
  });

  it('does not create a session on failure', async () => {
    const app = setup();
    await post(app, '/auth/register', account);
    await post(app, '/auth/login', { email: account.email, password: 'wrong-pass' });
    expect(await database.db.select().from(sessions)).toHaveLength(1);
  });
});

describe('sessions', () => {
  async function signUp(app: App) {
    const body = authResponseSchema.parse(
      await (await post(app, '/auth/register', account)).json(),
    );
    return { ...body, refreshToken: body.refreshToken ?? '' };
  }

  const refresh = (app: App, refreshToken: string) => post(app, '/auth/refresh', { refreshToken });

  it('rotates the refresh token and issues a working access token', async () => {
    const app = setup();
    const first = await signUp(app);
    const res = await refresh(app, first.refreshToken);
    expect(res.status).toBe(200);
    const second = authResponseSchema.parse(await res.json());
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.user).toEqual(first.user);
    expect((await me(app, `Bearer ${second.accessToken}`)).status).toBe(200);
    const rows = await database.db.select().from(sessions);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.familyId)).size).toBe(1);
  });

  it('revokes the whole family when a rotated token is reused', async () => {
    const app = setup();
    const first = await signUp(app);
    const second = authResponseSchema.parse(await (await refresh(app, first.refreshToken)).json());
    const reuse = await refresh(app, first.refreshToken);
    expect(reuse.status).toBe(401);
    expect((await errorOf(reuse)).code).toBe('token_invalid');
    // The thief's and the owner's tokens are both dead now.
    expect((await refresh(app, second.refreshToken ?? '')).status).toBe(401);
    const rows = await database.db.select().from(sessions);
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it('does not touch other logins when a family is revoked', async () => {
    const app = setup();
    const first = await signUp(app);
    const other = authResponseSchema.parse(await (await post(app, '/auth/login', account)).json());
    await refresh(app, first.refreshToken);
    await refresh(app, first.refreshToken);
    expect((await refresh(app, other.refreshToken ?? '')).status).toBe(200);
  });

  it('lets only one of two simultaneous refreshes win', async () => {
    const app = setup();
    const { refreshToken } = await signUp(app);
    const results = await Promise.all([refresh(app, refreshToken), refresh(app, refreshToken)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it('refuses expired and unknown tokens', async () => {
    const app = setup();
    const { refreshToken } = await signUp(app);
    await database.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await refresh(app, refreshToken)).status).toBe(401);
    expect((await refresh(app, 'unknown')).status).toBe(401);
    expect((await post(app, '/auth/refresh', {})).status).toBe(401);
  });

  it('logs out one session, idempotently', async () => {
    const app = setup();
    const { refreshToken } = await signUp(app);
    const other = authResponseSchema.parse(await (await post(app, '/auth/login', account)).json());
    expect((await post(app, '/auth/logout', { refreshToken })).status).toBe(204);
    expect((await post(app, '/auth/logout', { refreshToken })).status).toBe(204);
    expect((await refresh(app, refreshToken)).status).toBe(401);
    expect((await refresh(app, other.refreshToken ?? '')).status).toBe(200);
  });

  it('logs out everywhere with an access token', async () => {
    const app = setup();
    const first = await signUp(app);
    const other = authResponseSchema.parse(await (await post(app, '/auth/login', account)).json());
    const anonymous = await app.request(`${API_PREFIX}/auth/logout-all`, { method: 'POST' });
    expect(anonymous.status).toBe(401);
    const res = await app.request(`${API_PREFIX}/auth/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${first.accessToken}` },
    });
    expect(res.status).toBe(204);
    expect((await refresh(app, first.refreshToken)).status).toBe(401);
    expect((await refresh(app, other.refreshToken ?? '')).status).toBe(401);
  });

  it('reads and clears the cookie when configured', async () => {
    const app = setup({ REFRESH_TRANSPORT: 'cookie' });
    const registered = await post(app, '/auth/register', account);
    const cookie = (registered.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
    const res = await app.request(`${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect(authResponseSchema.parse(await res.json()).refreshToken).toBeUndefined();
    const rotated = (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
    expect(rotated).not.toBe(cookie);
    const out = await app.request(`${API_PREFIX}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: rotated },
    });
    expect(out.status).toBe(204);
    expect(out.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });
});

describe('e-mail flows', () => {
  const tokenIn = (text: string | undefined) => /token=([\w-]+)/.exec(text ?? '')?.[1] ?? '';
  const lastToken = () => tokenIn(mailer.sent.at(-1)?.text);

  /** The reset letter is prepared in the background, after the response. */
  async function requestReset(app: App) {
    const before = mailer.sent.length;
    await post(app, '/auth/forgot', { email: account.email });
    await vi.waitFor(() => expect(mailer.sent).toHaveLength(before + 1));
  }

  async function signUp(app: App) {
    return authResponseSchema.parse(await (await post(app, '/auth/register', account)).json());
  }

  it('sends a verification link to the site and verifies once', async () => {
    const app = setup({ APP_URL: 'https://x.test/Bulleak' });
    const session = await signUp(app);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('trader@mail.test');
    expect(mailer.sent[0]?.text).toContain('https://x.test/Bulleak/#/verify?token=');
    const token = lastToken();
    expect((await post(app, '/auth/verify-email', { token })).status).toBe(204);
    const res = await me(app, `Bearer ${session.accessToken}`);
    expect(await res.json()).toMatchObject({ user: { emailVerified: true } });
    const again = await post(app, '/auth/verify-email', { token });
    expect(again.status).toBe(400);
    expect((await errorOf(again)).code).toBe('token_invalid');
  });

  it('stores only a hash of the token', async () => {
    await signUp(setup());
    const [row] = await database.db.select().from(emailTokens);
    expect(row?.tokenHash).toBe(hashToken(lastToken()));
  });

  it('refuses an expired verification link', async () => {
    const app = setup();
    await signUp(app);
    await database.db.update(emailTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await post(app, '/auth/verify-email', { token: lastToken() })).status).toBe(400);
  });

  it('resends: the new link works, the old one does not; nothing for verified', async () => {
    const app = setup();
    const session = await signUp(app);
    const first = lastToken();
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    const resend = () =>
      app.request(`${API_PREFIX}/auth/resend-verification`, { method: 'POST', headers });
    expect((await resend()).status).toBe(204);
    expect(mailer.sent).toHaveLength(2);
    expect((await post(app, '/auth/verify-email', { token: first })).status).toBe(400);
    expect((await post(app, '/auth/verify-email', { token: lastToken() })).status).toBe(204);
    await resend();
    expect(mailer.sent).toHaveLength(2);
  });

  it('answers forgot identically and writes only to existing accounts', async () => {
    const app = setup();
    await signUp(app);
    mailer.sent.length = 0;
    const known = await post(app, '/auth/forgot', { email: account.email });
    const unknown = await post(app, '/auth/forgot', { email: 'ghost@mail.test' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    await vi.waitFor(() => expect(mailer.sent).toHaveLength(1));
    expect(mailer.sent.map((m) => m.to)).toEqual(['trader@mail.test']);
    expect(mailer.sent[0]?.text).toContain('#/reset?token=');
  });

  it('resets the password once and ends every session', async () => {
    const app = setup();
    const session = await signUp(app);
    await requestReset(app);
    const token = lastToken();
    const password = 'brand-New#Pass42';
    expect((await post(app, '/auth/reset', { token, password })).status).toBe(204);

    const oldLogin = await post(app, '/auth/login', account);
    expect(oldLogin.status).toBe(401);
    const newLogin = await post(app, '/auth/login', { email: account.email, password });
    expect(newLogin.status).toBe(200);
    expect((await post(app, '/auth/refresh', { refreshToken: session.refreshToken })).status).toBe(
      401,
    );
    expect(authResponseSchema.parse(await newLogin.json()).user.emailVerified).toBe(true);
    expect((await post(app, '/auth/reset', { token, password })).status).toBe(400);
  });

  it('keeps the link usable after a weak password', async () => {
    const app = setup();
    await signUp(app);
    await requestReset(app);
    const token = lastToken();
    const weak = await post(app, '/auth/reset', { token, password: 'qwerty2024' });
    expect((await errorOf(weak)).code).toBe('weak_password');
    expect((await post(app, '/auth/reset', { token, password: 'brand-New#Pass42' })).status).toBe(
      204,
    );
  });

  it('refuses an expired reset link and a verification token used for reset', async () => {
    const app = setup();
    await signUp(app);
    const verifyToken = lastToken();
    const password = 'brand-New#Pass42';
    expect((await post(app, '/auth/reset', { token: verifyToken, password })).status).toBe(400);
    await requestReset(app);
    await database.db.update(emailTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await post(app, '/auth/reset', { token: lastToken(), password })).status).toBe(400);
  });

  it('survives a mail outage', async () => {
    const config = loadConfig({ NODE_ENV: 'test', JWT_SECRET: SECRET });
    const logger = memoryLogger();
    const app = createApp({
      config,
      logger,
      db: database.db,
      mailer: { send: () => Promise.reject(new Error('down')) },
    });
    expect((await post(app, '/auth/register', account)).status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logger.lines.some((l) => l.message === 'mail failed')).toBe(true);
  });
});

describe('rate limits', () => {
  const postFrom = (app: App, path: string, body: unknown, ip: string) =>
    app.request(`${API_PREFIX}${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://bulleak.test',
        'X-Forwarded-For': `1.1.1.1, ${ip}`,
      },
    });

  const proxied = { TRUST_PROXY: 'true' };
  const wrong = { email: account.email, password: 'wrong-pass' };

  it('blocks the sixth login attempt with Retry-After and CORS headers', async () => {
    const app = setup(proxied);
    for (let i = 0; i < 5; i += 1) {
      expect((await postFrom(app, '/auth/login', wrong, '9.9.9.9')).status).toBe(401);
    }
    const blocked = await postFrom(app, '/auth/login', wrong, '9.9.9.9');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(blocked.headers.get('Access-Control-Allow-Origin')).toBe('https://bulleak.test');
    expect((await errorOf(blocked)).code).toBe('rate_limited');
  });

  it('counts login per e-mail and address, and opens after the window', async () => {
    let time = 1_000_000;
    const app = setup(
      proxied,
      memoryRateLimiter(() => time),
    );
    for (let i = 0; i < 6; i += 1) await postFrom(app, '/auth/login', wrong, '9.9.9.9');
    expect((await postFrom(app, '/auth/login', wrong, '8.8.8.8')).status).toBe(401);
    expect(
      (await postFrom(app, '/auth/login', { ...wrong, email: 'b@mail.test' }, '9.9.9.9')).status,
    ).toBe(401);
    expect((await postFrom(app, '/auth/login', wrong, '9.9.9.9')).status).toBe(429);
    time += 15 * 60 * 1000;
    expect((await postFrom(app, '/auth/login', wrong, '9.9.9.9')).status).toBe(401);
  });

  it('forgets failures after a successful login', async () => {
    const app = setup(proxied);
    await postFrom(app, '/auth/register', account, '7.7.7.7');
    for (let i = 0; i < 4; i += 1) await postFrom(app, '/auth/login', wrong, '9.9.9.9');
    expect((await postFrom(app, '/auth/login', account, '9.9.9.9')).status).toBe(200);
    for (let i = 0; i < 5; i += 1) {
      expect((await postFrom(app, '/auth/login', wrong, '9.9.9.9')).status).toBe(401);
    }
  });

  it('limits registration per address', async () => {
    const app = setup(proxied);
    const attempt = (i: number) =>
      postFrom(app, '/auth/register', { ...account, email: `u${i}@mail.test` }, '9.9.9.9');
    for (let i = 0; i < 5; i += 1) expect((await attempt(i)).status).toBe(201);
    expect((await attempt(5)).status).toBe(429);
  });

  it('limits forgot per e-mail, whether or not the account exists', async () => {
    const app = setup();
    const email = 'ghost@mail.test';
    for (let i = 0; i < 3; i += 1) {
      expect((await post(app, '/auth/forgot', { email })).status).toBe(200);
    }
    expect((await post(app, '/auth/forgot', { email })).status).toBe(429);
  });

  it('limits logins per address even with a new e-mail each time', async () => {
    const app = setup(proxied);
    const attempt = (i: number) =>
      postFrom(app, '/auth/login', { ...wrong, email: `u${i}@mail.test` }, '9.9.9.9');
    for (let i = 0; i < 30; i += 1) expect((await attempt(i)).status).toBe(401);
    expect((await attempt(30)).status).toBe(429);
  }, 30_000);

  it('limits forgot per address across e-mails', async () => {
    const app = setup(proxied);
    const attempt = (i: number) =>
      postFrom(app, '/auth/forgot', { email: `u${i}@mail.test` }, '9.9.9.9');
    for (let i = 0; i < 20; i += 1) expect((await attempt(i)).status).toBe(200);
    expect((await attempt(20)).status).toBe(429);
  });

  it('keeps the limiter table within its size, oldest keys first', () => {
    const limiter = memoryRateLimiter(() => 1000, 2);
    const rule = { limit: 1, windowMs: 60_000 };
    expect(limiter.hit('a', rule).allowed).toBe(true);
    expect(limiter.hit('b', rule).allowed).toBe(true);
    expect(limiter.hit('b', rule).allowed).toBe(false);
    expect(limiter.hit('c', rule).allowed).toBe(true);
    // «a» was evicted, «b» survived.
    expect(limiter.hit('b', rule).allowed).toBe(false);
    expect(limiter.hit('a', rule).allowed).toBe(true);
  });

  it('ignores X-Forwarded-For unless the proxy is trusted', async () => {
    const app = setup();
    for (let i = 0; i < 5; i += 1) await postFrom(app, '/auth/login', wrong, `9.9.9.${i}`);
    expect((await postFrom(app, '/auth/login', wrong, '9.9.9.200')).status).toBe(429);
  });
});

describe('security headers', () => {
  it('are set on API responses', async () => {
    const res = await setup().request(`${API_PREFIX}/health`);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  });
});

describe('GET /me', () => {
  async function registered(app: App) {
    return authResponseSchema.parse(await (await post(app, '/auth/register', account)).json());
  }

  it('returns the user for a valid token', async () => {
    const app = setup();
    const session = await registered(app);
    const res = await me(app, `Bearer ${session.accessToken}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: session.user });
  });

  it.each([undefined, 'Bearer', 'Bearer garbage', 'Basic abc'])('refuses %s', async (header) => {
    const res = await me(setup(), header);
    expect(res.status).toBe(401);
    expect((await errorOf(res)).code).toBe('unauthorized');
  });

  it('refuses expired and forged tokens', async () => {
    const app = setup();
    const { user } = await registered(app);
    const expired = await signAccessToken(user.id, SECRET, Date.now() - 16 * 60 * 1000);
    expect((await me(app, `Bearer ${expired}`)).status).toBe(401);
    const forged = await signAccessToken(user.id, 'x'.repeat(40));
    expect((await me(app, `Bearer ${forged}`)).status).toBe(401);
  });

  it('refuses a valid token of a deleted account', async () => {
    const app = setup();
    const session = await registered(app);
    await database.db.delete(users);
    expect((await me(app, `Bearer ${session.accessToken}`)).status).toBe(401);
  });
});

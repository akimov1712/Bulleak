import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema, authResponseSchema } from '@bulleak/shared';
import { API_PREFIX, createApp } from '../app';
import { loadConfig } from '../config';
import { openTestDatabase, type Database } from '../db';
import { emailTokens, sessions, users } from '../db/schema';
import { memoryLogger } from '../log';
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

function setup(env: Record<string, string> = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: 'https://bulleak.test',
    JWT_SECRET: SECRET,
    ...env,
  });
  return createApp({ config, logger: memoryLogger(), db: database.db });
}

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

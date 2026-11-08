import { eq, sql } from 'drizzle-orm';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { z } from 'zod';
import {
  emailTokenBodySchema,
  fieldErrors,
  forgotBodySchema,
  isWeakPassword,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resetBodySchema,
  type AuthResponse,
  type PublicUser,
} from '@bulleak/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { users, type User } from '../db/schema';
import type { Logger } from '../log';
import { resetPasswordMail, verifyEmailMail, type Mailer } from '../mail';
import {
  emailTaken,
  invalidCredentials,
  linkInvalid,
  rateLimited,
  tokenInvalid,
  unauthorized,
  validation,
  weakPassword,
} from '../errors';
import { consumeEmailToken, issueEmailToken, peekEmailToken } from './email-tokens';
import { hashPassword, verifyPassword } from './password';
import { RATE_LIMITS, type RateLimit, type RateLimiter } from './rate-limit';
import { createSession, revokeAllSessions, revokeSessionByToken, rotateSession } from './sessions';
import { ACCESS_TTL_SEC, REFRESH_TTL_MS, signAccessToken, verifyAccessToken } from './tokens';

export const REFRESH_COOKIE = 'bulleak_refresh';

type AuthedEnv = { Variables: { userId: string } };

export interface AuthDeps {
  config: Config;
  db: Db;
  logger: Logger;
  mailer: Mailer;
  limiter: RateLimiter;
  /** Path the refresh cookie is limited to. */
  apiPrefix: string;
}

async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  const raw: unknown = await c.req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) throw validation(fieldErrors(result.error));
  return result.data;
}

const publicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerified: user.emailVerifiedAt !== null,
  createdAt: user.createdAt.toISOString(),
});

/** Requires a valid `Authorization: Bearer` access token; sets `userId`. */
export function requireAuth(secret: string): MiddlewareHandler<AuthedEnv> {
  return async (c, next) => {
    const [scheme, token] = (c.req.header('Authorization') ?? '').split(' ');
    const userId = scheme === 'Bearer' && token ? await verifyAccessToken(token, secret) : null;
    if (!userId) throw unauthorized();
    c.set('userId', userId);
    await next();
  };
}

export function authRoutes({ config, db, logger, mailer, limiter, apiPrefix }: AuthDeps) {
  const app = new Hono<AuthedEnv>();

  function clientIp(c: Context) {
    if (config.trustProxy) {
      // The last entry is the one our proxy added; earlier ones are whatever the client sent.
      const forwarded = c.req.header('X-Forwarded-For')?.split(',').at(-1)?.trim();
      if (forwarded) return forwarded;
    }
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  function enforceLimit(key: string, rule: RateLimit) {
    const { allowed, retryAfterSec } = limiter.hit(key, rule);
    if (!allowed) throw rateLimited(retryAfterSec);
  }

  // Matches the lower(email) unique index; e-mails are already normalised by the schemas.
  const findUserByEmail = async (email: string) =>
    (
      await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1)
    )[0];

  const findUserById = async (id: string) =>
    (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];

  /** In the background: a mail outage must not fail the request or reveal who has an account. */
  function inBackground(work: Promise<void>) {
    work.catch((error: unknown) => {
      logger.error('mail failed', { reason: error instanceof Error ? error.message : 'unknown' });
    });
  }

  const verificationMail = (user: User, token: string) =>
    verifyEmailMail(user.email, `${config.appUrl}#/verify?token=${token}`);

  async function issueAndSendReset(user: User) {
    const token = await issueEmailToken(db, user.id, 'reset');
    await mailer.send(resetPasswordMail(user.email, `${config.appUrl}#/reset?token=${token}`));
  }

  /** Access token in the body; refresh token as a cookie or in the body, per deployment. */
  async function respondWithSession(c: Context, user: User, refreshToken: string) {
    const body: AuthResponse = {
      user: publicUser(user),
      accessToken: await signAccessToken(user.id, config.jwtSecret),
      expiresIn: ACCESS_TTL_SEC,
    };
    if (config.refreshTransport === 'cookie') {
      setCookie(c, REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'Lax',
        path: `${apiPrefix}/auth`,
        maxAge: REFRESH_TTL_MS / 1000,
      });
    } else {
      body.refreshToken = refreshToken;
    }
    c.header('Cache-Control', 'no-store');
    return body;
  }

  app.post('/auth/register', async (c) => {
    enforceLimit(`register:${clientIp(c)}`, RATE_LIMITS.register);
    const body = await parseBody(c, registerBodySchema);
    if (isWeakPassword(body.password, body.email, body.name)) throw weakPassword();
    const passwordHash = await hashPassword(body.password);
    // One transaction: a failed session must not leave an account the user cannot log in to yet.
    const created = await db.transaction(async (tx) => {
      // The unique index decides, so two simultaneous sign-ups cannot both pass.
      const [user] = await tx
        .insert(users)
        .values({ email: body.email, name: body.name, passwordHash })
        .onConflictDoNothing()
        .returning();
      if (!user) return null;
      const refreshToken = await createSession(tx, user.id, c.req.header('User-Agent'));
      const verifyToken = await issueEmailToken(tx, user.id, 'verify');
      return { user, refreshToken, verifyToken };
    });
    if (!created) throw emailTaken();
    inBackground(mailer.send(verificationMail(created.user, created.verifyToken)));
    return c.json(await respondWithSession(c, created.user, created.refreshToken), 201);
  });

  app.post('/auth/login', async (c) => {
    enforceLimit(`login-address:${clientIp(c)}`, RATE_LIMITS.loginPerAddress);
    const body = await parseBody(c, loginBodySchema);
    const limitKey = `login:${body.email}:${clientIp(c)}`;
    enforceLimit(limitKey, RATE_LIMITS.login);
    const user = await findUserByEmail(body.email);
    const valid = await verifyPassword(user?.passwordHash, body.password);
    if (!user || !valid) throw invalidCredentials();
    limiter.reset(limitKey);
    const refreshToken = await createSession(db, user.id, c.req.header('User-Agent'));
    return c.json(await respondWithSession(c, user, refreshToken));
  });

  /** The presented refresh token: from the cookie or the body, per deployment. */
  async function presentedRefreshToken(c: Context) {
    if (config.refreshTransport === 'cookie') return getCookie(c, REFRESH_COOKIE) ?? null;
    const raw: unknown = await c.req.json().catch(() => null);
    const parsed = refreshBodySchema.safeParse(raw);
    return parsed.success ? parsed.data.refreshToken : null;
  }

  const clearRefreshCookie = (c: Context) => {
    if (config.refreshTransport === 'cookie') {
      deleteCookie(c, REFRESH_COOKIE, { path: `${apiPrefix}/auth` });
    }
  };

  app.post('/auth/refresh', async (c) => {
    const token = await presentedRefreshToken(c);
    const rotated = token ? await rotateSession(db, token, c.req.header('User-Agent')) : null;
    if (!rotated) {
      clearRefreshCookie(c);
      throw tokenInvalid();
    }
    return c.json(await respondWithSession(c, rotated.user, rotated.refreshToken));
  });

  // Identified by the refresh token: the access token may already have expired.
  app.post('/auth/logout', async (c) => {
    const token = await presentedRefreshToken(c);
    if (token) await revokeSessionByToken(db, token);
    clearRefreshCookie(c);
    return c.body(null, 204);
  });

  app.post('/auth/logout-all', requireAuth(config.jwtSecret), async (c) => {
    await revokeAllSessions(db, c.get('userId'));
    clearRefreshCookie(c);
    return c.body(null, 204);
  });

  app.post('/auth/verify-email', async (c) => {
    const { token } = await parseBody(c, emailTokenBodySchema);
    const verified = await db.transaction(async (tx) => {
      const userId = await consumeEmailToken(tx, token, 'verify');
      if (!userId) return false;
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
      return true;
    });
    if (!verified) throw linkInvalid();
    return c.body(null, 204);
  });

  app.post('/auth/resend-verification', requireAuth(config.jwtSecret), async (c) => {
    const user = await findUserById(c.get('userId'));
    if (!user) throw unauthorized();
    enforceLimit(`resend:${user.id}`, RATE_LIMITS.resendVerification);
    if (user.emailVerifiedAt === null) {
      const token = await issueEmailToken(db, user.id, 'verify');
      inBackground(mailer.send(verificationMail(user, token)));
    }
    return c.body(null, 204);
  });

  // Same answer and same work in the request: the form must not reveal who has an account.
  app.post('/auth/forgot', async (c) => {
    enforceLimit(`forgot-address:${clientIp(c)}`, RATE_LIMITS.forgotPerAddress);
    const { email } = await parseBody(c, forgotBodySchema);
    enforceLimit(`forgot:${email}`, RATE_LIMITS.forgot);
    const user = await findUserByEmail(email);
    if (user) inBackground(issueAndSendReset(user));
    return c.json({ ok: true });
  });

  app.post('/auth/reset', async (c) => {
    const body = await parseBody(c, resetBodySchema);
    // Checked before spending the link, so a weak password can simply be retyped.
    const user = await peekEmailToken(db, body.token, 'reset');
    if (!user) throw linkInvalid();
    if (isWeakPassword(body.password, user.email, user.name)) throw weakPassword();
    const passwordHash = await hashPassword(body.password);
    const done = await db.transaction(async (tx) => {
      const userId = await consumeEmailToken(tx, body.token, 'reset');
      if (!userId) return false;
      await tx
        .update(users)
        // The link came to this mailbox, so the address is confirmed too.
        .set({ passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() })
        .where(eq(users.id, userId));
      await revokeAllSessions(tx, userId);
      return true;
    });
    if (!done) throw linkInvalid();
    return c.body(null, 204);
  });

  app.get('/me', requireAuth(config.jwtSecret), async (c) => {
    const user = await findUserById(c.get('userId'));
    // A valid token can outlive its account (deletion): treat it as signed out.
    if (!user) throw unauthorized();
    c.header('Cache-Control', 'no-store');
    return c.json({ user: publicUser(user) });
  });

  return app;
}

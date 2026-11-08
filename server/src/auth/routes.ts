import { eq } from 'drizzle-orm';
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
import { resetPasswordMail, verifyEmailMail, type Mail, type Mailer } from '../mail';
import {
  emailTaken,
  invalidCredentials,
  linkInvalid,
  tokenInvalid,
  unauthorized,
  validation,
  weakPassword,
} from '../errors';
import { consumeEmailToken, issueEmailToken, peekEmailToken } from './email-tokens';
import { hashPassword, verifyPassword } from './password';
import { createSession, revokeAllSessions, revokeSessionByToken, rotateSession } from './sessions';
import { ACCESS_TTL_SEC, REFRESH_TTL_MS, signAccessToken, verifyAccessToken } from './tokens';

export const REFRESH_COOKIE = 'bulleak_refresh';

type AuthedEnv = { Variables: { userId: string } };

export interface AuthDeps {
  config: Config;
  db: Db;
  logger: Logger;
  mailer: Mailer;
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

export function authRoutes({ config, db, logger, mailer, apiPrefix }: AuthDeps) {
  const app = new Hono<AuthedEnv>();

  /** In the background: a mail outage must not fail the request or reveal who has an account. */
  function sendInBackground(mail: Mail) {
    mailer.send(mail).catch((error: unknown) => {
      logger.error('mail failed', { reason: error instanceof Error ? error.message : 'unknown' });
    });
  }

  async function sendVerification(user: User) {
    const token = await issueEmailToken(db, user.id, 'verify');
    sendInBackground(verifyEmailMail(user.email, `${config.appUrl}#/verify?token=${token}`));
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
      return { user, refreshToken };
    });
    if (!created) throw emailTaken();
    await sendVerification(created.user);
    return c.json(await respondWithSession(c, created.user, created.refreshToken), 201);
  });

  app.post('/auth/login', async (c) => {
    const body = await parseBody(c, loginBodySchema);
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    const valid = await verifyPassword(user?.passwordHash, body.password);
    if (!user || !valid) throw invalidCredentials();
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
    const userId = await consumeEmailToken(db, token, 'verify');
    if (!userId) throw linkInvalid();
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    return c.body(null, 204);
  });

  app.post('/auth/resend-verification', requireAuth(config.jwtSecret), async (c) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, c.get('userId')))
      .limit(1);
    if (!user) throw unauthorized();
    if (user.emailVerifiedAt === null) await sendVerification(user);
    return c.body(null, 204);
  });

  // Always the same answer: the form must not reveal who has an account.
  app.post('/auth/forgot', async (c) => {
    const { email } = await parseBody(c, forgotBodySchema);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const token = await issueEmailToken(db, user.id, 'reset');
      sendInBackground(resetPasswordMail(user.email, `${config.appUrl}#/reset?token=${token}`));
    }
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, c.get('userId')))
      .limit(1);
    // A valid token can outlive its account (deletion): treat it as signed out.
    if (!user) throw unauthorized();
    c.header('Cache-Control', 'no-store');
    return c.json({ user: publicUser(user) });
  });

  return app;
}

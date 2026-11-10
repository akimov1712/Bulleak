import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { memoryRateLimiter, type RateLimiter } from './auth/rate-limit';
import { authRoutes } from './auth/routes';
import { syncRoutes } from './sync/routes';
import type { Config } from './config';
import type { Db } from './db';
import { HttpError, internal, notFound, payloadTooLarge } from './errors';
import type { Logger } from './log';
import type { Mailer } from './mail';

export interface AppDeps {
  config: Config;
  logger: Logger;
  db: Db;
  mailer: Mailer;
  /** In-memory by default (one server process). */
  limiter?: RateLimiter;
}

export const API_PREFIX = '/api/v1';
export const VERSION = '0.1.0';

/** The API as a Hono app (no network listener): main.ts serves it, tests call `app.request`. */
export function createApp({ config, logger, db, mailer, limiter = memoryRateLimiter() }: AppDeps) {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: config.appOrigin,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  // The API serves only JSON, so a page may not load or frame anything from it.
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    }),
  );

  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    logger.info('request', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
    });
  });

  app.use(
    '*',
    bodyLimit({
      maxSize: config.bodyLimit,
      onError: () => {
        throw payloadTooLarge();
      },
    }),
  );

  app.get(`${API_PREFIX}/health`, (c) => c.json({ status: 'ok', version: VERSION }));

  app.route(API_PREFIX, authRoutes({ config, db, logger, mailer, limiter, apiPrefix: API_PREFIX }));
  app.route(API_PREFIX, syncRoutes({ config, db }));

  app.notFound((c) => {
    const error = notFound();
    return c.json(error.toBody(), error.status);
  });

  app.onError((error, c) => {
    const known = error instanceof HttpError ? error : null;
    if (!known) {
      // Drizzle wraps database errors: the real reason is in `cause`.
      const cause = error.cause instanceof Error ? error.cause.message : undefined;
      logger.error('unhandled error', { name: error.name, reason: error.message, cause });
    }
    const http = known ?? internal();
    return c.json(http.toBody(), http.status, http.headers);
  });

  return app;
}

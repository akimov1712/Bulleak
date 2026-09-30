import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { Config } from './config';
import { HttpError, internal, notFound, payloadTooLarge } from './errors';
import type { Logger } from './log';

export interface AppDeps {
  config: Config;
  logger: Logger;
}

export const API_PREFIX = '/api/v1';
export const VERSION = '0.1.0';

/** The API as a Hono app (no network listener): main.ts serves it, tests call `app.request`. */
export function createApp({ config, logger }: AppDeps) {
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

  app.notFound((c) => {
    const error = notFound();
    return c.json(error.toBody(), error.status);
  });

  app.onError((error, c) => {
    const known = error instanceof HttpError ? error : null;
    if (!known) logger.error('unhandled error', { name: error.name, message: error.message });
    const http = known ?? internal();
    return c.json(http.toBody(), http.status);
  });

  return app;
}

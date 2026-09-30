import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { DatabaseTarget } from './db';

/** Used only outside production so local runs and tests work without a .env file. */
const DEV_JWT_SECRET = 'dev-only-secret-not-for-production-000000';

/** Local database without installing Postgres: PGlite files in server/.data (git-ignored). */
const DEV_PGLITE_DIR = fileURLToPath(new URL('../.data/pglite', import.meta.url));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    APP_ORIGIN: z.url().optional(),
    JWT_SECRET: z.string().optional(),
    /** postgres://… ; without it (outside production) a local PGlite database is used. */
    DATABASE_URL: z.string().optional(),
    /** Largest accepted request body, bytes. */
    BODY_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),
  })
  .transform((env, ctx) => {
    const production = env.NODE_ENV === 'production';
    const secret = env.JWT_SECRET || (production ? '' : DEV_JWT_SECRET);
    if (secret.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'нужно не меньше 32 символов',
      });
    }
    if (production && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'обязателен в production' });
    }
    if (production && !env.APP_ORIGIN) {
      ctx.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'обязателен в production' });
    }
    return {
      env: env.NODE_ENV,
      port: env.PORT,
      appOrigin: env.APP_ORIGIN ?? 'http://localhost:5173',
      jwtSecret: secret,
      bodyLimit: env.BODY_LIMIT,
      database: databaseTarget(env.NODE_ENV, env.DATABASE_URL),
    };
  });

function databaseTarget(env: string, url: string | undefined): DatabaseTarget {
  if (url) return { kind: 'postgres', url };
  return env === 'test' ? { kind: 'pglite' } : { kind: 'pglite', dataDir: DEV_PGLITE_DIR };
}

export type Config = z.output<typeof envSchema>;

/** Reads the environment; a misconfiguration stops the server with every problem listed. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Неверная конфигурация сервера:\n- ${problems.join('\n- ')}`);
  }
  return result.data;
}

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
    /** Listen address: loopback by default (nginx is the public entry point in production). */
    HOST: z.string().min(1).default('127.0.0.1'),
    APP_ORIGIN: z.url().optional(),
    JWT_SECRET: z.string().optional(),
    /** postgres://… ; without it (outside production) a local PGlite database is used. */
    DATABASE_URL: z.string().optional(),
    /** cookie — needs the site and the API on one domain; body — stored by the client. */
    REFRESH_TRANSPORT: z.enum(['cookie', 'body']).default('body'),
    /** Public address of the site, for links in letters; the origin by default. */
    APP_URL: z.url().optional(),
    /** Without a key (outside production) letters are only written to the log. */
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().optional(),
    /** Tests only: letters are appended to this file as JSON lines (e2e reads the links). */
    MAIL_OUTBOX: z.string().optional(),
    /** Behind a reverse proxy: take the client address from X-Forwarded-For. */
    TRUST_PROXY: z.stringbool().default(false),
    /** DeepSeek key; without it the AI gateway is off. */
    DEEPSEEK_API_KEY: z.string().optional(),
    /** AI requests per learner per UTC day. */
    AI_DAILY_REQUESTS: z.coerce.number().int().min(0).default(30),
    /** Input + output tokens for the whole site per calendar month. */
    AI_MONTHLY_TOKENS: z.coerce.number().int().min(0).default(5_000_000),
    AI_MODEL_CHAT: z.string().min(1).default('deepseek-flash'),
    AI_MODEL_REVIEW: z.string().min(1).default('deepseek-v4-pro'),
    /** Largest accepted request body, bytes. */
    BODY_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      // A synced progress document may be up to 1 MB (shared/src/sync.ts).
      .default(2 * 1024 * 1024),
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
    if (production && env.MAIL_OUTBOX) {
      ctx.addIssue({ code: 'custom', path: ['MAIL_OUTBOX'], message: 'запрещён в production' });
    }
    if (production && (!env.RESEND_API_KEY || !env.MAIL_FROM)) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'вместе с MAIL_FROM обязателен в production',
      });
    }
    const appOrigin = env.APP_ORIGIN ?? 'http://localhost:5173';
    return {
      env: env.NODE_ENV,
      port: env.PORT,
      host: env.HOST,
      appOrigin,
      appUrl: `${(env.APP_URL ?? appOrigin).replace(/\/+$/, '')}/`,
      mail:
        env.RESEND_API_KEY && env.MAIL_FROM
          ? { apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM }
          : null,
      mailOutbox: env.MAIL_OUTBOX ?? null,
      jwtSecret: secret,
      refreshTransport: env.REFRESH_TRANSPORT,
      trustProxy: env.TRUST_PROXY,
      bodyLimit: env.BODY_LIMIT,
      ai: {
        apiKey: env.DEEPSEEK_API_KEY ?? null,
        limits: { dailyRequests: env.AI_DAILY_REQUESTS, monthlyTokens: env.AI_MONTHLY_TOKENS },
        models: { chat: env.AI_MODEL_CHAT, review: env.AI_MODEL_REVIEW },
      },
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
  // "NAME=" in a .env file means "not set", as in .env.example.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(present);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Неверная конфигурация сервера:\n- ${problems.join('\n- ')}`);
  }
  return result.data;
}

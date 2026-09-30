import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@bulleak/shared';
import { API_PREFIX, createApp } from './app';
import { loadConfig } from './config';
import { memoryLogger, redact } from './log';

function setup(env: Record<string, string> = {}) {
  const logger = memoryLogger();
  const config = loadConfig({ NODE_ENV: 'test', APP_ORIGIN: 'https://bulleak.test', ...env });
  return { app: createApp({ config, logger }), logger };
}

describe('API skeleton', () => {
  it('answers health', async () => {
    const { app } = setup();
    const res = await app.request(`${API_PREFIX}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', version: '0.1.0' });
  });

  it('returns unknown routes in the API error format', async () => {
    const { app } = setup();
    const res = await app.request(`${API_PREFIX}/nope`);
    expect(res.status).toBe(404);
    const body = apiErrorSchema.parse(await res.json());
    expect(body.error.code).toBe('not_found');
  });

  it('rejects oversized bodies with 413', async () => {
    const { app } = setup({ BODY_LIMIT: '100' });
    const res = await app.request(`${API_PREFIX}/health`, {
      method: 'POST',
      body: 'x'.repeat(500),
      headers: { 'Content-Type': 'text/plain', 'Content-Length': '500' },
    });
    expect(res.status).toBe(413);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('payload_too_large');
  });

  it('allows CORS only for the app origin, with credentials', async () => {
    const { app } = setup();
    const ok = await app.request(`${API_PREFIX}/health`, {
      headers: { Origin: 'https://bulleak.test' },
    });
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://bulleak.test');
    expect(ok.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    const other = await app.request(`${API_PREFIX}/health`, {
      headers: { Origin: 'https://evil.test' },
    });
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('logs requests without secrets', async () => {
    const { app, logger } = setup();
    await app.request(`${API_PREFIX}/health`);
    expect(logger.lines.at(-1)).toMatchObject({ message: 'request', status: 200 });
    expect(
      redact({ password: 'p', nested: { refreshToken: 't', ok: 1 }, Authorization: 'Bearer x' }),
    ).toEqual({
      password: '[redacted]',
      nested: { refreshToken: '[redacted]', ok: 1 },
      Authorization: '[redacted]',
    });
  });
});

describe('loadConfig', () => {
  it('uses safe defaults outside production', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      env: 'development',
      port: 8787,
      appOrigin: 'http://localhost:5173',
    });
    expect(config.jwtSecret.length).toBeGreaterThanOrEqual(32);
  });

  it('refuses to start production without a strong secret and origin', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET[\s\S]*APP_ORIGIN/);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://x.test', JWT_SECRET: 'short' }),
    ).toThrow(/JWT_SECRET: нужно не меньше 32 символов/);
    expect(
      loadConfig({
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://x.test',
        JWT_SECRET: 'k'.repeat(48),
        PORT: '9000',
      }).port,
    ).toBe(9000);
  });
});

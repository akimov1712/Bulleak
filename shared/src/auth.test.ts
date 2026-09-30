import { describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  authResponseSchema,
  fieldErrors,
  loginBodySchema,
  registerBodySchema,
} from './index';

describe('registerBodySchema', () => {
  it('normalises e-mail and name', () => {
    const body = registerBodySchema.parse({
      email: '  Anna@Example.COM ',
      password: 'correct horse',
      name: '  Анна ',
    });
    expect(body).toEqual({ email: 'anna@example.com', password: 'correct horse', name: 'Анна' });
  });

  it('explains every invalid field in Russian', () => {
    const result = registerBodySchema.safeParse({ email: 'anna@', password: 'short', name: ' ' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      email: 'Проверь e-mail — похоже, в нём ошибка',
      password: 'Пароль — минимум 8 символов',
      name: 'Укажи имя',
    });
  });

  it('rejects missing fields with readable messages', () => {
    const result = registerBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error).email).toBe('Укажи e-mail');
  });

  it('limits password and name length', () => {
    const tooLong = registerBodySchema.safeParse({
      email: 'a@b.co',
      password: 'x'.repeat(129),
      name: 'Я'.repeat(61),
    });
    expect(tooLong.success).toBe(false);
  });
});

describe('loginBodySchema', () => {
  it('accepts any non-empty password (old passwords stay valid)', () => {
    expect(loginBodySchema.parse({ email: 'A@b.co', password: 'x' })).toEqual({
      email: 'a@b.co',
      password: 'x',
    });
    expect(loginBodySchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('response schemas', () => {
  it('parse an auth response and an API error', () => {
    expect(
      authResponseSchema.parse({
        user: {
          id: '5f0d6c6e-8f4a-4a52-9d3b-1f2a3b4c5d6e',
          email: 'a@b.co',
          name: 'Анна',
          emailVerified: false,
          createdAt: '2026-09-30T10:00:00.000Z',
        },
        accessToken: 'jwt',
        expiresIn: 900,
      }).expiresIn,
    ).toBe(900);
    expect(apiErrorSchema.safeParse({ error: { code: 'nope', message: 'x' } }).success).toBe(false);
    expect(
      apiErrorSchema.parse({ error: { code: 'email_taken', message: 'Такой e-mail уже есть' } })
        .error.code,
    ).toBe('email_taken');
  });
});

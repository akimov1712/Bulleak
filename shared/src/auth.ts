import { z } from 'zod';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 60;

/** E-mail, normalised: trimmed and lower-cased (accounts are case-insensitive). */
export const emailSchema = z
  .string({ error: 'Укажи e-mail' })
  .trim()
  .toLowerCase()
  .max(254, 'Слишком длинный e-mail')
  .pipe(z.email({ error: 'Проверь e-mail — похоже, в нём ошибка' }));

export const passwordSchema = z
  .string({ error: 'Укажи пароль' })
  .min(PASSWORD_MIN, `Пароль — минимум ${PASSWORD_MIN} символов`)
  .max(PASSWORD_MAX, `Пароль — не больше ${PASSWORD_MAX} символов`);

export const nameSchema = z
  .string({ error: 'Укажи имя' })
  .trim()
  .min(1, 'Укажи имя')
  .max(NAME_MAX, `Имя — не больше ${NAME_MAX} символов`);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

/** Login does not re-check password rules: old passwords stay valid if the rules change. */
export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Укажи пароль' }).min(1, 'Укажи пароль').max(PASSWORD_MAX),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

/** What the API tells the client about the signed-in user. */
export const publicUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authResponseSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
  /** Access token lifetime, seconds. */
  expiresIn: z.number().int().positive(),
  /** Only when the refresh token is not delivered as a cookie (no shared domain). */
  refreshToken: z.string().optional(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

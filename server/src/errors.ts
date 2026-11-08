import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiError, ErrorCode } from '@bulleak/shared';

/** An expected failure: becomes `{ error: { code, message, fields? } }` with this status. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toBody(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

export const notFound = () => new HttpError(404, 'not_found', 'Такого адреса в API нет');
export const internal = () =>
  new HttpError(500, 'internal', 'Что-то пошло не так на сервере. Попробуй ещё раз позже.');
export const validation = (fields: Record<string, string>) =>
  new HttpError(400, 'validation', 'Проверь введённые данные', fields);
export const weakPassword = () =>
  new HttpError(400, 'weak_password', 'Этот пароль слишком легко подобрать', {
    password: 'Этот пароль слишком легко подобрать. Придумай другой.',
  });
export const emailTaken = () =>
  new HttpError(409, 'email_taken', 'Аккаунт с таким e-mail уже есть', {
    email: 'Аккаунт с таким e-mail уже есть',
  });
export const invalidCredentials = () =>
  new HttpError(401, 'invalid_credentials', 'Неверный e-mail или пароль');
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Нужно войти в аккаунт');
export const tokenInvalid = () =>
  new HttpError(401, 'token_invalid', 'Сессия истекла. Войди в аккаунт ещё раз.');
export const payloadTooLarge = () =>
  new HttpError(413, 'payload_too_large', 'Слишком большой запрос');

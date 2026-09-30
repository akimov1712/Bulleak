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
export const payloadTooLarge = () =>
  new HttpError(413, 'payload_too_large', 'Слишком большой запрос');

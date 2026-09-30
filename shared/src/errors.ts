import { z } from 'zod';

/** Machine-readable error codes of the API; the UI branches on them, not on messages. */
export const ERROR_CODES = [
  'validation',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'payload_too_large',
  'rate_limited',
  'internal',
  'email_taken',
  'invalid_credentials',
  'weak_password',
  'token_invalid',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Every API error: `{ error: { code, message, fields? } }`; `message` is Russian, for the UI. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    /** Per-field messages for form validation errors. */
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/** Field → first message, from a failed zod parse (for `fields` in validation errors). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}
